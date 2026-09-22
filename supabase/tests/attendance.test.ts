/**
 * Attendance: the coach marks registered players present or absent. Only the
 * coach and the player concerned can see it.
 */
import type { Client } from 'pg';

import {
  asUser,
  connect,
  createLesson,
  createUser,
  disconnectAll,
  type TestUser,
} from './support/db';

let db: Client;

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await disconnectAll();
});

/** Registers a player directly (setup only), so past lessons can have players. */
async function register(lessonId: string, player: TestUser): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2) returning id`,
    [lessonId, player.id],
  );
  return rows[0].id;
}

function setAttendance(userId: string, registrationId: string, status: string | null) {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query(
      'select public.admin_set_attendance($1, $2::public.attendance_status) as result',
      [registrationId, status],
    );
    return rows[0].result;
  });
}

async function attendanceOf(registrationId: string): Promise<string | null> {
  const { rows } = await db.query<{ status: string }>(
    `select status from public.lesson_attendance where registration_id = $1`,
    [registrationId],
  );
  return rows[0]?.status ?? null;
}

describe('admin_set_attendance', () => {
  it('lets the coach mark, change and clear attendance', async () => {
    const coach = await createUser(db, 'Roll Call Coach', { role: 'admin' });
    const player = await createUser(db, 'Present Player');
    const lesson = await createLesson(db, { startsInHours: -2 });
    const registrationId = await register(lesson.id, player);

    await expect(setAttendance(coach.id, registrationId, 'present')).resolves.toMatchObject({
      success: true,
      attendance: 'present',
    });
    expect(await attendanceOf(registrationId)).toBe('present');

    await setAttendance(coach.id, registrationId, 'absent');
    expect(await attendanceOf(registrationId)).toBe('absent');

    await setAttendance(coach.id, registrationId, null);
    expect(await attendanceOf(registrationId)).toBeNull();
  });

  it('opens 30 minutes before the lesson', async () => {
    const coach = await createUser(db, 'Early Coach', { role: 'admin' });
    const [early, soon] = [
      await createUser(db, 'Early Player'),
      await createUser(db, 'Soon Player'),
    ];
    const tomorrow = await createLesson(db, { startsInHours: 24 });
    const inTwentyMinutes = await createLesson(db, { startsInHours: 0.33 });

    await expect(
      setAttendance(coach.id, await register(tomorrow.id, early), 'present'),
    ).rejects.toThrow('ATTENDANCE_NOT_OPEN');
    await expect(
      setAttendance(coach.id, await register(inTwentyMinutes.id, soon), 'present'),
    ).resolves.toMatchObject({ success: true });
  });

  it('only applies to registered players of lessons that took place', async () => {
    const coach = await createUser(db, 'Strict Coach', { role: 'admin' });
    const player = await createUser(db, 'Cancelled Player');
    const lesson = await createLesson(db, { startsInHours: -2 });
    const registrationId = await register(lesson.id, player);
    await db.query(
      `update public.lesson_registrations set status = 'cancelled', cancelled_at = now() where id = $1`,
      [registrationId],
    );

    await expect(setAttendance(coach.id, registrationId, 'present')).rejects.toThrow(
      'NOT_REGISTERED',
    );

    const cancelledLesson = await createLesson(db, { startsInHours: -2, status: 'cancelled' });
    const other = await createUser(db, 'Other Player');
    await expect(
      setAttendance(coach.id, await register(cancelledLesson.id, other), 'present'),
    ).rejects.toThrow('LESSON_CANCELLED');
  });

  it('refuses players', async () => {
    const player = await createUser(db, 'Self Marker');
    const lesson = await createLesson(db, { startsInHours: -2 });
    const registrationId = await register(lesson.id, player);

    await expect(setAttendance(player.id, registrationId, 'present')).rejects.toThrow(
      'NOT_AUTHORIZED',
    );
    await expect(
      asUser(db, player.id, (tx) =>
        tx.query(
          `insert into public.lesson_attendance (registration_id, player_id, status)
           values ($1, $2, 'present')`,
          [registrationId, player.id],
        ),
      ),
    ).rejects.toThrow('permission denied');
  });
});

describe('attendance privacy', () => {
  it('is visible to the coach and the player, not to other players', async () => {
    const coach = await createUser(db, 'Private Coach', { role: 'admin' });
    const absent = await createUser(db, 'Absent Player');
    const other = await createUser(db, 'Nosy Player');
    const lesson = await createLesson(db, { startsInHours: -2 });
    const registrationId = await register(lesson.id, absent);
    await register(lesson.id, other);
    await setAttendance(coach.id, registrationId, 'absent');

    const read = (userId: string) =>
      asUser(db, userId, async (tx) => {
        const { rows } = await tx.query(
          `select status from public.lesson_attendance where registration_id = $1`,
          [registrationId],
        );
        return rows;
      });

    await expect(read(coach.id)).resolves.toEqual([{ status: 'absent' }]);
    await expect(read(absent.id)).resolves.toEqual([{ status: 'absent' }]);
    await expect(read(other.id)).resolves.toEqual([]);
  });
});
