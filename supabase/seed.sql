-- =============================================================================
-- LOCAL DEVELOPMENT SEED ONLY
--
-- Loaded by `npx supabase db reset` on the local Docker stack.
-- NOT applied by `supabase db push` to a hosted project.
--
-- All demo accounts use the password:  Tennis2026!
--   coach@tennis.local     (admin)
--   mohamed@tennis.local   alice@tennis.local   zdenek@tennis.local
--   maelys@tennis.local    samuel@tennis.local
--   julie@tennis.local     (pending sign-up, waiting for the coach's approval)
-- =============================================================================

do $$
declare
  v_user record;
begin
  for v_user in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'coach@tennis.local',   'Coach Martin'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'mohamed@tennis.local', 'Mohamed Anis Sakka'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'alice@tennis.local',   'Alice Smith'),
      ('00000000-0000-4000-a000-000000000004'::uuid, 'zdenek@tennis.local',  'Zdenek Novak'),
      ('00000000-0000-4000-a000-000000000005'::uuid, 'maelys@tennis.local',  'Maëlys Tremblay'),
      ('00000000-0000-4000-a000-000000000006'::uuid, 'samuel@tennis.local',  'Samuel Roy'),
      ('00000000-0000-4000-a000-000000000007'::uuid, 'julie@tennis.local',   'Julie Bergeron')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt('Tennis2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v_user.full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user.id, v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- The on_auth_user_created trigger created the profiles, all pending approval.
-- Approve everyone except Julie, who demonstrates the coach's approval queue.
update public.profiles
   set active = true, approved_at = now()
 where id <> '00000000-0000-4000-a000-000000000007';

-- Promote the coach.
update public.profiles set role = 'admin'
 where id = '00000000-0000-4000-a000-000000000001';

update public.profiles p
   set player_level_id = (select id from public.player_levels where name = v.level),
       phone = v.phone
  from (values
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Intermediate', '+1 514 555 0102'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'Beginner',     '+1 514 555 0103'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Advanced',     '+1 450 555 0104'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'Intermediate', '+1 450 555 0105'),
    ('00000000-0000-4000-a000-000000000006'::uuid, 'Competitive',  '+1 438 555 0106')
  ) as v(id, level, phone)
 where p.id = v.id;

-- Upcoming lessons, expressed in Québec local time (DST-safe).
insert into public.lessons (title, description, start_time, end_time, court_count, player_level_id, created_by)
values
  (
    'Group Tennis Lesson',
    'Warm-up, drills and match play.',
    (date_trunc('week', now() at time zone 'America/Toronto') + interval '7 days 18 hours') at time zone 'America/Toronto',
    (date_trunc('week', now() at time zone 'America/Toronto') + interval '7 days 19 hours 30 minutes') at time zone 'America/Toronto',
    1,
    (select id from public.player_levels where name = 'Intermediate'),
    '00000000-0000-4000-a000-000000000001'
  ),
  (
    'Tennis Lesson',
    null,
    (date_trunc('week', now() at time zone 'America/Toronto') + interval '10 days 19 hours') at time zone 'America/Toronto',
    (date_trunc('week', now() at time zone 'America/Toronto') + interval '10 days 20 hours 30 minutes') at time zone 'America/Toronto',
    2,
    null,
    '00000000-0000-4000-a000-000000000001'
  );
