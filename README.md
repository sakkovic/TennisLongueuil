# Tennis Longueuil

A small, private mobile app for organising group tennis lessons at **Complexe Sportif Longueuil**.

The coach creates lessons. Players see them, join with one tap, see who else is coming, and can cancel (optionally telling the coach why). Capacity (4 players per court) is enforced atomically by the database, so a lesson can never be overbooked, even when two players tap **Join** at the same moment.

- **Players**: upcoming lessons, lesson details, join/cancel, participant list, "My Lessons" (upcoming + history), profile with photo and level badge.
- **Coach (admin)**: create/edit/cancel lessons, registrations and private cancellation reasons, members, player levels, account activation.
- Built for about 10–15 players and one coach, on iOS and Android.

---

## Tech stack

| Layer          | Choice                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Mobile app     | React Native 0.86 + **Expo SDK 57**, TypeScript (strict), **Expo Router**                      |
| Server state   | **TanStack Query** (cache, refetch, invalidation)                                              |
| Forms          | **React Hook Form** + **Zod**                                                                  |
| Backend        | **Supabase**: Auth, PostgreSQL 17, Row Level Security, RPC functions, Realtime, Storage        |
| Secure storage | Session stored in the iOS Keychain / Android Keystore via **expo-secure-store**                |
| Tests          | Jest + React Native Testing Library; database tests on a real PostgreSQL (`embedded-postgres`) |

There is no custom backend server. Supabase is the backend and the source of truth.

---

## Architecture

```text
app/                         Expo Router routes (screens only)
├── _layout.tsx              Providers + role-based route guards
├── account-status.tsx       Loading / inactive account / profile errors
├── reset-password.tsx       "Choose a new password" after a reset link or code
├── (auth)/                  login, forgot-password
├── (player)/                Player app
│   ├── (tabs)/              Home · My Lessons · Profile
│   ├── lesson/[id].tsx      Lesson details (join, cancel, participants)
│   └── edit-profile.tsx, change-password.tsx
└── admin/                   Coach app (URL prefix /admin)
    ├── (tabs)/              Home · Lessons · Members · Profile
    ├── lesson/new.tsx, lesson/[id].tsx, lesson/edit/[id].tsx
    └── member/[id].tsx

src/
├── components/              Shared UI: Button, TextField, Card, CapacityIndicator, ParticipantList,
│                            PlayerAvatar, LevelBadge/StatusBadge, ConfirmationModal, EmptyState…
├── constants/               Theme tokens, lesson rules (4 players/court, default location), config
├── features/
│   ├── auth/                AuthProvider (session + profile + app status), sign-in/reset API
│   ├── lessons/             Queries, realtime hook, availability rules, LessonCard, LessonForm
│   ├── registrations/       join/cancel RPC calls, My Lessons logic, RegistrationRow
│   ├── profile/             Profile screen, PlayerProfileCard, avatar upload
│   ├── members/             Admin member management
│   └── levels/              Player levels (read from the database)
├── lib/                     Supabase client, chunked SecureStore adapter, QueryClient
├── types/                   database.ts (generated), domain models
└── utils/                   Dates (DST-safe), capacity text, friendly error messages

supabase/
├── config.toml              Local stack config (mirrors the hosted auth settings)
├── migrations/              Reproducible schema, RLS, RPC functions, storage, realtime
├── seed.sql                 Local demo data (never pushed to production)
├── templates/recovery.html  Password-reset email with a link and a code (needs custom SMTP when hosted)
└── tests/                   Database tests: capacity, concurrency, RLS, privacy
```

**Why the admin area lives under `app/admin/` rather than an `(admin)` group:** route groups don't change URLs, so `(player)/lesson/[id]` and `(admin)/lesson/[id]` would both claim `/lesson/:id`. The `/admin` prefix keeps every URL unique.

---

## Prerequisites

- **Node.js 20 or newer** (developed with Node 24) and npm.
- **Expo Go** on your phone (App Store / Google Play) for quick testing. No Xcode or Android Studio needed.
- A **Supabase** project (free tier is enough), or Docker Desktop to run Supabase locally.

## Install

```bash
npm install
```

## Environment variables

