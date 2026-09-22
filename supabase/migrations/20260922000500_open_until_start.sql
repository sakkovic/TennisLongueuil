-- =============================================================================
-- Tennis Longueuil: registration open until the lesson starts
--
-- New club rule: players are welcome until the lesson begins, as long as there
-- is a spot. A lesson can still close earlier (lessons.registration_deadline,
-- chosen by the coach). Cancellations still close 24 hours before.
--
-- join_lesson, join_waitlist and upcoming_sessions read the default through
-- private.registration_lead_time(), so changing it here is enough.
--
-- The waitlist keeps a cutoff of its own: players are moved in automatically
-- only until 4 hours before the lesson, so nobody is added at the last minute
-- without knowing it. After that, a free spot goes to whoever joins first
-- (including players who were waiting).
-- =============================================================================

create or replace function private.registration_lead_time()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '0 minutes' $$;

create function private.promotion_lead_time()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '4 hours' $$;

revoke execute on function private.promotion_lead_time() from public;

-- Same as 20260922000200_waitlist.sql, plus the 4-hour promotion cutoff.
create or replace function private.promote_waitlist(p_lesson_id uuid)
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
     or now() > v_lesson.start_time - private.promotion_lead_time()
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
