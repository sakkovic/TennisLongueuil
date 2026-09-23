/**
 * Private lessons: the coach picks the players, and nobody else can see the
 * lesson or join it.
 */
import type { Client } from 'pg';

import {
  asUser,
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

async function createPrivateLesson(options: { courts?: number; startsInHours?: number } = {}) {
  const lesson = await createLesson(db, options);
  await db.query(`update public.lessons set is_private = true where id = $1`, [lesson.id]);
  return lesson;
}

function setInvites(coachId: string, lessonIds: string[], playerIds: string[]) {
  return asUser(db, coachId, async (tx) => {
    const { rows } = await tx.query(
      'select public.admin_set_lesson_invites($1::uuid[], $2::uuid[]) as result',
      [lessonIds, playerIds],
    );
    return rows[0].result;
  });
}

/** The lessons a member can actually read, through RLS. */
function visibleLessons(userId: string) {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ id: string }>('select id from public.lessons');
    return rows.map((row) => row.id);
  });
}

async function setup(courts = 1) {
  const coach = await createUser(db, 'Private Coach', { role: 'admin' });
  const [guest, other] = await createUsers(db, ['Invited Player', 'Other Player']);
  const lesson = await createPrivateLesson({ courts });
  return { coach, guest, other, lesson };
}

describe('who can see a private lesson', () => {
  it('shows it to the invited players and the coach only', async () => {
    const { coach, guest, other, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    expect(await visibleLessons(guest.id)).toContain(lesson.id);
    expect(await visibleLessons(other.id)).not.toContain(lesson.id);
    expect(await visibleLessons(coach.id)).toContain(lesson.id);
  });

  it('hides its registrations from members who are not invited', async () => {
    const { coach, guest, other, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    const seen = await asUser(db, other.id, async (tx) => {
      const { rows } = await tx.query(
        'select player_id from public.lesson_registrations where lesson_id = $1',
        [lesson.id],
      );
      return rows;
    });
    expect(seen).toEqual([]);

    // The invited player sees the roster of their own lesson.
    const own = await asUser(db, guest.id, async (tx) => {
      const { rows } = await tx.query(
        'select player_id from public.lesson_registrations where lesson_id = $1',
        [lesson.id],
      );
      return rows;
    });
    expect(own).toHaveLength(1);
  });

  it('keeps it out of the public flyer', async () => {
    const { coach, guest, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    const { rows } = await db.query('select id from public.upcoming_sessions(6)');
    expect(rows.map((row) => row.id)).not.toContain(lesson.id);
  });

  it('only lets players read their own invitations', async () => {
    const { coach, guest, other, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    const readInvites = (userId: string) =>
      asUser(db, userId, async (tx) => {
        const { rows } = await tx.query(
          'select player_id from public.lesson_invites where lesson_id = $1',
          [lesson.id],
        );
        return rows.map((row) => row.player_id);
      });

    expect(await readInvites(guest.id)).toEqual([guest.id]);
    expect(await readInvites(other.id)).toEqual([]);
    expect(await readInvites(coach.id)).toEqual([guest.id]);
  });
});

describe('joining a private lesson', () => {
  it('registers the invited players right away', async () => {
    const { coach, guest, lesson } = await setup(2);
    const second = await createUser(db, 'Second Guest');

    await expect(setInvites(coach.id, [lesson.id], [guest.id, second.id])).resolves.toMatchObject({
      invited: 2,
      registered: 2,
    });
    expect(await countJoined(db, lesson.id)).toBe(2);
  });

  it('refuses everyone else, even with the lesson id', async () => {
    const { coach, guest, other, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    await expect(joinLesson(db, other.id, lesson.id)).rejects.toThrow('NOT_INVITED');
    await expect(joinWaitlist(db, other.id, lesson.id)).rejects.toThrow('NOT_INVITED');
    await expect(
      asUser(db, other.id, (tx) =>
        tx.query(`insert into public.lesson_registrations (lesson_id, player_id) values ($1, $2)`, [
          lesson.id,
          other.id,
        ]),
      ),
    ).rejects.toThrow('permission denied');
  });

  it('lets an invited player cancel and join again', async () => {
    const { coach, guest, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);

    await asUser(db, guest.id, (tx) =>
      tx.query('select public.cancel_registration($1, $2)', [lesson.id, 'Busy']),
    );
    expect(await countJoined(db, lesson.id)).toBe(0);

    await expect(joinLesson(db, guest.id, lesson.id)).resolves.toMatchObject({ status: 'joined' });
  });

  it('does not bring back a registration the player cancelled', async () => {
    const { coach, guest, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);
    await asUser(db, guest.id, (tx) =>
      tx.query('select public.cancel_registration($1, $2)', [lesson.id, 'Busy']),
    );

    await setInvites(coach.id, [lesson.id], [guest.id]);
    expect((await registrationStatuses(db, lesson.id))[guest.id]).toBe('cancelled');
  });
});

describe('changing the guest list', () => {
  it('frees the spot of a player taken off the list', async () => {
    const { coach, guest, lesson } = await setup(2);
    const dropped = await createUser(db, 'Dropped Guest');
    await setInvites(coach.id, [lesson.id], [guest.id, dropped.id]);

    await expect(setInvites(coach.id, [lesson.id], [guest.id])).resolves.toMatchObject({
      removed: 1,
    });
    const statuses = await registrationStatuses(db, lesson.id);
    expect(statuses[dropped.id]).toBe('cancelled');
    expect(statuses[guest.id]).toBe('joined');
    expect(await visibleLessons(dropped.id)).not.toContain(lesson.id);
  });

  it('applies the same guests to a whole series', async () => {
    const { coach, guest } = await setup();
    const [first, second] = [await createPrivateLesson(), await createPrivateLesson()];

    await setInvites(coach.id, [first.id, second.id], [guest.id]);

    const visible = await visibleLessons(guest.id);
    expect(visible).toEqual(expect.arrayContaining([first.id, second.id]));
  });

  it('opens the lesson to everyone when it stops being private', async () => {
    const { coach, guest, other, lesson } = await setup();
    await setInvites(coach.id, [lesson.id], [guest.id]);
    await db.query(`update public.lessons set is_private = false where id = $1`, [lesson.id]);

    await expect(setInvites(coach.id, [lesson.id], [])).resolves.toMatchObject({ removed: 0 });
    expect((await registrationStatuses(db, lesson.id))[guest.id]).toBe('joined');
    expect(await visibleLessons(other.id)).toContain(lesson.id);
    await expect(joinLesson(db, other.id, lesson.id)).resolves.toMatchObject({ status: 'joined' });
  });
});

describe('admin_set_lesson_invites guards', () => {
  it('refuses players, unknown players and oversized guest lists', async () => {
    const { coach, guest, other, lesson } = await setup();
    const inactive = await createUser(db, 'Inactive Guest', { active: false });
    const extra = await createUsers(db, ['Extra A', 'Extra B', 'Extra C', 'Extra D']);

    await expect(setInvites(other.id, [lesson.id], [other.id])).rejects.toThrow('NOT_AUTHORIZED');
    await expect(setInvites(coach.id, [lesson.id], [inactive.id])).rejects.toThrow(
      'INVALID_PLAYER',
    );
    await expect(setInvites(coach.id, [lesson.id], [coach.id])).rejects.toThrow('INVALID_PLAYER');
    await expect(setInvites(coach.id, [lesson.id], [])).rejects.toThrow('NO_PLAYERS_INVITED');
    await expect(
      setInvites(coach.id, [lesson.id], [guest.id, ...extra.map((player: TestUser) => player.id)]),
    ).rejects.toThrow('TOO_MANY_PLAYERS');
    await expect(setInvites(coach.id, [], [guest.id])).rejects.toThrow('INVALID_INPUT');
  });

  it('never lets a player write an invitation', async () => {
    const { guest, lesson } = await setup();
    await expect(
      asUser(db, guest.id, (tx) =>
        tx.query(`insert into public.lesson_invites (lesson_id, player_id) values ($1, $2)`, [
          lesson.id,
          guest.id,
        ]),
      ),
    ).rejects.toThrow('permission denied');
  });
});
