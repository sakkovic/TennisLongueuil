/**
 * Helpers for database tests.
 *
 * `asUser` runs queries exactly like a request from the app: inside a
 * transaction, as the "authenticated" role, with the user's id in the JWT
 * claims that auth.uid() reads. RLS, column privileges and function grants
 * all apply. Setup helpers use the superuser connection and bypass them.
 */
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

export type Role = 'player' | 'admin';

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface LessonRow {
  id: string;
  title: string;
  capacity: number;
  registered_count: number;
  court_count: number;
  status: string;
}

const openClients = new Set<Client>();

export async function connect(): Promise<Client> {
  const url = process.env.DB_TEST_URL;
  if (!url) throw new Error('DB_TEST_URL is not set. Run the tests with `npm run test:db`.');
  const client = new Client({ connectionString: url });
  await client.connect();
  openClients.add(client);
  return client;
}

export async function disconnectAll(): Promise<void> {
  await Promise.all([...openClients].map((client) => client.end()));
  openClients.clear();
}

/**
 * Creates an auth user; the on_auth_user_created trigger creates the profile.
 *
 * The trigger always leaves a new account PENDING (inactive, never approved),
 * like a real sign-up. Most tests want an ordinary approved member, so that is
 * the default here. Pass `pending: true` for a sign-up nobody has approved yet,
 * or `active: false` for an account the coach approved and then switched off.
 */
export async function createUser(
  db: Client,
  name: string,
  options: {
    role?: Role;
    active?: boolean;
    pending?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<TestUser> {
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${randomUUID().slice(0, 8)}@test.local`;
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`,
    [email, JSON.stringify({ full_name: name, ...options.metadata })],
  );
  const id = rows[0].id;
  const pending = options.pending ?? false;
  const active = pending ? false : (options.active ?? true);
  await db.query(
    `update public.profiles
        set role = $2::public.user_role,
            active = $3,
            approved_at = case when $4 then null else now() end
      where id = $1`,
    [id, options.role ?? 'player', active, pending],
  );
  return { id, email, name };
}

/** The raw profile row, for assertions about role / active / approved_at. */
export async function getProfile(
  db: Client,
  userId: string,
): Promise<{ role: Role; active: boolean; approved_at: Date | null; full_name: string }> {
  const { rows } = await db.query(
    `select role, active, approved_at, full_name from public.profiles where id = $1`,
    [userId],
  );
  return rows[0];
}

/** Simulates a sign-up: Supabase Auth inserts the user, the trigger does the rest. */
export async function signUp(
  db: Client,
  name: string,
  metadata: Record<string, unknown> = {},
): Promise<TestUser> {
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${randomUUID().slice(0, 8)}@test.local`;
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`,
    [email, JSON.stringify({ full_name: name, ...metadata })],
  );
  return { id: rows[0].id, email, name };
}

/** Creates users one after another (a pg client runs one query at a time). */
export async function createUsers(db: Client, names: string[]): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (const name of names) {
    users.push(await createUser(db, name));
  }
  return users;
}

export async function createLesson(
  db: Client,
  options: {
    courts?: number;
    startsInHours?: number;
    durationMinutes?: number;
    registrationOpen?: boolean;
    deadlineInHours?: number | null;
    status?: 'scheduled' | 'cancelled' | 'completed';
    title?: string;
  } = {},
): Promise<LessonRow> {
  const startsInHours = options.startsInHours ?? 48;
  const { rows } = await db.query<LessonRow>(
    `insert into public.lessons
       (title, start_time, end_time, court_count, registration_open, registration_deadline, status)
     values (
       $1,
       now() + make_interval(mins => ($2::numeric * 60)::int),
       now() + make_interval(mins => ($2::numeric * 60)::int + $3::int),
       $4, $5,
       case when $6::numeric is null then null else now() + make_interval(mins => ($6::numeric * 60)::int) end,
       $7::public.lesson_status
     )
     returning id, title, capacity, registered_count, court_count, status`,
    [
      options.title ?? 'Test Lesson',
      startsInHours,
      options.durationMinutes ?? 90,
      options.courts ?? 1,
      options.registrationOpen ?? true,
      options.deadlineInHours ?? null,
      options.status ?? 'scheduled',
    ],
  );
  return rows[0];
}

export async function getLesson(db: Client, lessonId: string): Promise<LessonRow> {
  const { rows } = await db.query<LessonRow>(
    `select id, title, capacity, registered_count, court_count, status from public.lessons where id = $1`,
    [lessonId],
  );
  return rows[0];
}

export async function countJoined(db: Client, lessonId: string): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `select count(*) from public.lesson_registrations where lesson_id = $1 and status = 'joined'`,
    [lessonId],
  );
  return Number(rows[0].count);
}

/** Runs `fn` as the given user (or anonymously when userId is null), like an API request. */
export async function asUser<T>(
  db: Client,
  userId: string | null,
  fn: (db: Client) => Promise<T>,
): Promise<T> {
  await db.query('begin');
  try {
    await db.query(`set local role ${userId ? 'authenticated' : 'anon'}`);
    const claims = userId
      ? { sub: userId, role: 'authenticated', aud: 'authenticated' }
      : { role: 'anon' };
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    const result = await fn(db);
    await db.query('commit');
    return result;
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}

export interface RpcResult {
  success: boolean;
  status: string;
  registered_count: number;
  capacity: number;
}

export function joinLesson(db: Client, userId: string, lessonId: string): Promise<RpcResult> {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ result: RpcResult }>(
      'select public.join_lesson($1) as result',
      [lessonId],
    );
    return rows[0].result;
  });
}

export function cancelRegistration(
  db: Client,
  userId: string,
  lessonId: string,
  reason?: string,
): Promise<RpcResult> {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ result: RpcResult }>(
      'select public.cancel_registration($1, $2) as result',
      [lessonId, reason ?? null],
    );
    return rows[0].result;
  });
}

export interface WaitlistResult extends RpcResult {
  waitlist_position: number | null;
}

export function joinWaitlist(
  db: Client,
  userId: string,
  lessonId: string,
): Promise<WaitlistResult> {
  return asUser(db, userId, async (tx) => {
    const { rows } = await tx.query<{ result: WaitlistResult }>(
      'select public.join_waitlist($1) as result',
      [lessonId],
    );
    return rows[0].result;
  });
}

/** Each player's registration status for a lesson, keyed by player id. */
export async function registrationStatuses(
  db: Client,
  lessonId: string,
): Promise<Record<string, string>> {
  const { rows } = await db.query<{ player_id: string; status: string }>(
    `select player_id, status from public.lesson_registrations where lesson_id = $1`,
    [lessonId],
  );
  return Object.fromEntries(rows.map((row) => [row.player_id, row.status]));
}
