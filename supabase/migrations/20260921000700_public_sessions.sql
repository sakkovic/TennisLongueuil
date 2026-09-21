-- =============================================================================
-- SaKKa.Tennis: public session slots for the welcome screen
--
-- The welcome screen (before sign-in) shows the next sessions like a flyer:
-- date, time and how many spots are left. Anonymous users cannot read the
-- lessons table (RLS), so this function returns ONLY what a public flyer
-- would show: no participant names, no registrations, no descriptions.
--
-- SECURITY DEFINER because anon has no SELECT privilege on lessons. It reads
-- a fixed set of non-sensitive columns and caps the number of rows.
-- =============================================================================

create function public.upcoming_sessions(p_limit integer default 3)
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
  order by l.start_time
  limit least(greatest(coalesce(p_limit, 3), 1), 6);
$$;

revoke execute on function public.upcoming_sessions(integer) from public;
grant execute on function public.upcoming_sessions(integer) to anon, authenticated;
