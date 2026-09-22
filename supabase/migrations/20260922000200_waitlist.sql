-- =============================================================================
-- Tennis Longueuil: waitlist with automatic promotion
--
-- When a lesson is full, a player can join its waitlist (join_waitlist). When
-- a spot opens, the first player in line is moved in automatically, inside
-- the same transaction and under the same lesson lock as join_lesson, so the
-- capacity rule still holds under concurrency.
--
-- A spot opens when:
--   * a player cancels (cancel_registration),
--   * the coach deactivates a registered player's account,
--   * the coach adds courts, reopens registration, or moves the deadline.
-- Promotion only happens while registration is open (before the deadline):
-- after that, nobody is moved in at the last minute without knowing it.
--
-- Privacy: other active members can see who is on the waitlist and in which
-- order (like the list of registered players). Cancellation reasons remain
-- private: a waitlisted row can never carry one.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columns
-- -----------------------------------------------------------------------------

-- Trigger-maintained, like registered_count. Updating it also emits a
-- Realtime event on lessons, so waitlists refresh live.
alter table public.lessons
  add column waitlist_count integer not null default 0,
  add constraint lessons_waitlist_count_range check (waitlist_count >= 0);

-- Set when a player was moved in from the waitlist (not when joining
-- directly), so the app can tell them "a spot opened, you're in".
alter table public.lesson_registrations
  add column promoted_at timestamptz;

-- The waitlist is read in joined_at order (the moment the player queued).
create index lesson_registrations_waitlist_idx
  on public.lesson_registrations (lesson_id, joined_at)
  where status = 'waitlisted';

-- -----------------------------------------------------------------------------
-- Counts: registered_count and waitlist_count in one pass
-- -----------------------------------------------------------------------------

