-- =============================================================================
-- Tennis Longueuil: registration and cancellation deadlines
--
-- Club rules, enforced here for every client:
--   * Registration closes 4 hours before the lesson starts. A lesson can set an
--     earlier deadline (lessons.registration_deadline); without one, the
--     4-hour rule applies.
--   * A player can cancel their own registration until 24 hours before the
--     lesson starts. After that, their spot stays taken (the coach can still
--     deactivate an account, which frees future spots).
--
-- The lead times live in two small functions so they are defined once.
-- The app mirrors them in src/constants/lessons.ts for display only.
-- =============================================================================

create function private.registration_lead_time()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '4 hours' $$;

create function private.cancellation_lead_time()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '24 hours' $$;

revoke execute on function private.registration_lead_time() from public;
revoke execute on function private.cancellation_lead_time() from public;

-- -----------------------------------------------------------------------------
-- join_lesson: identical to before, except the deadline check now always
-- applies (explicit deadline, or 4 hours before the start).
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
-- cancel_registration: identical to before, plus the 24-hour cancellation rule.
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
  if now() > v_lesson.start_time - private.cancellation_lead_time() then
    raise exception using errcode = 'P0001', message = 'CANCELLATION_DEADLINE_PASSED';
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