Copy the example and fill in your project's values (Supabase Dashboard → **Project Settings → API Keys**):

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Use the **publishable** key (a legacy `anon` key also works). Both are designed to be public; security comes from RLS.
- **Never** put the `service_role` / secret key in the app or in any `EXPO_PUBLIC_*` variable.
- `.env` and `.env*.local` are git-ignored. Restart Expo with `npx expo start --clear` after changing them.

---

## Supabase setup (hosted project)

1. **Create a project** at [supabase.com](https://supabase.com). Choose the **Canada (Central)** region to keep data in Québec.
2. **Apply the migrations:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This creates every table, constraint, trigger, RPC function, RLS policy, grant, the `avatars` bucket, the Realtime publication and the four initial player levels. `seed.sql` is **not** pushed.
3. **Authentication → Sign In / Providers**
   - Turn **off** "Allow new users to sign up" (private club: the coach creates accounts).
   - Keep the **Email** provider **enabled** (members sign in with email and password).
4. **Authentication → Email provider settings** used by the app:
   - **Password requirements**: "Lowercase, uppercase letters and digits". Set **Minimum password length** to **8** to match the app's rules.
   - **Require current password when updating** and **Secure password change** can stay on. The app asks for the current password and signs the member in again before changing it, which satisfies both.
5. **Authentication → URL Configuration → Redirect URLs**: add `tennislongueuil://**` (installed app) and `exp://**` (Expo Go). Password-reset emails contain a link that opens the app on "Choose a new password". Without these entries the link opens a broken web page. Players should open the email **on their phone**.
6. **Email delivery (important):** Supabase's built-in email service only delivers to members of your Supabase organization, and is heavily rate-limited. Players will **not** receive password-reset emails until you configure your own SMTP server (**Authentication → Emails → SMTP Settings**; e.g. Resend, Brevo, or a Gmail app password). With custom SMTP you can also use `supabase/templates/recovery.html` as the Reset Password template (link **and** code). Until then, the coach can set a temporary password (see "Reset a player's password" below).
7. Put the project URL and publishable key in `.env`, then start the app with `npx expo start --clear` (`--clear` makes sure the new values are used).

### Create the first admin (coach)

1. Dashboard → **Authentication → Users → Add user → Create new user**. Enter the coach's email and a password, and tick **Auto Confirm User**. A profile is created automatically with the role `player`.
2. Dashboard → **SQL Editor**, run:
   ```sql
   update public.profiles
      set role = 'admin', full_name = 'Coach Name'
    where id = (select id from auth.users where email = 'coach@example.com');
   ```
3. Sign in to the app with that account. You land in the coach app.

The role can **only** be changed like this (by the project owner). It is never read from sign-up data, and no app user, admin or player, can change a role through the API.

### Add players

Dashboard → **Authentication → Users → Add user** (email + temporary password, **Auto Confirm User**). Give the player their credentials. They can:

- change their password in **Profile → Change password** (they need their current password), or
- use **Forgot your password?** on the login screen and tap the link in the email (requires custom SMTP, see above).

New players appear immediately in the coach's **Members** tab, where the coach assigns their level. Players can edit their own name, phone and photo.

### Reset a player's password (without email)

In **SQL Editor**, set a temporary password and give it to the player, who then changes it in **Profile → Change password**:

```sql
update auth.users
   set encrypted_password = extensions.crypt('Temporary2026', extensions.gen_salt('bf')),
       updated_at = now()
 where email = 'player@example.com';
```

The temporary password must follow the password rules (8+ characters, uppercase, lowercase and a digit).

---

## Local development with Docker (optional)

Everything also runs locally against a full Supabase stack:

```bash
npm run db:start      # npx supabase start (first run downloads the Docker images)
npm run db:reset      # re-applies all migrations + loads demo data from supabase/seed.sql
```

The local stack uses ports **55520–55529** (e.g. API `http://127.0.0.1:55521`, email inbox `http://127.0.0.1:55524`), so it can run alongside other local Supabase projects. `npx supabase status` prints the local URL and publishable key.

Point the app at it with `.env.local`. For Expo Go on a phone, use your computer's LAN IP address, not `127.0.0.1`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://192.168.x.x:55521
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from `npx supabase status`>
```

**Demo accounts** (local only, password `Tennis2026!`): `coach@tennis.local` (admin), `mohamed@`, `alice@`, `zdenek@`, `maelys@`, `samuel@tennis.local`. Password-reset emails appear in the local inbox at `http://127.0.0.1:55524`.

After changing a migration, regenerate the TypeScript types:

```bash
npm run db:types
```

---

## Run the app

```bash
npx expo start
```

- **Expo Go**: scan the QR code with your phone's camera (iOS) or the Expo Go app (Android). The phone and computer must be on the same network (or run `npx expo start --tunnel`).
- **Android emulator**: press `a` (needs Android Studio).
- **iOS simulator**: press `i` (needs macOS + Xcode).
- **Web**: press `w`. Handy for quick checks; the app is designed for mobile.

## Build for Android and iOS

Cloud builds with EAS need no Android Studio or Xcode:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
# Build-time configuration (EXPO_PUBLIC_* values are embedded in the app)
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project-ref.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --visibility plaintext
# (repeat for --environment preview)

npx eas-cli@latest build --platform android --profile preview      # installable APK for testing
npx eas-cli@latest build --platform android --profile production   # Play Store bundle
npx eas-cli@latest build --platform ios --profile production       # App Store build
npx eas-cli@latest submit --platform ios                           # upload to App Store Connect
```

Local native builds are also possible: `npx expo run:android` (Android Studio) and `npx expo run:ios` (macOS + Xcode). The bundle identifier / package is `ca.tennislongueuil.app` (change it in `app.json` before publishing).

---

## How it works

### Accounts and authentication

- Email + password with Supabase Auth. **Public sign-up is disabled**; the coach creates every account.
- The session is stored encrypted in the Keychain/Keystore (`expo-secure-store`). It is split into chunks because SecureStore values must stay under about 2 KB.
- On launch: session → profile → active? → role → player app or coach app. Inactive accounts see "Your account is inactive" and cannot read any data (enforced by RLS).
- Forgot password: the member requests a reset email and taps its link on their phone. The app opens on "Choose a new password" with a short-lived recovery session. If the email contains a code (custom template), it can be typed instead.
- Change password: the member enters their current password; the app signs in again with it, then updates the password.
- Password rules (checked in the app and enforced by Supabase Auth): at least 8 characters, with uppercase and lowercase letters and a digit.

### Player levels

- Levels live in the `player_levels` table (Beginner, Intermediate, Advanced, Competitive), ordered by `rank`. The app reads them from the database, so new levels need no app update. Badge colours follow the rank.
- **Only the coach can assign a level**, through the `admin_set_member_level` function. Players cannot update `player_level_id` at all: the database grants them UPDATE on `full_name`, `phone` and `avatar_path` only.
- Levels are informational in V1. A lesson can show a target level ("Intermediate" or "All levels"), but joining is never blocked by level.

### Lessons and capacity

- Default title "Tennis Lesson", default location **Complexe Sportif Longueuil** (stored per lesson, so other locations are possible).
- `capacity` is a generated column: **`court_count × 4`**. The app only displays it.
- `join_lesson(p_lesson_id)` runs entirely in PostgreSQL. It identifies the player with `auth.uid()`, checks the account, lesson status, start time, registration open/deadline and duplicates, then **locks the lesson row** (`FOR NO KEY UPDATE`). While the lock is held it counts active registrations and inserts or reactivates the registration. Concurrent joins queue on the lock, so exactly one player gets the last spot. The others receive `LESSON_FULL`, which the app shows as "Sorry, this lesson has just become full."
- As a second safety net, `lessons.registered_count` is maintained by a trigger and protected by a `CHECK (registered_count <= court_count * 4)`. Even a write that bypassed `join_lesson` could not overbook a lesson. The same check stops the coach from reducing courts below the current registrations.
- The app never shows a registration optimistically. The **Join** button shows a spinner and is disabled until the database answers.

### Cancellations

- Cancelling sets `status = 'cancelled'`, `cancelled_at` and the optional `cancellation_reason`. Rows are **never deleted**, so history is kept. Re-joining reactivates the same row and clears the old reason.
- Lessons are cancelled by status too (and can be reinstated). They are never deleted.
- Deactivating a player cancels their registrations for lessons that have not started, so the spots are freed.

### Realtime

Every join or cancel updates the lesson row (`registered_count`). Screens showing lessons subscribe to the `lessons` table (one row on the details screen) **only while the screen is focused**, and unsubscribe on blur or unmount. Counts, participant lists and full/available state then refresh live. Realtime applies RLS, and the lesson row contains no private data.

### Dates and times

Times are stored as `timestamptz` (absolute instants) and displayed in the phone's local time zone, for example "Monday, September 21 · 6:00 PM – 7:30 PM". The lesson form builds dates from local calendar components, so daylight-saving changes are handled correctly. This is covered by tests around the November 1, 2026 change.

---

## Security (Row Level Security)

RLS is enabled on every table. The app's UI guards are only for convenience; **every rule below is enforced by PostgreSQL**. Anonymous users have no access to anything.

| Table / object                       | Players                                                                                                                                                                                                | Coach (admin)                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `player_levels`                      | Read                                                                                                                                                                                                   | Read (levels are managed by migrations)                                                          |
| `profiles`                           | Read public identity columns (name, photo, level, role) of members. Read own full profile via `get_my_profile()`. Update **only** own `full_name`, `phone`, `avatar_path` (column-level grants + RLS). | Everything above, plus contact details via `admin_list_members()`. Level and activation via RPC. |
| `lessons`                            | Read (active members only)                                                                                                                                                                             | Read, create, update (incl. cancel). No delete for anyone.                                       |
| `lesson_registrations`               | Read own rows (incl. own reason) and other players' **active** rows only. No direct writes.                                                                                                            | Read all rows, including cancellation reasons.                                                   |
| `join_lesson`, `cancel_registration` | Only for themselves (`auth.uid()`); no user id parameter exists                                                                                                                                        | Same                                                                                             |
| `admin_*` functions                  | Rejected with `NOT_AUTHORIZED`                                                                                                                                                                         | Allowed (cannot deactivate own account)                                                          |
| `avatars` bucket                     | Write only `avatars/<own user id>/profile.jpg` (JPEG/PNG/WebP, max 2 MB). Photos are readable by URL.                                                                                                  | Same (no access to other members' files)                                                         |

Key design points:

- **Private cancellation reasons:** other players can only see `joined` rows, and a CHECK constraint guarantees a `joined` row never carries a reason. Only the author and the coach can ever read one.
- **Other members' phone numbers and emails** are not selectable by players (column privileges). The coach reads them through a function.
- **No role escalation:** `role`, `player_level_id` and `active` have no UPDATE grant for app users. The profile trigger always creates `player` and ignores sign-up metadata.
- **SECURITY DEFINER functions** (`join_lesson`, `cancel_registration`, `get_my_profile`, `admin_*`) exist because members have no direct write access. Each one sets `search_path = ''`, uses fully qualified names, derives the caller from `auth.uid()`, re-checks the role, and is executable by `authenticated` only. Internal helpers live in a `private` schema that the API does not expose.
- The service-role key is never used by the app.

All policies are commented in `supabase/migrations/20260921000200_security.sql`.

---

## Tests and quality checks

```bash
npm run check        # TypeScript + ESLint + Prettier + unit/component tests
npm run test:db      # database tests on a throwaway PostgreSQL 17 (no Docker needed)
```

- **Unit/component tests** (`src/**/__tests__`): capacity text and plurals, lesson availability rules, DST-safe dates, friendly error mapping, lesson form validation, My Lessons split, chunked secure storage, `LessonCard` and `CapacityIndicator` states.
- **Database tests** (`supabase/tests`) run the real migrations and cover: joining, duplicates, full lessons, **simultaneous joins never exceeding capacity** (including raw concurrent inserts that bypass the function), cancellation freeing a spot, cancellation privacy, players unable to cancel for others, change their level or role, or create lessons, admin lesson and level management, inactive accounts, cancelled lessons, closed registration and deadlines, storage policies, and the full acceptance scenario.
- To run the database tests against the local Docker stack instead: `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55522/postgres npm run test:db`, then `npm run db:reset` to clean up.

---

## Ready for later (not built yet)

- **Waitlist:** add `waitlisted` to the `registration_status` enum. Capacity logic only counts `joined` rows, so nothing else changes. Promotion could then run inside `cancel_registration`, under the same lock.
- **Push notifications** (Expo Notifications): new lesson, reminder, lesson changed/cancelled, spot available. Lesson changes already produce database events.
- **In-app member invitations:** would need a Supabase Edge Function holding the service-role key server-side. Today the coach adds members in the Supabase dashboard.
