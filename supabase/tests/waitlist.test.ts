/**
 * Waitlist: players queue for a full lesson and are moved in automatically,
 * first come first served, when a spot opens.
 */
import type { Client } from 'pg';

import {
  asUser,
  cancelRegistration,
  connect,
  countJoined,
  createLesson,
  createUser,
  createUsers,
  disconnectAll,
  joinLesson,
  joinWaitlist,
  registrationStatuses,
  type TestUser,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

async function fullLesson() {
  const lesson = await createLesson(db, { courts: 1 });
  const players = await createUsers(db, ['Full A', 'Full B', 'Full C', 'Full D']);
  for (const player of players) await joinLesson(db, player.id, lesson.id);
  return { lesson, players };
}

async function lessonCounts(lessonId: string) {
  const { rows } = await db.query<{ registered_count: number; waitlist_count: number }>(
    `select registered_count, waitlist_count from public.lessons where id = $1`,
    [lessonId],
  );
  return rows[0];
}

/** Registers a player directly (setup only), bypassing the time rules. */
async function registerDirectly(lessonId: string, player: TestUser, status = 'joined') {
  await db.query(
    `insert into public.lesson_registrations (lesson_id, player_id, status)
     values ($1, $2, $3::public.registration_status)`,
    [lessonId, player.id, status],
  );
}

describe('joining the waitlist', () => {
  it('queues players in order once the lesson is full', async () => {
    const { lesson } = await fullLesson();
    const [first, second] = await createUsers(db, ['Queue One', 'Queue Two']);

    await expect(joinWaitlist(db, first.id, lesson.id)).resolves.toMatchObject({
      status: 'waitlisted',
      waitlist_position: 1,
      registered_count: 4,
    });
    await expect(joinWaitlist(db, second.id, lesson.id)).resolves.toMatchObject({
      status: 'waitlisted',
      waitlist_position: 2,
    });
    expect(await lessonCounts(lesson.id)).toEqual({ registered_count: 4, waitlist_count: 2 });
  });

  it('simply joins when a spot is free', async () => {
    const lesson = await createLesson(db);
    const player = await createUser(db, 'Lucky Player');

    await expect(joinWaitlist(db, player.id, lesson.id)).resolves.toMatchObject({
      status: 'joined',
      waitlist_position: null,
    });
    expect(await countJoined(db, lesson.id)).toBe(1);
  });

  it('refuses duplicates', async () => {
    const { lesson, players } = await fullLesson();
    const waiting = await createUser(db, 'Waiting Twice');
    await joinWaitlist(db, waiting.id, lesson.id);

    await expect(joinWaitlist(db, waiting.id, lesson.id)).rejects.toThrow('ALREADY_WAITLISTED');
    await expect(joinWaitlist(db, players[0].id, lesson.id)).rejects.toThrow('ALREADY_REGISTERED');
    // Being on the waitlist does not bypass capacity.
    await expect(joinLesson(db, waiting.id, lesson.id)).rejects.toThrow('LESSON_FULL');
  });

  it('follows the same rules as joining', async () => {
    // The coach closed registration an hour ago.
    const lesson = await createLesson(db, { courts: 1, startsInHours: 30, deadlineInHours: -1 });
    for (const player of await createUsers(db, ['Rule A', 'Rule B', 'Rule C', 'Rule D'])) {
      await registerDirectly(lesson.id, player);
    }
    const late = await createUser(db, 'Late Waiter');
    const inactive = await createUser(db, 'Inactive Waiter', { active: false });

    await expect(joinWaitlist(db, late.id, lesson.id)).rejects.toThrow(
      'REGISTRATION_DEADLINE_PASSED',
    );
    await expect(joinWaitlist(db, inactive.id, lesson.id)).rejects.toThrow('ACCOUNT_INACTIVE');
    await expect(
      asUser(db, null, (tx) => tx.query('select public.join_waitlist($1)', [lesson.id])),
    ).rejects.toThrow('permission denied');
  });
});

describe('automatic promotion', () => {
  it('moves the first waiting player in when someone cancels', async () => {
    const { lesson, players } = await fullLesson();
    const [first, second] = await createUsers(db, ['Promo One', 'Promo Two']);
    await joinWaitlist(db, first.id, lesson.id);
    await joinWaitlist(db, second.id, lesson.id);

    await cancelRegistration(db, players[0].id, lesson.id, 'Sick');

    const statuses = await registrationStatuses(db, lesson.id);
    expect(statuses[first.id]).toBe('joined');
    expect(statuses[second.id]).toBe('waitlisted');
    expect(await lessonCounts(lesson.id)).toEqual({ registered_count: 4, waitlist_count: 1 });

    const { rows } = await db.query(
      `select promoted_at from public.lesson_registrations where lesson_id = $1 and player_id = $2`,
      [lesson.id, first.id],
    );
    expect(rows[0].promoted_at).not.toBeNull();
  });

  it('gives the freed spot to the waitlist, not to a latecomer', async () => {
    const { lesson, players } = await fullLesson();
    const waiting = await createUser(db, 'Patient Player');
    const latecomer = await createUser(db, 'Latecomer');
    await joinWaitlist(db, waiting.id, lesson.id);

    await cancelRegistration(db, players[1].id, lesson.id);

    await expect(joinLesson(db, latecomer.id, lesson.id)).rejects.toThrow('LESSON_FULL');
    expect((await registrationStatuses(db, lesson.id))[waiting.id]).toBe('joined');
  });

  it('skips players whose account was switched off', async () => {
    const { lesson, players } = await fullLesson();
    const [gone, next] = await createUsers(db, ['Gone Waiter', 'Next Waiter']);
    await joinWaitlist(db, gone.id, lesson.id);
    await joinWaitlist(db, next.id, lesson.id);
    await db.query(`update public.profiles set active = false where id = $1`, [gone.id]);

    await cancelRegistration(db, players[2].id, lesson.id);

    const statuses = await registrationStatuses(db, lesson.id);
    expect(statuses[gone.id]).toBe('waitlisted');
    expect(statuses[next.id]).toBe('joined');
  });

  it('fills new spots when the coach adds a court', async () => {
    const { lesson } = await fullLesson();
    const coach = await createUser(db, 'Court Coach', { role: 'admin' });
    const waiting = await createUsers(db, [
      'Court W1',
      'Court W2',
      'Court W3',
      'Court W4',
      'Court W5',
    ]);
    for (const player of waiting) await joinWaitlist(db, player.id, lesson.id);

    await asUser(db, coach.id, (tx) =>
      tx.query(`update public.lessons set court_count = 2 where id = $1`, [lesson.id]),
    );

    const statuses = await registrationStatuses(db, lesson.id);
    expect(waiting.slice(0, 4).map((player) => statuses[player.id])).toEqual([
      'joined',
      'joined',
      'joined',
      'joined',
    ]);
    expect(statuses[waiting[4].id]).toBe('waitlisted');
    expect(await lessonCounts(lesson.id)).toEqual({ registered_count: 8, waitlist_count: 1 });
  });

  it('moves the next player in when the coach deactivates a registered player', async () => {
    const { lesson, players } = await fullLesson();
    const coach = await createUser(db, 'Deactivating Coach', { role: 'admin' });
    const waiting = await createUser(db, 'Deactivation Waiter');
    await joinWaitlist(db, waiting.id, lesson.id);

    await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false)', [players[3].id]),
    );

    const statuses = await registrationStatuses(db, lesson.id);
    expect(statuses[players[3].id]).toBe('cancelled');
    expect(statuses[waiting.id]).toBe('joined');
  });

  it('takes a deactivated player off every waitlist', async () => {
    const { lesson } = await fullLesson();
    const coach = await createUser(db, 'Waitlist Coach', { role: 'admin' });
    const waiting = await createUser(db, 'Removed Waiter');
    await joinWaitlist(db, waiting.id, lesson.id);

    await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false)', [waiting.id]),
    );

    expect((await registrationStatuses(db, lesson.id))[waiting.id]).toBe('cancelled');
    expect(await lessonCounts(lesson.id)).toEqual({ registered_count: 4, waitlist_count: 0 });
  });

  it('stops moving players in during the last 4 hours', async () => {
    // Starts in 3 hours: too late to add someone who may not know.
    const lesson = await createLesson(db, { courts: 1, startsInHours: 3 });
    const registered = await createUsers(db, ['Closed A', 'Closed B', 'Closed C', 'Closed D']);
    for (const player of registered) await registerDirectly(lesson.id, player);
    const waiting = await createUser(db, 'Closed Waiter');
    await registerDirectly(lesson.id, waiting, 'waitlisted');
    const coach = await createUser(db, 'Closed Coach', { role: 'admin' });

    await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false)', [registered[0].id]),
    );

    expect((await registrationStatuses(db, lesson.id))[waiting.id]).toBe('waitlisted');
    expect(await countJoined(db, lesson.id)).toBe(3);

    // The free spot now goes to whoever joins first, including the waiting player.
    await expect(joinLesson(db, waiting.id, lesson.id)).resolves.toMatchObject({
      status: 'joined',
    });
  });

  it('stops moving players in once the coach closes registration', async () => {
    const { lesson, players } = await fullLesson();
    const waiting = await createUser(db, 'Closed Registration Waiter');
    await joinWaitlist(db, waiting.id, lesson.id);
    await db.query(`update public.lessons set registration_open = false where id = $1`, [
      lesson.id,
    ]);
    const coach = await createUser(db, 'Closing Coach', { role: 'admin' });

    await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false)', [players[0].id]),
    );

    expect((await registrationStatuses(db, lesson.id))[waiting.id]).toBe('waitlisted');
  });
});

