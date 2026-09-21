/**
 * The MVP acceptance scenario, end to end at the database level:
 * the coach creates a 1-court lesson, four players fill it, a fifth is
 * refused (even when racing the fourth), a player cancels privately, and
 * the fifth player takes the freed spot.
 */
import type { Client } from 'pg';

import {
  asUser,
  cancelRegistration,
  connect,
  createUser,
  createUsers,
  disconnectAll,
  getLesson,
  joinLesson,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

it('supports the full acceptance scenario', async () => {
  const coach = await createUser(db, 'Coach', { role: 'admin' });
  const [p1, p2, p3, p4, p5] = await createUsers(db, [
    'Mohamed',
    'Alice',
    'Zdenek',
    'Maëlys',
    'Samuel',
  ]);

  // Coach creates Monday 18:00-19:30 at the default location with 1 court.
  const { rows } = await asUser(db, coach.id, (tx) =>
    tx.query(
      `insert into public.lessons (start_time, end_time, court_count)
       values (now() + interval '7 days', now() + interval '7 days 90 minutes', 1)
       returning id, capacity, location, title`,
    ),
  );
  const lesson = rows[0];
  expect(lesson).toMatchObject({
    capacity: 4,
    location: 'Complexe Sportif Longueuil',
    title: 'Tennis Lesson',
  });

  // Players 1-3 join: 1/4, 2/4, 3/4.
  expect((await joinLesson(db, p1.id, lesson.id)).registered_count).toBe(1);
  expect((await joinLesson(db, p2.id, lesson.id)).registered_count).toBe(2);
  expect((await joinLesson(db, p3.id, lesson.id)).registered_count).toBe(3);

  // Players 4 and 5 press JOIN at the same moment: exactly one gets 4/4.
  const [c4, c5] = [await connect(), await connect()];
  const race = await Promise.allSettled([
    joinLesson(c4, p4.id, lesson.id),
    joinLesson(c5, p5.id, lesson.id),
  ]);
  expect(race.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect((await getLesson(db, lesson.id)).registered_count).toBe(4);
  const latecomer = race[0].status === 'fulfilled' ? p5 : p4;

  // The player who lost the race tries again: still full.
  await expect(joinLesson(db, latecomer.id, lesson.id)).rejects.toThrow('LESSON_FULL');

  // Player 3 cancels with a private reason: 3/4.
  const cancelled = await cancelRegistration(db, p3.id, lesson.id, 'Family commitment');
  expect(cancelled).toMatchObject({ status: 'cancelled', registered_count: 3 });

  // Other players see 3 participants and never the reason.
  const seenByPlayer = await asUser(db, p1.id, (tx) =>
    tx.query(`select * from public.lesson_registrations where lesson_id = $1`, [lesson.id]),
  );
  expect(seenByPlayer.rows).toHaveLength(3);
  expect(JSON.stringify(seenByPlayer.rows)).not.toContain('Family commitment');

  // The coach sees the cancellation and its reason.
  const seenByCoach = await asUser(db, coach.id, (tx) =>
    tx.query(
      `select r.status, r.cancellation_reason, p.full_name
         from public.lesson_registrations r
         join public.profiles p on p.id = r.player_id
        where r.lesson_id = $1 and r.status = 'cancelled'`,
      [lesson.id],
    ),
  );
  expect(seenByCoach.rows).toEqual([
    { status: 'cancelled', cancellation_reason: 'Family commitment', full_name: 'Zdenek' },
  ]);

  // The latecomer takes the freed spot: 4/4 again.
  expect((await joinLesson(db, latecomer.id, lesson.id)).registered_count).toBe(4);
  expect((await getLesson(db, lesson.id)).registered_count).toBe(4);
});
