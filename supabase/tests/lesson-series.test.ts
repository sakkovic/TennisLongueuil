/**
 * Weekly series: occurrences share a series_id, and admin_update_lessons saves
 * several lessons in one all-or-nothing statement.
 */
import { randomUUID } from 'node:crypto';
import type { Client } from 'pg';

import { asUser, connect, createUser, disconnectAll } from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

interface SeriesLesson {
  id: string;
  start_time: Date;
  end_time: Date;
  court_count: number;
  registration_deadline: Date | null;
}

/** Inserts a 3-week series as the coach would, through the API. */
async function createSeries(coachId: string, seriesId = randomUUID()): Promise<SeriesLesson[]> {
  return asUser(db, coachId, async (tx) => {
    const { rows } = await tx.query<SeriesLesson>(
      `insert into public.lessons (series_id, start_time, end_time, registration_deadline)
       select $1::uuid,
              now() + make_interval(days => 2 + 7 * week),
              now() + make_interval(days => 2 + 7 * week, hours => 2),
              now() + make_interval(days => 2 + 7 * week, hours => -4)
         from generate_series(0, 2) as week
       returning id, start_time, end_time, court_count, registration_deadline`,
      [seriesId],
    );
    return rows.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
  });
}

function toPayload(lesson: SeriesLesson, changes: Record<string, unknown> = {}) {
  return {
    id: lesson.id,
    title: 'Tennis Lesson',
    description: null,
    start_time: lesson.start_time.toISOString(),
    end_time: lesson.end_time.toISOString(),
    location: 'Complexe Sportif Longueuil',
    court_count: lesson.court_count,
    player_level_id: null,
    registration_open: true,
    registration_deadline: lesson.registration_deadline?.toISOString() ?? null,
    ...changes,
  };
}

function updateLessons(userId: string, payload: unknown) {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ count: number }>(
      'select public.admin_update_lessons($1::jsonb) as count',
      [JSON.stringify(payload)],
    );
    return rows[0].count;
  });
}

describe('lesson series', () => {
  it('lets the coach group a series with a shared id', async () => {
    const coach = await createUser(db, 'Series Coach', { role: 'admin' });
    const seriesId = randomUUID();
    const lessons = await createSeries(coach.id, seriesId);

    const { rows } = await db.query(
      `select count(*)::int as count from public.lessons where series_id = $1`,
      [seriesId],
    );
    expect(lessons).toHaveLength(3);
    expect(rows[0].count).toBe(3);
  });

  it('does not let anyone move a lesson to another series', async () => {
    const coach = await createUser(db, 'Series Mover', { role: 'admin' });
    const [lesson] = await createSeries(coach.id);

    await expect(
      asUser(db, coach.id, (tx) =>
        tx.query(`update public.lessons set series_id = gen_random_uuid() where id = $1`, [
          lesson.id,
        ]),
      ),
    ).rejects.toThrow('permission denied');
  });
});

describe('admin_update_lessons', () => {
  it('updates every lesson in one call', async () => {
    const coach = await createUser(db, 'Bulk Coach', { role: 'admin' });
    const lessons = await createSeries(coach.id);

    const count = await updateLessons(
      coach.id,
      lessons.slice(1).map((lesson) => toPayload(lesson, { court_count: 2, location: 'Court B' })),
    );

    expect(count).toBe(2);
    const { rows } = await db.query(
      `select id, court_count, capacity, location from public.lessons where id = any($1) order by start_time`,
      [lessons.map((lesson) => lesson.id)],
    );
    expect(rows.map((row) => row.court_count)).toEqual([1, 2, 2]);
    expect(rows.map((row) => row.capacity)).toEqual([4, 8, 8]);
    expect(rows[2].location).toBe('Court B');
  });

  it('applies nothing when one lesson is invalid', async () => {
    const coach = await createUser(db, 'Careful Coach', { role: 'admin' });
    const lessons = await createSeries(coach.id);

    await expect(
      updateLessons(coach.id, [
        toPayload(lessons[0], { court_count: 3 }),
        toPayload(lessons[1], { court_count: 99 }),
      ]),
    ).rejects.toThrow('lessons_court_count_range');
    await expect(
      updateLessons(coach.id, [toPayload(lessons[0], { court_count: 3 }), { id: randomUUID() }]),
    ).rejects.toThrow();

    const { rows } = await db.query(`select court_count from public.lessons where id = $1`, [
      lessons[0].id,
    ]);
    expect(rows[0].court_count).toBe(1);
  });

  it('refuses players and empty or oversized input', async () => {
    const coach = await createUser(db, 'Guard Coach', { role: 'admin' });
    const player = await createUser(db, 'Bulk Player');
    const [lesson] = await createSeries(coach.id);

    await expect(updateLessons(player.id, [toPayload(lesson)])).rejects.toThrow('NOT_AUTHORIZED');
    await expect(updateLessons(coach.id, [])).rejects.toThrow('INVALID_INPUT');
    await expect(updateLessons(coach.id, { id: lesson.id })).rejects.toThrow('INVALID_INPUT');
    await expect(
      updateLessons(
        coach.id,
        Array.from({ length: 61 }, () => toPayload(lesson)),
      ),
    ).rejects.toThrow('INVALID_INPUT');
  });
});
