import type { Client } from 'pg';

import {
  asUser,
  connect,
  countJoined,
  createLesson,
  createUser,
  createUsers,
  disconnectAll,
  getLesson,
  joinLesson,
  type TestUser,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

function createPlayers(count: number, prefix = 'Player'): Promise<TestUser[]> {
  return createUsers(
    db,
    Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`),
  );
}

describe('join_lesson', () => {
  it('lets a player join a lesson with available capacity', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db, { courts: 1 });

    const result = await joinLesson(db, player.id, lesson.id);

    expect(result).toMatchObject({
      success: true,
      status: 'joined',
      registered_count: 1,
      capacity: 4,
    });
    expect((await getLesson(db, lesson.id)).registered_count).toBe(1);
  });

  it('derives capacity from courts: 4 players per court', async () => {
    expect((await createLesson(db, { courts: 1 })).capacity).toBe(4);
    expect((await createLesson(db, { courts: 2 })).capacity).toBe(8);
    expect((await createLesson(db, { courts: 3 })).capacity).toBe(12);
  });

  it('rejects a second registration by the same player', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow('ALREADY_REGISTERED');
    expect(await countJoined(db, lesson.id)).toBe(1);
  });

  it('rejects joining a full lesson', async () => {
    const players = await createPlayers(5);
    const lesson = await createLesson(db, { courts: 1 });
    for (const player of players.slice(0, 4)) {
      await joinLesson(db, player.id, lesson.id);
    }

    await expect(joinLesson(db, players[4].id, lesson.id)).rejects.toThrow('LESSON_FULL');
    expect(await countJoined(db, lesson.id)).toBe(4);
  });

  it('rejects an inactive player', async () => {
    const player = await createUser(db, 'Inactive Player', { active: false });
    const lesson = await createLesson(db);

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow('ACCOUNT_INACTIVE');
  });

  it('rejects registrations for a cancelled lesson', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db, { status: 'cancelled' });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow('LESSON_CANCELLED');
  });

  it('rejects registrations when registration is closed', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db, { registrationOpen: false });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow('REGISTRATION_CLOSED');
  });

  it('rejects registrations after the registration deadline', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db, { startsInHours: 24, deadlineInHours: -1 });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow(
      'REGISTRATION_DEADLINE_PASSED',
    );
  });

  it('rejects registrations for a lesson that has already started', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db, { startsInHours: -0.5 });

    await expect(joinLesson(db, player.id, lesson.id)).rejects.toThrow('LESSON_STARTED');
  });

  it('rejects unknown lessons and anonymous callers', async () => {
    const [player] = await createPlayers(1);
    await expect(joinLesson(db, player.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      'LESSON_NOT_FOUND',
    );

    const lesson = await createLesson(db);
    await expect(
      asUser(db, null, (tx) => tx.query('select public.join_lesson($1)', [lesson.id])),
    ).rejects.toThrow(/permission denied/);
  });

  it('never lets a player register someone else: there is no player parameter and no direct insert', async () => {
    const [player, other] = await createPlayers(2);
    const lesson = await createLesson(db);

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query(`insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`, [
          lesson.id,
          other.id,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query(`insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`, [
          lesson.id,
          player.id,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);

    expect(await countJoined(db, lesson.id)).toBe(0);
  });

  it('does not let a player tamper with registered_count or capacity', async () => {
    const [player] = await createPlayers(1);
    const lesson = await createLesson(db);

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query(`update public.lessons set registered_count = 0 where id = $1`, [lesson.id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('join_lesson concurrency', () => {
  /**
   * Opens one connection per player, makes all of them wait behind a lock on
   * the lesson row, then releases the lock so every join competes at the
   * same instant.
   */
  async function raceToJoin(lessonId: string, players: TestUser[]) {
    const gate = await connect();
    const connections = await Promise.all(players.map(() => connect()));

    await gate.query('begin');
    await gate.query('select id from public.lessons where id = $1 for update', [lessonId]);

    const attempts = players.map((player, index) =>
      joinLesson(connections[index], player.id, lessonId),
    );

    // Give every attempt time to reach the lock, then open the gate.
    await new Promise((resolve) => setTimeout(resolve, 500));
    await gate.query('commit');

    return Promise.allSettled(attempts);
  }

  it('gives the last spot to exactly one of several simultaneous players', async () => {
    const early = await createPlayers(3, 'Early');
    const racers = await createPlayers(8, 'Racer');
    const lesson = await createLesson(db, { courts: 1 });
    for (const player of early) {
      await joinLesson(db, player.id, lesson.id);
    }

    const results = await raceToJoin(lesson.id, racers);

    const joined = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(joined).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const failure of rejected) {
      expect((failure.reason as Error).message).toBe('LESSON_FULL');
    }
    expect(await countJoined(db, lesson.id)).toBe(4);
    expect((await getLesson(db, lesson.id)).registered_count).toBe(4);
  });

  it('never exceeds capacity when many players join an empty lesson at once', async () => {
    const racers = await createPlayers(12, 'Stampede');
    const lesson = await createLesson(db, { courts: 2 });

    const results = await raceToJoin(lesson.id, racers);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(8);
    expect(await countJoined(db, lesson.id)).toBe(8);
    expect((await getLesson(db, lesson.id)).registered_count).toBe(8);
  });

  it('keeps a database-level guarantee even if a writer bypassed join_lesson', async () => {
    const players = await createPlayers(5, 'Bypass');
    const lesson = await createLesson(db, { courts: 1 });
    for (const player of players.slice(0, 4)) {
      await joinLesson(db, player.id, lesson.id);
    }

    // Superuser insert skipping the RPC: the registered_count check still refuses it.
    await expect(
      db.query(`insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`, [
        lesson.id,
        players[4].id,
      ]),
    ).rejects.toThrow(/lessons_registered_count_range/);
  });

  it('keeps that guarantee under concurrency, with no application lock at all', async () => {
    const players = await createPlayers(10, 'Raw');
    const lesson = await createLesson(db, { courts: 1 });
    const connections = await Promise.all(players.map(() => connect()));

    // Raw concurrent inserts that skip join_lesson (and its lock) entirely.
    const results = await Promise.allSettled(
      players.map((player, index) =>
        connections[index].query(
          `insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`,
          [lesson.id, player.id],
        ),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    expect(await countJoined(db, lesson.id)).toBe(4);
    expect((await getLesson(db, lesson.id)).registered_count).toBe(4);
  });
});