describe('leaving the waitlist', () => {
  it('is allowed until the lesson starts, even inside 24 hours', async () => {
    const lesson = await createLesson(db, { courts: 1, startsInHours: 20 });
    const registered = await createUsers(db, ['Leave A', 'Leave B', 'Leave C', 'Leave D']);
    for (const player of registered) await registerDirectly(lesson.id, player);
    const waiting = await createUser(db, 'Leaving Waiter');
    await registerDirectly(lesson.id, waiting, 'waitlisted');

    await expect(cancelRegistration(db, waiting.id, lesson.id)).resolves.toMatchObject({
      status: 'cancelled',
    });
    // A registered player still cannot release their spot inside 24 hours.
    await expect(cancelRegistration(db, registered[0].id, lesson.id)).rejects.toThrow(
      'CANCELLATION_DEADLINE_PASSED',
    );
  });

  it('lets the player queue again, at the back of the line', async () => {
    const { lesson } = await fullLesson();
    const [first, second] = await createUsers(db, ['Back One', 'Back Two']);
    await joinWaitlist(db, first.id, lesson.id);
    await joinWaitlist(db, second.id, lesson.id);

    await cancelRegistration(db, first.id, lesson.id);
    await expect(joinWaitlist(db, first.id, lesson.id)).resolves.toMatchObject({
      status: 'waitlisted',
      waitlist_position: 2,
    });
  });
});

