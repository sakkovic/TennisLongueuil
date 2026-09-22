-- =============================================================================
-- Tennis Longueuil: attendance
--
-- The coach marks each registered player present or absent, from 30 minutes
-- before the lesson onward. Attendance lives in its own table so it can be
-- private: only admins and the player concerned can read it (other players
-- can see who registered, but never who was absent).
--
-- Writes only through admin_set_attendance().
-- =============================================================================

create type public.attendance_status as enum ('present', 'absent');

create table public.lesson_attendance (
  registration_id uuid primary key
    references public.lesson_registrations (id) on delete cascade,
  -- Copied from the registration by admin_set_attendance, for the RLS policy.
  player_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz not null default now()
);

comment on table public.lesson_attendance is
  'Attendance per registration. Readable by admins and the player; written only by admin_set_attendance.';

create index lesson_attendance_player_id_idx on public.lesson_attendance (player_id);
create index lesson_attendance_marked_by_idx on public.lesson_attendance (marked_by);

alter table public.lesson_attendance enable row level security;

revoke all on public.lesson_attendance from anon, authenticated;
grant select on public.lesson_attendance to authenticated;

create policy "Admins and the player can read attendance"
  on public.lesson_attendance for select
  to authenticated
  using ((select private.is_admin()) or player_id = (select auth.uid()));

-- How long before the start the coach can take attendance.
-- Mirrored for display in src/constants/lessons.ts.
create function private.attendance_lead_time()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 minutes' $$;

revoke execute on function private.attendance_lead_time() from public;

-- Marks a registered player present or absent. Passing null clears the mark.
create function public.admin_set_attendance(
  p_registration_id uuid,
  p_status public.attendance_status default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
  v_registration_status public.registration_status;
  v_lesson_status public.lesson_status;
  v_start_time timestamptz;
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  select r.player_id, r.status, l.status, l.start_time
    into v_player_id, v_registration_status, v_lesson_status, v_start_time
    from public.lesson_registrations r
    join public.lessons l on l.id = r.lesson_id
   where r.id = p_registration_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_NOT_FOUND';
  end if;
  if v_registration_status <> 'joined' then
    raise exception using errcode = 'P0001', message = 'NOT_REGISTERED';
  end if;
  if v_lesson_status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'LESSON_CANCELLED';
  end if;
  if now() < v_start_time - private.attendance_lead_time() then
    raise exception using errcode = 'P0001', message = 'ATTENDANCE_NOT_OPEN';
  end if;

  if p_status is null then
    delete from public.lesson_attendance a where a.registration_id = p_registration_id;
  else
    insert into public.lesson_attendance as a (registration_id, player_id, status, marked_by)
    values (p_registration_id, v_player_id, p_status, (select auth.uid()))
    on conflict (registration_id) do update
      set status = excluded.status,
          marked_by = excluded.marked_by,
          marked_at = now();
  end if;

  return jsonb_build_object(
    'success', true,
    'registration_id', p_registration_id,
    'attendance', p_status
  );
end;
$$;

revoke execute on function public.admin_set_attendance(uuid, public.attendance_status) from public, anon;
grant execute on function public.admin_set_attendance(uuid, public.attendance_status) to authenticated;
