/**
 * Club rules: registration closes 4 hours before a lesson (unless the lesson
 * sets an earlier deadline) and players can cancel until 24 hours before.
 */
import type { Client } from 'pg';

import {
  asUser,
  cancelRegistration,
  connect,
  countJoined,
  createLesson,
  createUser,
  disconnectAll,
  joinLesson,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

/** Registers a player directly (setup only), bypassing the time rules. */
async function registerDirectly(lessonId: string, playerId: string) {
  await db.query(`insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`, [
    lessonId,
    playerId,
  ]);
}

describe('registration deadline', () => {
  it('closes registration 4 hours before the lesson when no deadline is set', async () => {
    const player = await createUser(db, 'Late Joiner');
    const lesson = await createLesson(db, { startsInHours: 3.5 });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow(
      'REGISTRATION_DEADLINE_PASSED',
    );
    expect(await countJoined(db, lesson.id)).toBe(0);
  });

  it('accepts registrations until 4 hours before the lesson', async () => {
    const player = await createUser(db, 'On Time');
    const lesson = await createLesson(db, { startsInHours: 4.5 });

    await expect(joinLesson(db, player.id, lesson.id)).resolves.toMatchObject({
      status: 'joined',
    });
  });

  it('honours an earlier deadline chosen by the coach', async () => {
    const player = await createUser(db, 'Too Late');
    // Starts in 30 hours, but the coach closed registration an hour ago.
    const lesson = await createLesson(db, { startsInHours: 30, deadlineInHours: -1 });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow(
      'REGISTRATION_DEADLINE_PASSED',
    );
  });
});

describe('cancellation deadline', () => {
  it('lets a player cancel more than 24 hours before the lesson', async () => {
    const player = await createUser(db, 'Early Canceller');
    const lesson = await createLesson(db, { startsInHours: 25 });
    await joinLesson(db, player.id, lesson.id);

    await expect(cancelRegistration(db, player.id, lesson.id, 'Busy')).resolves.toMatchObject({
      status: 'cancelled',
      registered_count: 0,
    });
  });

  it('refuses cancellations within 24 hours of the lesson and keeps the spot taken', async () => {
    const player = await createUser(db, 'Last Minute');
    const lesson = await createLesson(db, { startsInHours: 20 });
    await registerDirectly(lesson.id, player.id);

    await expect(cancelRegistration(db, player.id, lesson.id, 'Changed my mind')).rejects.toThrow(
      'CANCELLATION_DEADLINE_PASSED',
    );
    expect(await countJoined(db, lesson.id)).toBe(1);
  });

  it('still reports a lesson that has started as started', async () => {
    const player = await createUser(db, 'Too Late');
    const lesson = await createLesson(db, { startsInHours: -0.25 });

    await expect(cancelRegistration(db, player.id, lesson.id)).rejects.toThrow('LESSON_STARTED');
  });

  it('lets the coach free a spot by deactivating an account, even within 24 hours', async () => {
    const coach = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Leaving Soon');
    const lesson = await createLesson(db, { startsInHours: 10 });
    await registerDirectly(lesson.id, player.id);

    const { rows } = await asUser(db, coach.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false) as result', [player.id]),
    );

    expect(rows[0].result).toMatchObject({ cancelled_registrations: 1 });
    expect(await countJoined(db, lesson.id)).toBe(0);
  });
});
