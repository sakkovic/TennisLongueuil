/**
 * Database tests: run the Supabase migrations on a real PostgreSQL server and
 * verify business rules, RLS and concurrency. Run with `npm run test:db`.
 */
module.exports = {
  displayName: 'database',
  testEnvironment: 'node',
  roots: ['<rootDir>/supabase/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['babel-jest', { presets: [require.resolve('expo/internal/babel-preset')] }],
  },
  globalSetup: '<rootDir>/supabase/tests/support/globalSetup.ts',
  globalTeardown: '<rootDir>/supabase/tests/support/globalTeardown.ts',
  testTimeout: 60000,
};
