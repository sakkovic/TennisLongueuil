-- =============================================================================
-- SaKKa.Tennis: private lessons
--
-- The coach can create a lesson for chosen players (one or several). A private
-- lesson is invisible to everyone else: it does not appear in the lessons
-- list, in the public flyer, or through a shared link, and its registrations
-- cannot be read by other members. Invited players are registered right away
-- and can cancel like for any other lesson.
--
-- Enforced by:
--   * the lessons RLS policy (who can read a private lesson),
--   * the lesson_registrations policy (who can read its registrations),
--   * a trigger on lesson_registrations (only invited players can hold a
--     spot, whatever path the write takes: join_lesson, join_waitlist or
--     automatic promotion from the waitlist),
--   * upcoming_sessions(), which never returns private lessons.
-- =============================================================================

alter table public.lessons add column is_private boolean not null default false;

comment on column public.lessons.is_private is
  'Private lesson: only the players in lesson_invites (and admins) can see or join it.';

grant insert (is_private) on public.lessons to authenticated;
grant update (is_private) on public.lessons to authenticated;

-- -----------------------------------------------------------------------------
-- lesson_invites: who a private lesson is for
-- -----------------------------------------------------------------------------

create table public.lesson_invites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  invited_at timestamptz not null default now(),
  invited_by uuid references public.profiles (id) on delete set null,
  primary key (lesson_id, player_id)
);

comment on table public.lesson_invites is
  'Players a private lesson is for. Written only by admin_set_lesson_invites().';

create index lesson_invites_player_id_idx on public.lesson_invites (player_id);
create index lesson_invites_invited_by_idx on public.lesson_invites (invited_by);

alter table public.lesson_invites enable row level security;

revoke all on public.lesson_invites from anon, authenticated;
grant select on public.lesson_invites to authenticated;

-- Players see the invitations addressed to them; the coach sees all of them.
-- No insert/update/delete: the coach goes through admin_set_lesson_invites().
create policy "Invited players and admins can read invites"
  on public.lesson_invites for select
  to authenticated
  using ((select private.is_admin()) or player_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Visibility helpers
-- -----------------------------------------------------------------------------

create function private.is_invited(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_invites i
     where i.lesson_id = p_lesson_id and i.player_id = (select auth.uid())
  );
$$;

/** True when the caller may see the lesson at all (public, or invited). */
create function private.can_see_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select not l.is_private or private.is_invited(l.id) from public.lessons l where l.id = p_lesson_id),
    false
  );
$$;

