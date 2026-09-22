-- =============================================================================
-- Tennis Longueuil: weekly series
--
-- Lessons created together as a weekly series share a series_id, chosen by the
-- app when it inserts the series. Each occurrence is still an ordinary lesson
-- (own registrations, own status), but the coach can now edit or cancel
-- "this lesson and the following ones" in one step.
--
-- series_id is set on insert only: a lesson never moves to another series.
-- =============================================================================

alter table public.lessons add column series_id uuid;

create index lessons_series_id_idx
  on public.lessons (series_id, start_time)
  where series_id is not null;

grant insert (series_id) on public.lessons to authenticated;

-- -----------------------------------------------------------------------------
-- admin_update_lessons: save several lessons in one statement, so a change to
-- a series is applied to every occurrence or to none.
--
-- SECURITY INVOKER on purpose: the caller's RLS policies and column privileges
-- apply exactly as for a normal update, so only admins can change lessons and
-- only the admin-editable columns can be written. A lesson the caller may not
-- update makes the whole call fail.
-- -----------------------------------------------------------------------------

create function public.admin_update_lessons(p_lessons jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected integer;
  v_updated integer;
begin
  if not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;

  if jsonb_typeof(p_lessons) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  v_expected := jsonb_array_length(p_lessons);
  if v_expected = 0 or v_expected > 60 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  update public.lessons l
     set title = x.title,
         description = x.description,
         start_time = x.start_time,
         end_time = x.end_time,
         location = x.location,
         court_count = x.court_count,
         player_level_id = x.player_level_id,
         registration_open = x.registration_open,
         registration_deadline = x.registration_deadline
    from jsonb_to_recordset(p_lessons) as x(
      id uuid,
      title text,
      description text,
      start_time timestamptz,
      end_time timestamptz,
      location text,
      court_count integer,
      player_level_id smallint,
      registration_open boolean,
      registration_deadline timestamptz
    )
   where l.id = x.id;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception using errcode = 'P0001', message = 'LESSON_NOT_FOUND';
  end if;

  return v_updated;
end;
$$;

revoke execute on function public.admin_update_lessons(jsonb) from public, anon;
grant execute on function public.admin_update_lessons(jsonb) to authenticated;