create or replace function private.refresh_registered_count(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.lessons l where l.id = p_lesson_id for no key update;

  update public.lessons l
     set registered_count = c.joined,
         waitlist_count = c.waiting
    from (
      select count(*) filter (where r.status = 'joined') as joined,
             count(*) filter (where r.status = 'waitlisted') as waiting
        from public.lesson_registrations r
       where r.lesson_id = p_lesson_id
    ) c
   where l.id = p_lesson_id
     and (l.registered_count, l.waitlist_count) is distinct from (c.joined::int, c.waiting::int);
end;
$$;

-- Existing rows: bring waitlist_count in line (all zero today).
update public.lessons l
   set waitlist_count = (
     select count(*) from public.lesson_registrations r
      where r.lesson_id = l.id and r.status = 'waitlisted'
   )
 where l.waitlist_count <> (
     select count(*) from public.lesson_registrations r
      where r.lesson_id = l.id and r.status = 'waitlisted'
   );

-- -----------------------------------------------------------------------------
-- RLS: members also see who is waiting
-- -----------------------------------------------------------------------------

drop policy "Members can read relevant registrations" on public.lesson_registrations;

create policy "Members can read relevant registrations"
  on public.lesson_registrations for select
  to authenticated
  using (
    (select private.is_admin())
    or player_id = (select auth.uid())
    or (status in ('joined', 'waitlisted') and (select private.is_active_member()))
  );

-- -----------------------------------------------------------------------------
-- Promotion
-- -----------------------------------------------------------------------------

-- Moves waitlisted players in, first come first served, while there are free
-- spots and registration is still open. Inactive accounts are skipped.
-- Returns how many players were moved in.
create function private.promote_waitlist(p_lesson_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons%rowtype;
  v_free integer;
  v_promoted integer;
begin
  select * into v_lesson from public.lessons l where l.id = p_lesson_id for no key update;

  if not found
     or v_lesson.status <> 'scheduled'
     or not v_lesson.registration_open
     or now() >= v_lesson.start_time
     or now() > coalesce(
       v_lesson.registration_deadline,
       v_lesson.start_time - private.registration_lead_time()
     ) then
    return 0;
  end if;

  select v_lesson.capacity - count(*) into v_free
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.status = 'joined';

  if v_free <= 0 then
    return 0;
  end if;

  with next_in_line as (
    select r.id
      from public.lesson_registrations r
      join public.profiles p on p.id = r.player_id
     where r.lesson_id = p_lesson_id
       and r.status = 'waitlisted'
       and p.active
     order by r.joined_at, r.id
     limit v_free
  ),
  promoted as (
    update public.lesson_registrations r
       set status = 'joined',
           joined_at = now(),
           promoted_at = now()
      from next_in_line n
     where r.id = n.id
    returning r.id
  )
  select count(*) into v_promoted from promoted;

  return v_promoted;
end;
$$;

-- A registered player left (cancelled, or their account was deactivated).
create function private.promote_after_spot_freed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.promote_waitlist(new.lesson_id);
  return null;
end;
$$;

create trigger lesson_registrations_promote_waitlist
  after update of status on public.lesson_registrations
  for each row
  when (old.status = 'joined' and new.status is distinct from old.status)
  execute function private.promote_after_spot_freed();

-- The coach added courts, reopened registration or moved the deadline.
-- Only fires for those columns: registered_count / waitlist_count updates made
-- by refresh_registered_count do not trigger it.
create function private.promote_after_lesson_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.promote_waitlist(new.id);
  return null;
end;
$$;

create trigger lessons_promote_waitlist
  after update of court_count, registration_open, registration_deadline, start_time, status
  on public.lessons
  for each row
  when (new.status = 'scheduled')
  execute function private.promote_after_lesson_change();

revoke execute on function private.promote_waitlist(uuid) from public;
revoke execute on function private.promote_after_spot_freed() from public;
revoke execute on function private.promote_after_lesson_change() from public;

-- -----------------------------------------------------------------------------
-- join_lesson: re-joining clears any old promotion marker.
-- Otherwise identical to 20260921000600_lesson_rules.sql.
-- -----------------------------------------------------------------------------

create or replace function public.join_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_active boolean;
  v_lesson public.lessons%rowtype;
  v_existing_status public.registration_status;
  v_joined_count integer;
  v_registration_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select p.active into v_active from public.profiles p where p.id = v_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
  if not v_active then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_INACTIVE';
  end if;

  select * into v_lesson from public.lessons l where l.id = p_lesson_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'LESSON_CANCELLED';
  end if;
  if v_lesson.status <> 'scheduled' or v_lesson.start_time <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_STARTED';
  end if;
  if not v_lesson.registration_open then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if now() > coalesce(
    v_lesson.registration_deadline,
    v_lesson.start_time - private.registration_lead_time()
  ) then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_DEADLINE_PASSED';
  end if;

  select r.status into v_existing_status
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.player_id = v_user_id;
  if v_existing_status = 'joined' then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_joined_count
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.status = 'joined';
  if v_joined_count >= v_lesson.capacity then
    raise exception using errcode = 'P0001', message = 'LESSON_FULL';
  end if;

  -- Create the registration, or reactivate a cancelled / waitlisted one.
  insert into public.lesson_registrations as r (lesson_id, player_id, status, joined_at)
  values (p_lesson_id, v_user_id, 'joined', now())
  on conflict on constraint lesson_registrations_lesson_player_key do update
    set status = 'joined',
        joined_at = now(),
        cancelled_at = null,
        cancellation_reason = null,
        promoted_at = null
  returning r.id into v_registration_id;

  return jsonb_build_object(
    'success', true,
    'status', 'joined',
    'registration_id', v_registration_id,
    'lesson_id', p_lesson_id,
    'registered_count', v_joined_count + 1,
    'capacity', v_lesson.capacity
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- join_waitlist: queue for a full lesson. If a spot is free after all (someone
-- just left), the player simply joins; the result's status says which.
-- Same checks and lock as join_lesson.
-- -----------------------------------------------------------------------------

create function public.join_waitlist(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_active boolean;
  v_lesson public.lessons%rowtype;
  v_existing_status public.registration_status;
  v_joined_count integer;
  v_status public.registration_status;
  v_registration_id uuid;
  v_position integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select p.active into v_active from public.profiles p where p.id = v_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
  if not v_active then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_INACTIVE';
  end if;

  select * into v_lesson from public.lessons l where l.id = p_lesson_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'LESSON_CANCELLED';
  end if;
  if v_lesson.status <> 'scheduled' or v_lesson.start_time <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_STARTED';
  end if;
  if not v_lesson.registration_open then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if now() > coalesce(
    v_lesson.registration_deadline,
    v_lesson.start_time - private.registration_lead_time()
  ) then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_DEADLINE_PASSED';
  end if;

  select r.status into v_existing_status
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.player_id = v_user_id;
  if v_existing_status = 'joined' then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
  end if;
  if v_existing_status = 'waitlisted' then
    raise exception using errcode = 'P0001', message = 'ALREADY_WAITLISTED';
  end if;

  select count(*) into v_joined_count
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.status = 'joined';

  v_status := case when v_joined_count < v_lesson.capacity then 'joined' else 'waitlisted' end;

  insert into public.lesson_registrations as r (lesson_id, player_id, status, joined_at)
  values (p_lesson_id, v_user_id, v_status, now())
  on conflict on constraint lesson_registrations_lesson_player_key do update
    set status = v_status,
        joined_at = now(),
        cancelled_at = null,
        cancellation_reason = null,
        promoted_at = null
  returning r.id into v_registration_id;

  if v_status = 'waitlisted' then
    select count(*) into v_position
      from public.lesson_registrations r
     where r.lesson_id = p_lesson_id
       and r.status = 'waitlisted'
       and (r.joined_at, r.id) <= (now(), v_registration_id);
  end if;

  return jsonb_build_object(
    'success', true,
    'status', v_status,
    'registration_id', v_registration_id,
    'lesson_id', p_lesson_id,
    'registered_count', v_joined_count + case when v_status = 'joined' then 1 else 0 end,
    'capacity', v_lesson.capacity,
    'waitlist_position', v_position
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_registration: also lets a player leave the waitlist. Leaving the
-- waitlist is allowed until the lesson starts (it frees no spot); releasing a
-- spot still closes 24 hours before. The promotion trigger moves the next
-- waiting player in.
-- -----------------------------------------------------------------------------

create or replace function public.cancel_registration(p_lesson_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_active boolean;
  v_lesson public.lessons%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_registration_id uuid;
  v_status public.registration_status;
  v_joined_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select p.active into v_active from public.profiles p where p.id = v_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
  if not v_active then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_INACTIVE';
  end if;

  if v_reason is not null and length(v_reason) > 500 then
    raise exception using errcode = 'P0001', message = 'REASON_TOO_LONG';
  end if;

  select * into v_lesson from public.lessons l where l.id = p_lesson_id for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
  end if;
  if v_lesson.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'LESSON_CANCELLED';
  end if;
  if v_lesson.start_time <= now() then
    raise exception using errcode = 'P0001', message = 'LESSON_STARTED';
  end if;

  -- Only the caller's own row can match: player_id comes from auth.uid().
  select r.id, r.status into v_registration_id, v_status
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id
     and r.player_id = v_user_id
     and r.status in ('joined', 'waitlisted');

  if v_status is distinct from 'waitlisted'
     and now() > v_lesson.start_time - private.cancellation_lead_time() then
    raise exception using errcode = 'P0001', message = 'CANCELLATION_DEADLINE_PASSED';
  end if;
  if v_registration_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_REGISTERED';
  end if;

  update public.lesson_registrations r
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = v_reason
   where r.id = v_registration_id;

  select count(*) into v_joined_count
    from public.lesson_registrations r
   where r.lesson_id = p_lesson_id and r.status = 'joined';

  return jsonb_build_object(
    'success', true,
    'status', 'cancelled',
    'registration_id', v_registration_id,
    'lesson_id', p_lesson_id,
    'registered_count', v_joined_count,
    'capacity', v_lesson.capacity
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_set_member_active: deactivation also takes the player off waitlists.
-- Otherwise identical to 20260921000500_signup_approval.sql.
-- -----------------------------------------------------------------------------

create or replace function public.admin_set_member_active(p_member_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_pending boolean;
  v_cancelled integer := 0;
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  if p_member_id = (select auth.uid()) and not p_active then
    raise exception using errcode = 'P0001', message = 'CANNOT_DEACTIVATE_SELF';
  end if;

  select p.approved_at is null into v_was_pending
    from public.profiles p
   where p.id = p_member_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'MEMBER_NOT_FOUND';
  end if;

  update public.profiles p
     set active = p_active,
         approved_at = case when p_active then coalesce(p.approved_at, now()) else p.approved_at end
   where p.id = p_member_id;

  if not p_active then
    -- Lock the affected lessons first (same lock order as join_lesson).
    perform 1
       from public.lessons l
      where l.status = 'scheduled'
        and l.start_time > now()
        and l.id in (
          select r.lesson_id from public.lesson_registrations r
           where r.player_id = p_member_id and r.status in ('joined', 'waitlisted')
        )
      order by l.id
      for no key update;

    -- Freed spots go to the next waiting player (promotion trigger).
    with cancelled as (
      update public.lesson_registrations r
         set status = 'cancelled',
             cancelled_at = now(),
             cancellation_reason = 'Account deactivated by the coach'
        from public.lessons l
       where l.id = r.lesson_id
         and r.player_id = p_member_id
         and r.status in ('joined', 'waitlisted')
         and l.status = 'scheduled'
         and l.start_time > now()
      returning r.id
    )
    select count(*) into v_cancelled from cancelled;
  end if;

  return jsonb_build_object(
    'success', true,
    'active', p_active,
    'approved', p_active and v_was_pending,
    'cancelled_registrations', v_cancelled
  );
end;
$$;

revoke execute on function public.join_waitlist(uuid) from public, anon;
grant execute on function public.join_waitlist(uuid) to authenticated;
