-- =============================================================================
-- Tennis Longueuil: RPC functions
--
-- Why SECURITY DEFINER?
--   Members have no direct write access to lesson_registrations, and cannot
--   change role / level / active on profiles. These functions are the only
--   write paths. Each one:
--     * identifies the caller with auth.uid() (never a client-supplied user id),
--     * re-checks authorization itself (active member / admin),
--     * uses an empty search_path and fully qualified names,
--     * is executable by the "authenticated" role only.
--
-- Errors are raised with SQLSTATE P0001 and a stable machine-readable message
-- (e.g. LESSON_FULL). The app translates them into friendly text.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- join_lesson: atomically register the caller for a lesson
-- -----------------------------------------------------------------------------

create function public.join_lesson(p_lesson_id uuid)
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

  -- Lock the lesson row. Concurrent joins/cancellations for the same lesson
  -- queue here, so "count, compare with capacity, insert" is one atomic step:
  -- two players can never both take the last spot.
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
  if v_lesson.registration_deadline is not null and now() > v_lesson.registration_deadline then
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

  -- Create the registration, or reactivate a previously cancelled one.
  insert into public.lesson_registrations as r (lesson_id, player_id, status, joined_at)
  values (p_lesson_id, v_user_id, 'joined', now())
  on conflict on constraint lesson_registrations_lesson_player_key do update
    set status = 'joined',
        joined_at = now(),
        cancelled_at = null,
        cancellation_reason = null
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
-- cancel_registration: cancel the caller's own registration (kept as history)
-- -----------------------------------------------------------------------------

create function public.cancel_registration(p_lesson_id uuid, p_reason text default null)
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

  -- Same lock as join_lesson, so counts stay consistent.
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
  update public.lesson_registrations r
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = v_reason
   where r.lesson_id = p_lesson_id
     and r.player_id = v_user_id
     and r.status = 'joined'
  returning r.id into v_registration_id;

  if v_registration_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_REGISTERED';
  end if;

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
-- Member details (includes private contact data)
-- -----------------------------------------------------------------------------

create type public.member_details as (
  id uuid,
  full_name text,
  email text,
  phone text,
  avatar_path text,
  role public.user_role,
  player_level_id smallint,
  player_level_name text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  upcoming_lessons_count integer
);

-- Internal: not callable through the API.
create function private.member_details()
returns setof public.member_details
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    u.email::text,
    p.phone,
    p.avatar_path,
    p.role,
    p.player_level_id,
    pl.name,
    p.active,
    p.created_at,
    p.updated_at,
    (
      select count(*)::integer
        from public.lesson_registrations r
        join public.lessons l on l.id = r.lesson_id
       where r.player_id = p.id
         and r.status = 'joined'
         and l.status = 'scheduled'
         and l.end_time > now()
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.player_levels pl on pl.id = p.player_level_id;
$$;

revoke execute on function private.member_details() from public;

-- The caller's own full profile (works for inactive accounts too, so the app
-- can explain why access is blocked).
create function public.get_my_profile()
returns setof public.member_details
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.member_details() m where m.id = (select auth.uid());
$$;

-- Admin: all members (or one member) with contact details.
create function public.admin_list_members(p_member_id uuid default null)
returns setof public.member_details
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  return query
    select *
      from private.member_details() m
     where p_member_id is null or m.id = p_member_id
     order by m.active desc, lower(m.full_name);
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: assign a player level (the ONLY way a level can change)
-- -----------------------------------------------------------------------------

create function public.admin_set_member_level(p_member_id uuid, p_player_level_id smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  if p_player_level_id is not null and not exists (
    select 1 from public.player_levels pl where pl.id = p_player_level_id and pl.active
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_LEVEL';
  end if;

  update public.profiles p
     set player_level_id = p_player_level_id
   where p.id = p_member_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'MEMBER_NOT_FOUND';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin: activate / deactivate an account
-- Deactivating also cancels the member's registrations for lessons that have
-- not started yet, so their spots are released to other players.
-- -----------------------------------------------------------------------------

create function public.admin_set_member_active(p_member_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cancelled integer := 0;
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  if p_member_id = (select auth.uid()) and not p_active then
    raise exception using errcode = 'P0001', message = 'CANNOT_DEACTIVATE_SELF';
  end if;

  update public.profiles p
     set active = p_active
   where p.id = p_member_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'MEMBER_NOT_FOUND';
  end if;

  if not p_active then
    -- Lock the affected lessons first (same lock order as join_lesson).
    perform 1
       from public.lessons l
      where l.status = 'scheduled'
        and l.start_time > now()
        and l.id in (
          select r.lesson_id from public.lesson_registrations r
           where r.player_id = p_member_id and r.status = 'joined'
        )
      order by l.id
      for no key update;

    with cancelled as (
      update public.lesson_registrations r
         set status = 'cancelled',
             cancelled_at = now(),
             cancellation_reason = 'Account deactivated by the coach'
        from public.lessons l
       where l.id = r.lesson_id
         and r.player_id = p_member_id
         and r.status = 'joined'
         and l.status = 'scheduled'
         and l.start_time > now()
      returning r.id
    )
    select count(*) into v_cancelled from cancelled;
  end if;

  return jsonb_build_object(
    'success', true,
    'active', p_active,
    'cancelled_registrations', v_cancelled
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Execute privileges: signed-in users only (functions re-check roles inside)
-- -----------------------------------------------------------------------------

revoke execute on function public.join_lesson(uuid) from public, anon;
revoke execute on function public.cancel_registration(uuid, text) from public, anon;
revoke execute on function public.get_my_profile() from public, anon;
revoke execute on function public.admin_list_members(uuid) from public, anon;
revoke execute on function public.admin_set_member_level(uuid, smallint) from public, anon;
revoke execute on function public.admin_set_member_active(uuid, boolean) from public, anon;

grant execute on function public.join_lesson(uuid) to authenticated;
grant execute on function public.cancel_registration(uuid, text) to authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.admin_list_members(uuid) to authenticated;
grant execute on function public.admin_set_member_level(uuid, smallint) to authenticated;
grant execute on function public.admin_set_member_active(uuid, boolean) to authenticated;
