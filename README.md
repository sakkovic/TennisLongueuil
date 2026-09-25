# SaKKa.Tennis

A small, private mobile app for organising group tennis lessons at **Complexe Sportif Longueuil**, with coach Sakka Mohamed Anis (CP1): 120-minute sessions, $45/hour plus court fees shared between players.

The coach creates lessons. Players see them, join with one tap, see who else is coming, and can cancel (optionally telling the coach why). Capacity (4 players per court) is enforced atomically by the database, so a lesson can never be overbooked, even when two players tap **Join** at the same moment.

- **Players**: sign up (the coach approves the account before it works), upcoming lessons, lesson details, join/cancel, participant list, Bookings (upcoming + history), profile with photo and level badge.
- **Coach (admin)**: approve new sign-ups, create/edit/cancel lessons, registrations and private cancellation reasons, members, player levels, account activation.
- Built for about 10–15 players and one coach, on iOS and Android, in English and French.
- **Club rules** (enforced by the database): players can join until the lesson **starts** (the coach can close registration earlier); players can cancel until **24 hours** before.

### Branding

- Four colours only — ink `#1A231C`, tennis green `#7CB342`, lime `#D7F23F`, white — in `src/constants/theme.ts`. Plus Jakarta Sans is the interface font; Playfair Display (the logo's serif) is the wordmark only.
- The home screens open with a flyer-style landing (`src/features/home/SessionPoster.tsx`): emblem over a court drawing, the wordmark, "120-minute sessions", the location, the next sessions with spots left, the price and one big call to action. Visitors see it before signing in (`app/(auth)/welcome.tsx`), players on Home, and the coach on the coach home.
- The club offer (coach, CP1, session length, price) lives in `src/constants/brand.ts`.
- App icon, Android adaptive icon, splash and the in-app emblem (`assets/brand/emblem.png`) use the green emblem on ink. Rebuild them with `python scripts/generate-brand-icons.py`.

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
├── account-status.tsx       Loading / waiting for approval / inactive account / profile errors
├── reset-password.tsx       "Choose a new password" after a reset link or code
├── (auth)/                  welcome (flyer landing), login, sign-up, forgot-password
├── (player)/                Player app
│   └── (tabs)/              Home · Lessons · Bookings · Profile (each tab has its own stack)
└── admin/                   Coach app (URL prefix /admin)
    └── (tabs)/              Home · Lessons · Members · Profile (create/edit/history and member details live in the tab stacks)

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
   - Turn **on** "Allow new users to sign up". Players create their own account in the app, but it stays **pending** until you approve it, so sign-up on its own gives access to nothing (see "Accounts and authentication" below).
   - Keep the **Email** provider **enabled** (members sign in with email and password).
   - Leave "Confirm email" **off** for the smoothest flow: the player goes straight to the "Waiting for approval" screen. If you turn it on, the app asks them to confirm their address first.
4. **Authentication → Email provider settings** used by the app:
   - **Password requirements**: "Lowercase, uppercase letters and digits". Set **Minimum password length** to **8** to match the app's rules.
   - **Require current password when updating** and **Secure password change** can stay on. The app asks for the current password and signs the member in again before changing it, which satisfies both.
5. **Authentication → URL Configuration → Redirect URLs**: add `tennislongueuil://**` (installed app) and `exp://**` (Expo Go). Password-reset emails contain a link that opens the app on "Choose a new password". Without these entries the link opens a broken web page. Players should open the email **on their phone**.
6. **Email delivery (important):** Supabase's built-in email service only delivers to members of your Supabase organization, and is heavily rate-limited. Players will **not** receive password-reset emails until you configure your own SMTP server (**Authentication → Emails → SMTP Settings**; e.g. Resend, Brevo, or a Gmail app password). With custom SMTP you can also use `supabase/templates/recovery.html` as the Reset Password template (link **and** code). Until then, the coach can set a temporary password (see "Reset a player's password" below).
7. Put the project URL and publishable key in `.env`, then start the app with `npx expo start --clear` (`--clear` makes sure the new values are used).

### Create the first admin (coach)

The first account has to be promoted from outside the app, because there is no admin yet to approve it.

1. Create the account: either sign up in the app with the coach's email, or Dashboard → **Authentication → Users → Add user → Create new user** (tick **Auto Confirm User**). Either way the profile starts as a pending `player`.
2. Dashboard → **SQL Editor**, run:
   ```sql
   update public.profiles
      set role = 'admin', active = true, approved_at = now(), full_name = 'Coach Name'
    where id = (select id from auth.users where email = 'coach@example.com');
   ```
3. Sign in to the app with that account. You land in the coach app.

The role can **only** be changed like this (by the project owner). It is never read from sign-up data, and no app user, admin or player, can change a role through the API.

### Add players

Players add themselves: **Create an account** on the login screen (name, email, password). The new account is **pending**, so they see "Waiting for approval" and can read nothing else until you let them in.

To approve someone: coach app → **Members**. Pending sign-ups appear in a **Waiting for approval** section at the top, with a banner counting them. Open the person, check the name and email, then tap **Approve member**. They tap **Check again** (or restart the app) and land in the player app. Assign their level from the same screen, before or after approving.

Deactivating an approved member is separate: it switches the account off and frees their spots in lessons that have not started. The coach can reactivate it later, and the app keeps telling the two apart ("Pending" vs "Inactive").

You can still create accounts yourself in Dashboard → **Authentication → Users → Add user** (email + temporary password, **Auto Confirm User**); they show up as pending sign-ups to approve. Members change their password in **Profile → Change password** (they need their current one) or with **Forgot your password?** on the login screen.

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

**Demo accounts** (local only, password `Tennis2026!`): `coach@tennis.local` (admin), `mohamed@`, `alice@`, `zdenek@`, `maelys@`, `samuel@tennis.local`. `julie@tennis.local` is left **pending** so you can try the approval flow from both sides. Password-reset emails appear in the local inbox at `http://127.0.0.1:55524`.

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

### Before the first build

1. **Apply the migrations to the hosted project**: `npx supabase db push`.
2. **Deploy the account-deletion function** (it needs the service-role key, which stays on the server):
   ```bash
   npx supabase functions deploy delete-account
   ```
   Nothing else to configure: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function by Supabase.
3. **Turn on an email provider** in the Supabase dashboard (Authentication → SMTP). The built-in email only reaches members of your Supabase organisation, so password resets never arrive for real players without it.

### Store checklist

- **Privacy policy** and **account deletion** pages live in `docs/`. Publish them with GitHub Pages (Settings → Pages → branch `main`, folder `/docs`), then give the two URLs to Apple and Google. Replace the `[club contact email]` placeholders first.
- **Account deletion inside the app** (required by both stores): Profile → Delete my account. A coach account is refused by the function on purpose, so the club never loses its lessons — delete it from the Supabase dashboard instead.
- **Review account**: give Apple an approved _player_ login, because new sign-ups stay pending until the coach approves them.
- **Google Play**, for a personal developer account: a closed test with at least 12 testers for 14 days before production. The club's own players satisfy that.
- The app collects no location, no advertising identifier and no analytics; the data-safety form is names, emails, optional phone and photo, and lesson history.

---

## How it works

### Accounts and authentication

- Email + password with Supabase Auth. Anyone can **sign up**, but every new account is created **pending**: `active = false` and `approved_at = null`, set by a database trigger that ignores whatever the client sends. A pending account can read its own profile and nothing else — no lessons, no member list, no registrations — and `join_lesson` rejects it. The coach approves it in **Members**, which is the only thing that sets `active = true`. So sign-up is open, but the club's data stays private.
- `approved_at` separates the two reasons an account can be unusable: never approved yet ("Waiting for approval") versus approved then deactivated ("Your account is inactive"). Reactivating keeps the original approval date.
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

- Default title "Tennis Lesson", default location **Complexe Sportif Longueuil** (stored per lesson, so other locations are possible), default length 120 minutes.
- **Weekly series:** the coach can repeat a lesson every week (same weekday, time and courts) for 2–26 weeks. The series is created in one insert (all or nothing) and its lessons share a `series_id`. Each week is still its own lesson, but when the coach edits or cancels one, the app asks: **this lesson only**, or **this and the following ones**. A series edit keeps the same wall-clock time every week (daylight saving included) and is saved by `admin_update_lessons` in a single statement, so it applies to every lesson or to none.
- **No double booking:** when a new lesson (or some weeks of a series) would land on a time and place that is already booked, those weeks are skipped by default; "Create anyway" is the exception.
- **Registration:** players are welcome until the lesson starts, as long as there is a spot. The coach can close registration earlier for a given lesson (1 h, 2 h, 4 h, 12 h or 1 day before). `join_lesson` enforces both.
- `capacity` is a generated column: **`court_count × 4`**. The app only displays it.
- `join_lesson(p_lesson_id)` runs entirely in PostgreSQL. It identifies the player with `auth.uid()`, checks the account, lesson status, start time, registration open/deadline and duplicates, then **locks the lesson row** (`FOR NO KEY UPDATE`). While the lock is held it counts active registrations and inserts or reactivates the registration. Concurrent joins queue on the lock, so exactly one player gets the last spot. The others receive `LESSON_FULL`, which the app shows as "Sorry, this lesson has just become full."
- As a second safety net, `lessons.registered_count` is maintained by a trigger and protected by a `CHECK (registered_count <= court_count * 4)`. Even a write that bypassed `join_lesson` could not overbook a lesson. The same check stops the coach from reducing courts below the current registrations.
- The app never shows a registration optimistically. The **Join** button shows a spinner and is disabled until the database answers.

### Private lessons

- The coach can make any lesson **private** and pick the players it is for (one or several, up to the number of spots). The switch and the player list are in the lesson form, so a private lesson can also be a weekly series: the same guests are invited to every occurrence.
- A private lesson is **invisible to everyone else**: it is absent from the lessons list, from the public flyer and from a shared link, and its registrations cannot be read by other members. The share button is hidden for it.
- Invited players are **registered right away**, so their spot is kept. They can cancel like for any other lesson, and join again while a spot is free. A player taken off the guest list loses their spot; a player who cancelled themselves is not re-registered when the coach edits the lesson.
- Enforced in the database by the `lessons` and `lesson_registrations` RLS policies, by a trigger that refuses a registration from a player who is not invited (whatever path it takes: join, waitlist or automatic promotion), and by `upcoming_sessions()`, which never returns a private lesson. `admin_set_lesson_invites()` is the only way to change a guest list.

### Waitlist

- When a lesson is full, players can **join the waitlist** (`join_waitlist`). Everyone sees who is waiting and in which order; the app shows each player their place ("You're #2 in line").
- When a spot opens, the **first player in line is moved in automatically**, in the same transaction and under the same lesson lock as `join_lesson`, so capacity still holds under concurrency. A spot opens when a player cancels, when the coach deactivates a registered player, or when the coach adds courts or reopens registration. Promotion happens in database triggers, so every path is covered.
- Automatic promotion stops 4 hours before the lesson (or when registration closes): nobody is moved in at the last minute without knowing it. After that, a free spot goes to whoever joins first, waiting players included.
- A promoted player sees "A spot opened, you're in!" on their home screen and lesson, and the app schedules their reminder. Leaving the waitlist is possible until the lesson starts (it frees no spot).
- Deactivating an account also takes the player off every waitlist.

### Attendance

- From 30 minutes before a lesson, the coach's lesson screen turns the player list into a roll call: **Present / Absent** for each registered player (tap again to clear). `admin_set_attendance` checks the coach role, the timing and that the player was registered.
- Attendance lives in its own table (`lesson_attendance`) so it stays private: only the coach and the player concerned can read it. Players see "Present" or "Absent" in their history; the coach sees "3/4 present" in History and "Attended 8 of 10 lessons" on each member.

### Sharing

- Any lesson can be **shared** (share icon on the lesson screen): the message has the date, place, spots left and a link that opens the lesson in the app.

### Cancellations

- **Cancellation deadline:** a player can cancel until 24 hours before the lesson (`cancel_registration` returns `CANCELLATION_DEADLINE_PASSED` after that). The lesson screen shows until when cancelling is possible. The coach can still free a spot by deactivating an account.
- Cancelling sets `status = 'cancelled'`, `cancelled_at` and the optional `cancellation_reason`. Rows are **never deleted**, so history is kept. Re-joining reactivates the same row and clears the old reason.
- Lessons are cancelled by status too (and can be reinstated). They are never deleted.
- Deactivating a player cancels their registrations for lessons that have not started, so the spots are freed.

### Realtime

Every join, cancel or waitlist change updates the lesson row (`registered_count`, `waitlist_count`). Screens showing lessons subscribe to the `lessons` table (one row on the details screen) **only while the screen is focused**, and unsubscribe on blur or unmount. Counts, participant lists and full/available state then refresh live. Realtime applies RLS, and the lesson row contains no private data.

### Languages

The app is **French first**: it starts in French unless the phone is set to English, and members can switch in their profile. Every screen, validation message and server error is available in both languages (`src/i18n/strings.ts`, `src/i18n/validation.ts`, `src/utils/errors.ts`).

### Dates and times

Times are stored as `timestamptz` (absolute instants) and displayed in the phone's local time zone, for example "Monday, September 21 · 6:00 PM – 7:30 PM". The lesson form builds dates from local calendar components, so daylight-saving changes are handled correctly. This is covered by tests around the November 1, 2026 change.

---

## Security (Row Level Security)

RLS is enabled on every table. The app's UI guards are only for convenience; **every rule below is enforced by PostgreSQL**. Anonymous users have no access to anything.

| Table / object                                        | Players                                                                                                                                                                                                | Coach (admin)                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `player_levels`                                       | Read                                                                                                                                                                                                   | Read (levels are managed by migrations)                                                          |
| `profiles`                                            | Read public identity columns (name, photo, level, role) of members. Read own full profile via `get_my_profile()`. Update **only** own `full_name`, `phone`, `avatar_path` (column-level grants + RLS). | Everything above, plus contact details via `admin_list_members()`. Level and activation via RPC. |
| `lessons`                                             | Read (active members only); a **private** lesson only if invited                                                                                                                                       | Read, create, update (incl. cancel). No delete for anyone.                                       |
| `lesson_registrations`                                | Read own rows (incl. own reason) and other players' **joined and waitlisted** rows only, and only for a lesson they can see. No direct writes.                                                         | Read all rows, including cancellation reasons.                                                   |
| `lesson_invites`                                      | Read only the invitations addressed to them. No direct writes.                                                                                                                                         | Read all; write through `admin_set_lesson_invites()`.                                            |
| `lesson_attendance`                                   | Read own attendance only. No direct writes.                                                                                                                                                            | Read all; write through `admin_set_attendance()`.                                                |
| `join_lesson`, `join_waitlist`, `cancel_registration` | Only for themselves (`auth.uid()`); no user id parameter exists                                                                                                                                        | Same                                                                                             |
| `admin_update_lessons()`                              | Rejected with `NOT_AUTHORIZED`                                                                                                                                                                         | Saves several lessons at once (series edit). Runs with the caller's own RLS and column grants.   |
| `admin_*` functions                                   | Rejected with `NOT_AUTHORIZED`                                                                                                                                                                         | Allowed (cannot deactivate own account)                                                          |
| `upcoming_sessions()`                                 | Anyone, even signed out: the next 3–6 scheduled sessions (time, location, capacity, spots taken). No names or registrations. Powers the welcome flyer.                                                 | Same                                                                                             |
| `avatars` bucket                                      | Write only `avatars/<own user id>/profile.jpg` (JPEG/PNG/WebP, max 2 MB). Photos are readable by URL.                                                                                                  | Same (no access to other members' files)                                                         |

Key design points:

- **Private cancellation reasons:** other players can only see `joined` rows, and a CHECK constraint guarantees a `joined` row never carries a reason. Only the author and the coach can ever read one.
- **Other members' phone numbers and emails** are not selectable by players (column privileges). The coach reads them through a function.
- **No role escalation and no self-approval:** `role`, `player_level_id`, `active` and `approved_at` have no UPDATE grant for app users, so no member can activate themselves whatever they send. The profile trigger always creates a pending `player` and reads only `full_name` from sign-up metadata. `admin_set_member_active` is the single path to `active = true`, and it checks that the caller is an active admin.
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
- **Private lessons** (`private-lessons.test.ts`): only invited players (and the coach) can see the lesson, its registrations and its invitations; nobody else can join it even with the lesson id; guests are registered on invitation and lose their spot when taken off the list; a cancelled registration is not resurrected; private lessons never reach the public flyer.
- **Waitlist, attendance and series** (`waitlist.test.ts`, `attendance.test.ts`, `lesson-series.test.ts`): first-come promotion on cancellation, deactivation and added courts; no promotion after registration closes; inactive players skipped; latecomers never take a freed spot from the waitlist; attendance timing, roles and privacy; all-or-nothing series updates and immutable `series_id`.
- **Sign-up approval** (`supabase/tests/signup-approval.test.ts`): a new account is always a pending `player` whatever the sign-up metadata claims; a pending member sees no lessons, members or registrations, cannot join, and cannot approve themselves directly or through the admin function; only the coach approves, which records `approved_at` and unlocks joining; reactivating keeps the original approval date.
- To run the database tests against the local Docker stack instead: `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55522/postgres npm run test:db`, then `npm run db:reset` to clean up.

---

## Ready for later (not built yet)

- **Push notifications** (Expo push service): "a spot opened, you're in", new lesson, lesson changed/cancelled. Today the app tells a promoted player the next time they open it, and lesson reminders are local notifications. Remote push needs a development/EAS build (Expo Go on Android does not support it), device push tokens stored per member, and a Supabase Edge Function or database webhook that sends the message when `promoted_at` is set.
- **Court-fee split:** show each player's share of the court fee ("$12 each with 4 players"). It needs the club's court price per hour.
- **Invite links and rejecting sign-ups:** today anyone can create a pending account and the coach approves it; there is no way to decline one other than leaving it pending. Invitation links (or a "decline" action that removes the auth user) would need a Supabase Edge Function holding the service-role key server-side.
