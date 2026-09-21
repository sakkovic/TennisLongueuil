This is an Expo/React Native mobile application (Tennis Longueuil) backed by Supabase. Prioritize mobile-first patterns, security, and cross-platform compatibility. See README.md for the architecture and business rules.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently SDK 57).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt. Prefer reading the installed package's type definitions in `node_modules` over memory.

Known SDK 57 specifics used here: `Tabs` comes from `expo-router/js-tabs`; React Navigation is vendored inside `expo-router` (import navigation types from `expo-router`); `@react-native-community/datetimepicker` v9 uses `onValueChange`; image resizing uses `ImageManipulator.manipulate()`.

## Project layout

- `app/` — Expo Router routes only (every file is a screen). `(auth)`, `(player)` and `admin/` groups are guarded by role in `app/_layout.tsx`.
- `src/` — everything else (components, features, lib, utils). Import with the `@/` alias.
- `supabase/migrations/` — the database is the source of truth. Security (RLS, grants, capacity) lives here, never only in the UI.
- Never add the Supabase service-role key to the app.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm install — resolves SDK-compatible versions
npx expo start              # start the dev server
npm run check               # typecheck + lint + prettier + unit tests
npm run test:db             # database tests (embedded PostgreSQL, no Docker)
npm run db:start            # local Supabase stack (Docker)
npm run db:types            # regenerate src/types/database.ts after a migration
npx expo-doctor             # diagnose dependency and config issues
```

Run `npm run check` and `npm run test:db` before declaring any task done.

## Rules

- Schema changes: add a new migration file in `supabase/migrations/`, add database tests in `supabase/tests/`, then regenerate types.
- `ios/` and `android/` are generated (Continuous Native Generation). Configure native behavior in `app.json`.
- Expo Go only includes its bundled native modules; the app currently runs in Expo Go. Adding a library with custom native code requires a development build.