describe('privacy', () => {
  it('shows the waitlist to members without exposing cancellation reasons', async () => {
    const { lesson, players } = await fullLesson();
    const [waiting, other] = await createUsers(db, ['Visible Waiter', 'Curious Member']);
    await joinWaitlist(db, waiting.id, lesson.id);
    await cancelRegistration(db, players[0].id, lesson.id, 'Private reason');

    const rows = await asUser(db, other.id, async (tx) => {
      const result = await tx.query(
        `select player_id, status, cancellation_reason
           from public.lesson_registrations where lesson_id = $1`,
        [lesson.id],
      );
      return result.rows;
    });

    expect(rows.some((row) => row.player_id === waiting.id)).toBe(true);
    expect(rows.some((row) => row.player_id === players[0].id)).toBe(false);
    expect(rows.every((row) => row.cancellation_reason === null)).toBe(true);
  });
});

describe('a deleted account', () => {
  it('frees its spot for the next player in line', async () => {
    const { lesson, players } = await fullLesson();
    const waiting = await createUser(db, 'Next After Deletion');
    await joinWaitlist(db, waiting.id, lesson.id);

    // Deleting the auth user cascades to the profile and its registrations,
    // like the delete-account function does.
    await db.query('delete from auth.users where id = $1', [players[0].id]);

    expect((await registrationStatuses(db, lesson.id))[waiting.id]).toBe('joined');
    expect(await countJoined(db, lesson.id)).toBe(4);
  });
});
