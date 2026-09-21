-- =============================================================================
-- Tennis Longueuil: self sign-up with coach approval
--
-- Players can create their own account in the app, but a new account is
-- PENDING until the coach approves it: active = false and approved_at is null.
-- Nothing changes for security, because every existing policy already requires
-- an ACTIVE profile. A pending account can read its own profile row (so the
-- app can explain the wait) and nothing else: no lessons, no member list, no
-- registrations, and join_lesson rejects it with ACCOUNT_INACTIVE.
--
-- A member cannot approve themselves. The authenticated role has no UPDATE
-- privilege on "active" or "approved_at"; only admin_set_member_active can
-- change them, and it checks that the caller is an active admin.
--
-- approved_at also distinguishes the two ways an account can be unusable:
--   approved_at is null  -> never approved, waiting for the coach
--   approved_at is not null and not active -> approved once, then deactivated
-- =============================================================================

alter table public.profiles add column approved_at timestamptz;

comment on column public.profiles.approved_at is
  'When an admin first approved the account. NULL means the account is waiting for approval.';

-- Members who are already active were approved when their account was created.
update public.profiles set approved_at = created_at where active;

-- New accounts are pending until the coach approves them.
alter table public.profiles alter column active set default false;

-- Deliberately no `grant select (approved_at)`: members read their own
-- approved_at through get_my_profile() and the coach reads everyone's through
-- admin_list_members(). Both are SECURITY DEFINER, so no member needs to
-- select the column directly, and other members' approval state stays private.

-- Profile for every new auth user, whether created by the coach in the
-- dashboard or by self sign-up. The role is always 'player' and the account is
-- always pending: nothing is read from user-editable metadata except the name.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, active, approved_at)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'New player'
      ),
      80
    ),
    false,
    null
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Member details now carry approved_at, so the coach can tell a pending
-- sign-up apart from an account they deactivated.
-- -----------------------------------------------------------------------------

alter type public.member_details add attribute approved_at timestamptz;

create or replace function private.member_details()
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
    ),
    p.approved_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.player_levels pl on pl.id = p.player_level_id;
$$;

revoke execute on function private.member_details() from public;

-- Pending sign-ups first (they need the coach's attention), then active
-- members, then deactivated ones.
create or replace function public.admin_list_members(p_member_id uuid default null)
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
     order by (m.approved_at is null) desc, m.active desc, lower(m.full_name);
end;
$$;

-- Activating an account for the first time records the approval, so a later
-- deactivation is never mistaken for a pending sign-up.
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

  -- Read the approval state before the update: RETURNING would give the new one.
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
    -- True only for the first approval of a pending sign-up.
    'approved', p_active and v_was_pending,
    'cancelled_registrations', v_cancelled
  );
end;
$$;
