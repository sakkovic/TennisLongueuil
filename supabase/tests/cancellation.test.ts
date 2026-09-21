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

interface VisibleRegistration {
  player_id: string;
  status: string;
  cancellation_reason: string | null;
}

function readRegistrations(userId: string, lessonId: string) {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<VisibleRegistration>(
      `select player_id, status, cancellation_reason
         from public.lesson_registrations where lesson_id = $1`,
      [lessonId],
    );
    return rows;
  });
}

describe('cancel_registration', () => {
  it('cancels the registration, keeps it as history and frees the spot', async () => {
    const players = await createUsers(db, ['Ann', 'Ben', 'Cat', 'Dan', 'Eve']);
    const lesson = await createLesson(db, { courts: 1 });
    for (const player of players.slice(0, 4)) {
      await joinLesson(db, player.id, lesson.id);
    }
    await expect(joinLesson(db, players[4].id, lesson.id)).rejects.toThrow('LESSON_FULL');

    const result = await cancelRegistration(db, players[2].id, lesson.id, '  Family commitment  ');

    expect(result).toMatchObject({ success: true, status: 'cancelled', registered_count: 3 });
    const { rows } = await db.query(
      `select status, cancelled_at, cancellation_reason
         from public.lesson_registrations where lesson_id = $1 and player_id = $2`,
      [lesson.id, players[2].id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('cancelled');
    expect(rows[0].cancelled_at).not.toBeNull();
    expect(rows[0].cancellation_reason).toBe('Family commitment');
    expect((await getLesson(db, lesson.id)).registered_count).toBe(3);

    await expect(joinLesson(db, players[4].id, lesson.id)).resolves.toMatchObject({
      registered_count: 4,
    });
  });

  it('stores an empty reason as null', async () => {
    const player = await createUser(db, 'No Reason');
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);

    await cancelRegistration(db, player.id, lesson.id, '   ');

    const { rows } = await db.query(
      `select cancellation_reason from public.lesson_registrations where lesson_id = $1`,
      [lesson.id],
    );
    expect(rows[0].cancellation_reason).toBeNull();
  });

  it('rejects reasons longer than 500 characters', async () => {
    const player = await createUser(db, 'Verbose');
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);

    await expect(cancelRegistration(db, player.id, lesson.id, 'x'.repeat(501))).rejects.toThrow(
      'REASON_TOO_LONG',
    );
  });

  it("cannot cancel another player's registration", async () => {
    const owner = await createUser(db, 'Owner');
    const intruder = await createUser(db, 'Intruder');
    const lesson = await createLesson(db);
    await joinLesson(db, owner.id, lesson.id);

    // The RPC only ever targets the caller's own row.
    await expect(cancelRegistration(db, intruder.id, lesson.id)).rejects.toThrow('NOT_REGISTERED');

    // Direct table writes are not permitted at all.
    await expect(
      asUser(db, intruder.id, (tx) =>
        tx.query(
          `update public.lesson_registrations set status = 'cancelled', cancelled_at = now()
            where lesson_id = $1 and player_id = $2`,
          [lesson.id, owner.id],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, intruder.id, (tx) =>
        tx.query(`delete from public.lesson_registrations where lesson_id = $1`, [lesson.id]),
      ),
    ).rejects.toThrow(/permission denied/);

    expect(await countJoined(db, lesson.id)).toBe(1);
  });

  it('rejects cancelling when not registered or after the lesson started', async () => {
    const player = await createUser(db, 'Late');
    const lesson = await createLesson(db);
    await expect(cancelRegistration(db, player.id, lesson.id)).rejects.toThrow('NOT_REGISTERED');

    const started = await createLesson(db, { startsInHours: -0.25 });
    await expect(cancelRegistration(db, player.id, started.id)).rejects.toThrow('LESSON_STARTED');
  });

  it('lets a player re-join after cancelling, clearing the old reason', async () => {
    const player = await createUser(db, 'Comeback');
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);
    await cancelRegistration(db, player.id, lesson.id, 'Maybe not');

    await joinLesson(db, player.id, lesson.id);

    const { rows } = await db.query(
      `select status, cancelled_at, cancellation_reason
         from public.lesson_registrations where lesson_id = $1`,
      [lesson.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'joined',
      cancelled_at: null,
      cancellation_reason: null,
    });
  });
});

describe('cancellation privacy', () => {
  it('hides a cancellation reason from other players but shows it to the admin and the author', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const mohamed = await createUser(db, 'Mohamed');
    const maelys = await createUser(db, 'Maëlys');
    const lesson = await createLesson(db);
    await joinLesson(db, mohamed.id, lesson.id);
    await joinLesson(db, maelys.id, lesson.id);
    await cancelRegistration(db, maelys.id, lesson.id, 'Family commitment');

    const seenByPlayer = await readRegistrations(mohamed.id, lesson.id);
    expect(seenByPlayer.map((r) => r.player_id)).toEqual([mohamed.id]);
    expect(JSON.stringify(seenByPlayer)).not.toContain('Family commitment');

    const seenByAuthor = await readRegistrations(maelys.id, lesson.id);
    expect(seenByAuthor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          player_id: maelys.id,
          status: 'cancelled',
          cancellation_reason: 'Family commitment',
        }),
      ]),
    );

    const seenByAdmin = await readRegistrations(admin.id, lesson.id);
    expect(seenByAdmin).toHaveLength(2);
    expect(seenByAdmin.find((r) => r.player_id === maelys.id)).toMatchObject({
      status: 'cancelled',
      cancellation_reason: 'Family commitment',
    });
  });

  it('guarantees active registrations never carry a reason', async () => {
    const player = await createUser(db, 'Constraint');
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);

    await expect(
      db.query(
        `update public.lesson_registrations set cancellation_reason = 'secret' where lesson_id = $1`,
        [lesson.id],
      ),
    ).rejects.toThrow(/lesson_registrations_cancellation_consistency/);
  });
});
