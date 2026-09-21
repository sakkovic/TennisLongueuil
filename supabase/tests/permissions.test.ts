import type { Client } from 'pg';

import {
  asUser,
  connect,
  createLesson,
  createUser,
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

async function levelId(name: string): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    'select id from public.player_levels where name = $1',
    [name],
  );
  return rows[0].id;
}

async function profile(userId: string) {
  const { rows } = await db.query(
    'select role, player_level_id, active, full_name, phone from public.profiles where id = $1',
    [userId],
  );
  return rows[0];
}

const lessonInsertSql = `
  insert into public.lessons (title, start_time, end_time, court_count)
  values ('New lesson', now() + interval '3 days', now() + interval '3 days 90 minutes', 1)
  returning id, capacity, location, created_by`;

describe('player levels', () => {
  it('seeds the initial levels in rank order', async () => {
    const { rows } = await db.query('select name from public.player_levels order by rank');
    expect(rows.map((r) => r.name)).toEqual([
      'Beginner',
      'Intermediate',
      'Advanced',
      'Competitive',
    ]);
  });

  it('prevents a player from changing their own level', async () => {
    const player = await createUser(db, 'Ambitious');
    const competitive = await levelId('Competitive');

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query('update public.profiles set player_level_id = $1 where id = $2', [
          competitive,
          player.id,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query('select public.admin_set_member_level($1, $2::smallint)', [
          player.id,
          competitive,
        ]),
      ),
    ).rejects.toThrow('NOT_AUTHORIZED');

    expect((await profile(player.id)).player_level_id).toBeNull();
  });

  it('lets the admin assign and clear a player level', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Student');
    const intermediate = await levelId('Intermediate');

    await asUser(db, admin.id, (tx) =>
      tx.query('select public.admin_set_member_level($1, $2::smallint)', [player.id, intermediate]),
    );
    expect((await profile(player.id)).player_level_id).toBe(intermediate);

    await asUser(db, admin.id, (tx) =>
      tx.query('select public.admin_set_member_level($1, null)', [player.id]),
    );
    expect((await profile(player.id)).player_level_id).toBeNull();
  });

  it('rejects unknown or inactive levels', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Student');
    await expect(
      asUser(db, admin.id, (tx) =>
        tx.query('select public.admin_set_member_level($1, 999::smallint)', [player.id]),
      ),
    ).rejects.toThrow('INVALID_LEVEL');
  });
});

describe('profiles', () => {
  it('prevents role escalation and self-activation', async () => {
    const player = await createUser(db, 'Sneaky');

    for (const sql of [
      `update public.profiles set role = 'admin' where id = $1`,
      `update public.profiles set active = true where id = $1`,
    ]) {
      await expect(asUser(db, player.id, (tx) => tx.query(sql, [player.id]))).rejects.toThrow(
        /permission denied/,
      );
    }
    expect((await profile(player.id)).role).toBe('player');
  });

  it('ignores a role smuggled into sign-up metadata', async () => {
    const user = await createUser(db, 'Smuggler', { metadata: { role: 'admin' } });
    expect((await profile(user.id)).role).toBe('player');
  });

  it('lets a player update their own name and phone, but not another member', async () => {
    const player = await createUser(db, 'Editor');
    const other = await createUser(db, 'Victim');

    await asUser(db, player.id, (tx) =>
      tx.query('update public.profiles set full_name = $1, phone = $2 where id = $3', [
        'Edited Name',
        '+1 514 555 0199',
        player.id,
      ]),
    );
    expect(await profile(player.id)).toMatchObject({
      full_name: 'Edited Name',
      phone: '+1 514 555 0199',
    });

    const result = await asUser(db, player.id, (tx) =>
      tx.query('update public.profiles set full_name = $1 where id = $2', ['Hacked', other.id]),
    );
    expect(result.rowCount).toBe(0);
    expect((await profile(other.id)).full_name).toBe('Victim');
  });

  it('only allows the avatar path of the member themselves', async () => {
    const player = await createUser(db, 'Photo');
    const other = await createUser(db, 'Other');

    await asUser(db, player.id, (tx) =>
      tx.query('update public.profiles set avatar_path = $1 where id = $2', [
        `${player.id}/profile.jpg`,
        player.id,
      ]),
    );
    await expect(
      asUser(db, player.id, (tx) =>
        tx.query('update public.profiles set avatar_path = $1 where id = $2', [
          `${other.id}/profile.jpg`,
          player.id,
        ]),
      ),
    ).rejects.toThrow(/profiles_avatar_path_owner/);
  });

  it("hides other members' phone numbers and emails from players", async () => {
    const player = await createUser(db, 'Curious');
    await createUser(db, 'Private');

    await expect(
      asUser(db, player.id, (tx) => tx.query('select phone from public.profiles')),
    ).rejects.toThrow(/permission denied/);

    const { rows } = await asUser(db, player.id, (tx) =>
      tx.query('select id, full_name, avatar_path, player_level_id from public.profiles'),
    );
    expect(rows.length).toBeGreaterThan(1);

    await expect(
      asUser(db, player.id, (tx) => tx.query('select * from public.admin_list_members()')),
    ).rejects.toThrow('NOT_AUTHORIZED');
  });

  it('returns the caller’s own full profile through get_my_profile', async () => {
    const player = await createUser(db, 'Self');
    const { rows } = await asUser(db, player.id, (tx) =>
      tx.query('select * from public.get_my_profile()'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: player.id,
      email: player.email,
      role: 'player',
      active: true,
    });
  });

  it('lets the admin list members with contact details', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Listed');

    const { rows } = await asUser(db, admin.id, (tx) =>
      tx.query('select * from public.admin_list_members($1)', [player.id]),
    );
    expect(rows).toEqual([expect.objectContaining({ id: player.id, email: player.email })]);
  });
});