revoke execute on function private.is_invited(uuid) from public;
revoke execute on function private.can_see_lesson(uuid) from public;
grant execute on function private.is_invited(uuid) to authenticated;
grant execute on function private.can_see_lesson(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: private lessons and their registrations are only for invited players
-- -----------------------------------------------------------------------------

drop policy "Active members can read lessons" on public.lessons;

create policy "Active members can read lessons"
  on public.lessons for select
  to authenticated
  using (
    (select private.is_active_member())
    and (not is_private or (select private.is_admin()) or private.is_invited(id))
  );

drop policy "Members can read relevant registrations" on public.lesson_registrations;

create policy "Members can read relevant registrations"
  on public.lesson_registrations for select
  to authenticated
  using (
    (select private.is_admin())
    or player_id = (select auth.uid())
    or (
      status in ('joined', 'waitlisted')
      and (select private.is_active_member())
      and private.can_see_lesson(lesson_id)
    )
  );

-- -----------------------------------------------------------------------------
-- Only invited players can hold a spot in a private lesson
-- -----------------------------------------------------------------------------

create function private.enforce_private_lesson_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('joined', 'waitlisted')
     and exists (select 1 from public.lessons l where l.id = new.lesson_id and l.is_private)
     and not exists (
       select 1 from public.lesson_invites i
        where i.lesson_id = new.lesson_id and i.player_id = new.player_id
     ) then
    raise exception using errcode = 'P0001', message = 'NOT_INVITED';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_private_lesson_invite() from public;

create trigger lesson_registrations_private_guard
  before insert or update of status, lesson_id, player_id on public.lesson_registrations
  for each row execute function private.enforce_private_lesson_invite();

-- -----------------------------------------------------------------------------
-- The public flyer never shows a private lesson
-- -----------------------------------------------------------------------------

create or replace function public.upcoming_sessions(p_limit integer default 3)
returns table (
  id uuid,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  capacity integer,
  registered_count integer,
  registration_closes_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.start_time,
    l.end_time,
    l.location,
    l.capacity,
    l.registered_count,
    coalesce(l.registration_deadline, l.start_time - private.registration_lead_time())
  from public.lessons l
  where l.status = 'scheduled'
    and l.start_time > now()
    and not l.is_private
  order by l.start_time
  limit least(greatest(coalesce(p_limit, 3), 1), 6);
$$;

-- -----------------------------------------------------------------------------
-- admin_set_lesson_invites: choose the players of a private lesson
--
-- Called after creating or editing a lesson, for one lesson or for a whole
-- weekly series. It replaces the guest list of each lesson:
--   * newly invited players are registered right away (their spot is kept),
--   * players taken off the list have their registration cancelled,
--   * a player who had cancelled themselves stays cancelled.
-- For a lesson that is not private the list must be empty: the invitations
-- are removed and everyone keeps their spot.
-- -----------------------------------------------------------------------------

create function public.admin_set_lesson_invites(p_lesson_ids uuid[], p_player_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_players uuid[] := coalesce(p_player_ids, '{}'::uuid[]);
  v_lesson public.lessons%rowtype;
  v_lesson_id uuid;
  v_invited integer := 0;
  v_registered integer := 0;
  v_removed integer := 0;
  v_count integer;
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  if p_lesson_ids is null
     or cardinality(p_lesson_ids) = 0
     or cardinality(p_lesson_ids) > 60
     or array_position(p_lesson_ids, null) is not null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  -- Every guest must be an active player of the club.
  if exists (
    select 1 from unnest(v_players) as p(id)
     where not exists (
       select 1 from public.profiles pr
        where pr.id = p.id and pr.active and pr.role = 'player'
     )
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAYER';
  end if;

  foreach v_lesson_id in array p_lesson_ids loop
    -- Same lock as join_lesson: counts stay consistent with concurrent joins.
    select * into v_lesson from public.lessons l where l.id = v_lesson_id for no key update;
    if not found then
      raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
    end if;

    if not v_lesson.is_private then
      -- No longer private: drop the invitations, everyone keeps their spot.
      if cardinality(v_players) > 0 then
        raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
      end if;
      delete from public.lesson_invites i where i.lesson_id = v_lesson_id;
      continue;
    end if;

    if cardinality(v_players) = 0 then
      raise exception using errcode = 'P0001', message = 'NO_PLAYERS_INVITED';
    end if;
    if cardinality(v_players) > v_lesson.capacity then
      raise exception using errcode = 'P0001', message = 'TOO_MANY_PLAYERS';
    end if;

    -- Players taken off the list lose their spot.
    with removed as (
      delete from public.lesson_invites i
       where i.lesson_id = v_lesson_id
         and not (i.player_id = any (v_players))
      returning i.player_id
    ),
    cancelled as (
      update public.lesson_registrations r
         set status = 'cancelled',
             cancelled_at = now(),
             cancellation_reason = 'Removed from this private lesson by the coach'
       where r.lesson_id = v_lesson_id
         and r.player_id in (select player_id from removed)
         and r.status in ('joined', 'waitlisted')
      returning r.id
    )
    select count(*) into v_count from cancelled;
    v_removed := v_removed + v_count;

    insert into public.lesson_invites (lesson_id, player_id, invited_by)
    select v_lesson_id, p.id, (select auth.uid()) from unnest(v_players) as p(id)
    on conflict (lesson_id, player_id) do nothing;
    get diagnostics v_count = row_count;
    v_invited := v_invited + v_count;

    -- New guests get their spot. A player who cancelled themselves keeps
    -- their cancelled registration and can join again from the app.
    insert into public.lesson_registrations (lesson_id, player_id, status)
    select v_lesson_id, p.id, 'joined' from unnest(v_players) as p(id)
    on conflict on constraint lesson_registrations_lesson_player_key do nothing;
    get diagnostics v_count = row_count;
    v_registered := v_registered + v_count;
  end loop;

  return jsonb_build_object(
    'success', true,
    'lessons', cardinality(p_lesson_ids),
    'invited', v_invited,
    'registered', v_registered,
    'removed', v_removed
  );
end;
$$;

revoke execute on function public.admin_set_lesson_invites(uuid[], uuid[]) from public, anon;
grant execute on function public.admin_set_lesson_invites(uuid[], uuid[]) to authenticated;
