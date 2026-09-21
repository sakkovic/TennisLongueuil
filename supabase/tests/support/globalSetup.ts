/**
 * Starts a throwaway PostgreSQL 17 server (embedded-postgres, no Docker needed),
 * applies the Supabase shim and every migration, and exposes its URL to the tests.
 *
 * To run the same tests against a local Supabase stack instead, run
 * `npx supabase db reset` and set TEST_DATABASE_URL, e.g.
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55522/postgres
 */
import EmbeddedPostgres from 'embedded-postgres';
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from 'pg';

const SUPABASE_DIR = path.resolve(__dirname, '..', '..');
const PORT = 55499;
const DATABASE = 'tennis_test';

declare global {
  var __EMBEDDED_PG__: EmbeddedPostgres | undefined;
}

export default async function globalSetup(): Promise<void> {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DB_TEST_URL = process.env.TEST_DATABASE_URL;
    return;
  }

  // A data directory without spaces: initdb on Windows fails on paths with spaces.
  const databaseDir = path.join(tmpdir(), `tennis-longueuil-db-test-${Date.now()}`);
  const server = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => undefined,
    onError: () => undefined,
  });

  await server.initialise();
  await server.start();
  await server.createDatabase(DATABASE);
  globalThis.__EMBEDDED_PG__ = server;

  const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DATABASE}`;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(readFileSync(path.join(__dirname, 'supabase-shim.sql'), 'utf8'));

    const migrationsDir = path.join(SUPABASE_DIR, 'migrations');
    const migrations = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of migrations) {
      try {
        await client.query(readFileSync(path.join(migrationsDir, file), 'utf8'));
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }

  process.env.DB_TEST_URL = url;
}