describe('account activation', () => {
  it('lets the admin deactivate a player, releasing their upcoming spots', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Leaving');
    const lesson = await createLesson(db);
    await joinLesson(db, player.id, lesson.id);

    const { rows } = await asUser(db, admin.id, (tx) =>
      tx.query('select public.admin_set_member_active($1, false) as result', [player.id]),
    );

    expect(rows[0].result).toMatchObject({ active: false, cancelled_registrations: 1 });
    expect((await profile(player.id)).active).toBe(false);
    expect((await getLesson(db, lesson.id)).registered_count).toBe(0);

    // An inactive member can no longer see lessons.
    const visible = await asUser(db, player.id, (tx) => tx.query('select id from public.lessons'));
    expect(visible.rowCount).toBe(0);
  });

  it('prevents players from changing account state and admins from locking themselves out', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const player = await createUser(db, 'Player');

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query('select public.admin_set_member_active($1, false)', [admin.id]),
      ),
    ).rejects.toThrow('NOT_AUTHORIZED');

    await expect(
      asUser(db, admin.id, (tx) =>
        tx.query('select public.admin_set_member_active($1, false)', [admin.id]),
      ),
    ).rejects.toThrow('CANNOT_DEACTIVATE_SELF');
  });
});

describe('lessons', () => {
  it('prevents players from creating, editing or deleting lessons', async () => {
    const player = await createUser(db, 'Player');
    const lesson = await createLesson(db);

    await expect(asUser(db, player.id, (tx) => tx.query(lessonInsertSql))).rejects.toThrow(
      /row-level security/,
    );

    const update = await asUser(db, player.id, (tx) =>
      tx.query(`update public.lessons set status = 'cancelled' where id = $1`, [lesson.id]),
    );
    expect(update.rowCount).toBe(0);
    expect((await getLesson(db, lesson.id)).status).toBe('scheduled');

    await expect(
      asUser(db, player.id, (tx) =>
        tx.query('delete from public.lessons where id = $1', [lesson.id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('lets the admin create a lesson with defaults and derived capacity', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });

    const { rows } = await asUser(db, admin.id, (tx) => tx.query(lessonInsertSql));

    expect(rows[0]).toMatchObject({
      capacity: 4,
      location: 'Complexe Sportif Longueuil',
      created_by: admin.id,
    });
  });

  it('lets the admin edit and cancel a lesson', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const lesson = await createLesson(db, { courts: 1 });

    await asUser(db, admin.id, (tx) =>
      tx.query(
        `update public.lessons set court_count = 2, title = 'Doubles clinic' where id = $1`,
        [lesson.id],
      ),
    );
    expect(await getLesson(db, lesson.id)).toMatchObject({ capacity: 8, title: 'Doubles clinic' });

    await asUser(db, admin.id, (tx) =>
      tx.query(`update public.lessons set status = 'cancelled' where id = $1`, [lesson.id]),
    );
    expect((await getLesson(db, lesson.id)).status).toBe('cancelled');
  });

  it('does not let the admin reduce courts below the registered players', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const lesson = await createLesson(db, { courts: 2 });
    for (let i = 0; i < 5; i += 1) {
      const player = await createUser(db, `Doubles ${i}`);
      await joinLesson(db, player.id, lesson.id);
    }

    await expect(
      asUser(db, admin.id, (tx) =>
        tx.query('update public.lessons set court_count = 1 where id = $1', [lesson.id]),
      ),
    ).rejects.toThrow(/lessons_registered_count_range/);
  });

  it('validates lesson data in the database', async () => {
    const admin = await createUser(db, 'Coach', { role: 'admin' });
    const cases: [string, RegExp][] = [
      [
        `insert into public.lessons (start_time, end_time) values (now() + interval '2 days', now() + interval '1 day')`,
        /lessons_time_order/,
      ],
      [
        `insert into public.lessons (start_time, end_time, court_count) values (now() + interval '1 day', now() + interval '1 day 1 hour', 0)`,
        /lessons_court_count_range/,
      ],
      [
        `insert into public.lessons (start_time, end_time, registration_deadline) values (now() + interval '1 day', now() + interval '1 day 1 hour', now() + interval '2 days')`,
        /lessons_deadline_before_start/,
      ],
      [
        `insert into public.lessons (start_time, end_time, title) values (now() + interval '1 day', now() + interval '1 day 1 hour', '  ')`,
        /lessons_title_length/,
      ],
    ];
    for (const [sql, error] of cases) {
      await expect(asUser(db, admin.id, (tx) => tx.query(sql))).rejects.toThrow(error);
    }
  });

  it('gives anonymous users no access to any table', async () => {
    for (const table of ['lessons', 'profiles', 'lesson_registrations', 'player_levels']) {
      await expect(
        asUser(db, null, (tx) => tx.query(`select 1 from public.${table}`)),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('avatar storage policies', () => {
  it('lets a member upload only their own avatar object', async () => {
    const player = await createUser(db, 'Uploader');
    const other = await createUser(db, 'Someone');

    await asUser(db, player.id, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [
        `${player.id}/profile.jpg`,
      ]),
    );

    for (const name of [`${other.id}/profile.jpg`, `${player.id}/other-file.jpg`, 'profile.jpg']) {
      await expect(
        asUser(db, player.id, (tx) =>
          tx.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [name]),
        ),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it('configures the avatars bucket with size and type limits', async () => {
    const { rows } = await db.query(`select * from storage.buckets where id = 'avatars'`);
    expect(rows[0]).toMatchObject({
      public: true,
      file_size_limit: '2097152',
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    });
  });
});
