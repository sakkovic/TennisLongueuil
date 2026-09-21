-- =============================================================================
-- Tennis Longueuil: authorization (Row Level Security + grants)
--
-- Principles
--   * RLS is enabled on every table in the exposed "public" schema.
--   * Table privileges are granted per column, so sensitive columns cannot be
--     read or written directly even when a row is visible.
--   * The anon role gets nothing: every screen requires a signed-in member.
--   * Privileged writes (joining, cancelling, levels, account state) go through
--     SECURITY DEFINER functions that derive the caller from auth.uid().
--
-- Summary
--   player_levels         read: any signed-in user          write: none (migrations)
--   profiles              read: own row, or active members (public columns only)
--                         update: own row, only full_name / phone / avatar_path
--                         role / level / active: admin RPCs only
--                         email / phone of others: admin RPCs only
--   lessons               read: active members               insert/update: admins
--                         delete: nobody (lessons are cancelled, not deleted)
--   lesson_registrations  read: admins (all rows); players (own rows + other
--                         players' 'joined' rows)
--                         write: nobody directly (join_lesson / cancel_registration)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper predicates used by policies.
-- SECURITY DEFINER so they can read profiles without recursing into the
-- profiles RLS policies. They only ever look at the caller's own row.
-- -----------------------------------------------------------------------------

create function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and active
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and active and role = 'admin'
  );
$$;

revoke execute on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_member() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- player_levels
-- -----------------------------------------------------------------------------

alter table public.player_levels enable row level security;

revoke all on public.player_levels from anon, authenticated;
grant select on public.player_levels to authenticated;

create policy "Signed-in users can read levels"
  on public.player_levels for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;

-- Public identity columns, needed for participant lists.
-- phone is deliberately NOT readable here: members read their own contact
-- details through get_my_profile() and admins through admin_list_members().
grant select (id, full_name, avatar_path, role, player_level_id, active, created_at, updated_at)
  on public.profiles to authenticated;

-- The only columns a member can ever change directly.
-- role, player_level_id and active are not updatable by the authenticated
-- role at all: privilege escalation is impossible regardless of RLS.
grant update (full_name, phone, avatar_path) on public.profiles to authenticated;

create policy "Members can read profiles"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_active_member())
  );

create policy "Active members can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and (select private.is_active_member()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- lessons
-- -----------------------------------------------------------------------------

alter table public.lessons enable row level security;

revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;

-- Admin-editable columns. id, capacity (generated), registered_count
-- (trigger-maintained), created_by and timestamps are not client-writable.
grant insert (title, description, start_time, end_time, location, court_count, player_level_id,
              registration_open, registration_deadline, status)
  on public.lessons to authenticated;
grant update (title, description, start_time, end_time, location, court_count, player_level_id,
              registration_open, registration_deadline, status)
  on public.lessons to authenticated;

create policy "Active members can read lessons"
  on public.lessons for select
  to authenticated
  using ((select private.is_active_member()));

create policy "Admins can create lessons"
  on public.lessons for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update lessons"
  on public.lessons for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- No delete policy and no delete privilege: history is preserved.

-- -----------------------------------------------------------------------------
-- lesson_registrations
-- -----------------------------------------------------------------------------

alter table public.lesson_registrations enable row level security;

revoke all on public.lesson_registrations from anon, authenticated;
grant select on public.lesson_registrations to authenticated;

-- Players see their own registrations (including their own cancellation
-- reason) and other players' ACTIVE registrations. Other players' cancelled
-- rows are invisible, and 'joined' rows can never carry a reason (see the
-- lesson_registrations_cancellation_consistency constraint).
create policy "Members can read relevant registrations"
  on public.lesson_registrations for select
  to authenticated
  using (
    (select private.is_admin())
    or player_id = (select auth.uid())
    or (status = 'joined' and (select private.is_active_member()))
  );

-- No insert/update/delete policies or privileges: all writes go through
-- join_lesson() and cancel_registration(), which enforce capacity atomically.
