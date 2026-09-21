/**
 * Self sign-up with coach approval.
 *
 * The security promise: creating an account grants nothing. A pending member
 * can read their own profile (so the app can explain the wait) and nothing
 * else, and only an admin can approve them.
 */
import type { Client } from 'pg';

import {
  asUser,
  connect,
  createLesson,
  createUser,
  disconnectAll,
  getProfile,
  joinLesson,
  signUp,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

function setActive(userId: string, memberId: string, active: boolean) {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ result: { active: boolean; approved: boolean } }>(
      'select public.admin_set_member_active($1, $2) as result',
      [memberId, active],
    );
    return rows[0].result;
  });
}

describe('signing up', () => {
  it('creates a pending player profile from the sign-up name', async () => {
    const newcomer = await signUp(db, 'Julie Bergeron');

    const profile = await getProfile(db, newcomer.id);
    expect(profile).toMatchObject({ full_name: 'Julie Bergeron', role: 'player', active: false });
    expect(profile.approved_at).toBeNull();
  });

  it('ignores role and active claims in the sign-up metadata', async () => {
    const attacker = await signUp(db, 'Sneaky', {
      role: 'admin',
      active: true,
      approved_at: 'now',
    });

    const profile = await getProfile(db, attacker.id);
    expect(profile.role).toBe('player');
    expect(profile.active).toBe(false);
    expect(profile.approved_at).toBeNull();
  });

  it('falls back to the email local part when no name is given', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (id, email, raw_user_meta_data)
       values (gen_random_uuid(), 'anonymous.player@test.local', '{}'::jsonb) returning id`,
    );
    expect((await getProfile(db, rows[0].id)).full_name).toBe('anonymous.player');
  });
});

describe('a pending member', () => {
  it('can read their own profile so the app can explain the wait', async () => {
    const pending = await createUser(db, 'Waiting', { pending: true });

    const me = await asUser(db, pending.id, async (tx) => {
      const { rows } = await tx.query('select * from public.get_my_profile()');
      return rows[0];
    });

    expect(me).toMatchObject({ full_name: 'Waiting', active: false });
    expect(me.approved_at).toBeNull();
  });

  it('cannot see lessons, other members or registrations', async () => {
    const pending = await createUser(db, 'Curious', { pending: true });
    const member = await createUser(db, 'Established');
    const lesson = await createLesson(db);
    await joinLesson(db, member.id, lesson.id);

    await asUser(db, pending.id, async (tx) => {
      const lessons = await tx.query('select id from public.lessons');
      expect(lessons.rows).toHaveLength(0);

      const registrations = await tx.query('select id from public.lesson_registrations');
      expect(registrations.rows).toHaveLength(0);

      // Only their own row: the profiles policy needs an ACTIVE member to see others.
      const profiles = await tx.query('select id from public.profiles');
      expect(profiles.rows.map((r) => r.id)).toEqual([pending.id]);
    });
  });

  it('cannot join a lesson', async () => {
    const pending = await createUser(db, 'Eager', { pending: true });
    const lesson = await createLesson(db);

    await expect(joinLesson(db, pending.id, lesson.id)).rejects.toThrow('ACCOUNT_INACTIVE');
    expect((await getLessonCount(lesson.id)) === 0).toBe(true);
  });

  it('cannot approve themselves, directly or through the admin function', async () => {
    const pending = await createUser(db, 'Impatient', { pending: true });

    await expect(
      asUser(db, pending.id, (tx) =>
        tx.query('update public.profiles set active = true where id = $1', [pending.id]),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asUser(db, pending.id, (tx) =>
        tx.query('select public.admin_set_member_active($1, true)', [pending.id]),
      ),
    ).rejects.toThrow('NOT_AUTHORIZED');

    // approved_at has no UPDATE grant either.
    await expect(
      asUser(db, pending.id, (tx) =>
        tx.query('update public.profiles set approved_at = now() where id = $1', [pending.id]),
      ),
    ).rejects.toThrow(/permission denied/);

    const profile = await getProfile(db, pending.id);
    expect(profile.active).toBe(false);
    expect(profile.approved_at).toBeNull();
  });

  it('is not approved by an ordinary member either', async () => {
    const pending = await createUser(db, 'Hopeful', { pending: true });
    const friend = await createUser(db, 'Friendly');

    await expect(setActive(friend.id, pending.id, true)).rejects.toThrow('NOT_AUTHORIZED');
    expect((await getProfile(db, pending.id)).active).toBe(false);
  });
});

describe('the coach approving a member', () => {
  it('activates the account, records the approval and unlocks joining', async () => {
    const coach = await createUser(db, 'Coach', { role: 'admin' });
    const pending = await createUser(db, 'Newcomer', { pending: true });
    const lesson = await createLesson(db);

    const result = await setActive(coach.id, pending.id, true);
    expect(result).toMatchObject({ active: true, approved: true });

    const profile = await getProfile(db, pending.id);
    expect(profile.active).toBe(true);
    expect(profile.approved_at).not.toBeNull();

    const join = await joinLesson(db, pending.id, lesson.id);
    expect(join).toMatchObject({ success: true, registered_count: 1 });
  });

  it('keeps the original approval date when reactivating, so it is not a new sign-up', async () => {
    const coach = await createUser(db, 'Coach', { role: 'admin' });
    const member = await createUser(db, 'Returning', { pending: true });

    await setActive(coach.id, member.id, true);
    const approvedAt = (await getProfile(db, member.id)).approved_at;

    await setActive(coach.id, member.id, false);
    const reactivated = await setActive(coach.id, member.id, true);

    // Not a first approval, so the app says "reactivated" rather than "approved".
    expect(reactivated).toMatchObject({ active: true, approved: false });
    expect((await getProfile(db, member.id)).approved_at).toEqual(approvedAt);
  });

  it('lists pending sign-ups first', async () => {
    const coach = await createUser(db, 'Coach', { role: 'admin' });
    // Alphabetically last, so only the pending-first ordering can put it on top.
    const approved = await createUser(db, 'Zoe Active');
    const pending = await createUser(db, 'Zoe Pending', { pending: true });

    const rows = await asUser(db, coach.id, async (tx) => {
      const { rows } = await tx.query<{ id: string; approved_at: Date | null }>(
        'select id, approved_at from public.admin_list_members()',
      );
      return rows;
    });

    // Every pending sign-up comes before every approved member.
    const firstApproved = rows.findIndex((row) => row.approved_at !== null);
    const pendingBlock = rows.slice(0, firstApproved).map((row) => row.id);
    const approvedBlock = rows.slice(firstApproved);

    expect(pendingBlock).toContain(pending.id);
    expect(approvedBlock.map((row) => row.id)).toContain(approved.id);
    expect(approvedBlock.every((row) => row.approved_at !== null)).toBe(true);
  });

  it('can assign a level before approving, without granting access', async () => {
    const coach = await createUser(db, 'Coach', { role: 'admin' });
    const pending = await createUser(db, 'Prepared', { pending: true });
    const { rows } = await db.query<{ id: number }>(
      `select id from public.player_levels where name = 'Beginner'`,
    );

    await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_level($1, $2::smallint)', [pending.id, rows[0].id]),
    );

    const profile = await getProfile(db, pending.id);
    expect(profile.active).toBe(false);
    expect(profile.approved_at).toBeNull();
  });
});

async function getLessonCount(lessonId: string): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `select count(*) from public.lesson_registrations where lesson_id = $1 and status = 'joined'`,
    [lessonId],
  );
  return Number(rows[0].count);
}
