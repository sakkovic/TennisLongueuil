/**
 * upcoming_sessions(): the flyer-style slots shown before sign-in. Anonymous
 * users get the schedule and spots left, and nothing else.
 */
import type { Client } from 'pg';

import { asUser, connect, createLesson, createUser, disconnectAll, joinLesson } from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
  // Make these tests independent of lessons created by other suites.
  await db.query(`update public.lessons set status = 'completed' where status = 'scheduled'`);
});

afterAll(async () => {
  await disconnectAll();
});

async function sessionsAsAnon(limit?: number) {
  return asUser(db, null, async (tx) => {
    const { rows } = await tx.query(
      limit === undefined
        ? 'select * from public.upcoming_sessions()'
        : 'select * from public.upcoming_sessions($1)',
      limit === undefined ? [] : [limit],
    );
    return rows;
  });
}

it('shows anonymous visitors the next scheduled sessions with spots left', async () => {
  const soon = await createLesson(db, { startsInHours: 30, courts: 1 });
  const later = await createLesson(db, { startsInHours: 60, courts: 2 });
  await createLesson(db, { startsInHours: 40, status: 'cancelled' });
  await createLesson(db, { startsInHours: -2 });
  const player = await createUser(db, 'Public Player');
  await joinLesson(db, player.id, soon.id);

  const rows = await sessionsAsAnon();

  expect(rows.map((r) => r.id)).toEqual([soon.id, later.id]);
  expect(rows[0]).toMatchObject({ capacity: 4, registered_count: 1 });
  expect(rows[1]).toMatchObject({ capacity: 8, registered_count: 0 });
  // Only flyer information: no names or registration details.
  expect(Object.keys(rows[0]).sort()).toEqual(
    [
      'capacity',
      'end_time',
      'id',
      'location',
      'registered_count',
      'registration_closes_at',
      'start_time',
    ].sort(),
  );
  expect(JSON.stringify(rows)).not.toContain('Public Player');
});

it('reports when registration closes (4 hours before by default)', async () => {
  const lesson = await createLesson(db, { startsInHours: 90 });
  const { rows } = await db.query(
    `select start_time - registration_closes_at as lead
       from public.upcoming_sessions(6) where id = $1`,
    [lesson.id],
  );
  expect(rows[0].lead.hours).toBe(4);
});

it('caps the number of rows', async () => {
  for (let i = 0; i < 8; i += 1) await createLesson(db, { startsInHours: 100 + i });
  expect(await sessionsAsAnon(50)).toHaveLength(6);
  expect(await sessionsAsAnon(0)).toHaveLength(1);
});

it('still gives anonymous users no direct access to lessons', async () => {
  await expect(asUser(db, null, (tx) => tx.query('select id from public.lessons'))).rejects.toThrow(
    /permission denied/,
  );
});
