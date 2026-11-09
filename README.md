# PlanYá

PlanYá helps people in La Araucanía, Chile (Temuco and Pucón first) discover local plans, find people to
do them with, and join. Explorers browse and join plans and chat with hosts; hosts publish and manage plans.

| Folder | What | Stack |
|---|---|---|
| `app/` | Mobile app for Android and iOS | React Native + Expo SDK 58, TypeScript strict, Expo Router, TanStack Query |
| `admin/` | Web admin panel *(Stage 3, not created yet)* | React + Vite + TypeScript |
| `supabase/` | Database migrations, RLS, functions, seed, tests | Supabase (Postgres 17 + PostGIS) |
| `docs/` | Project docs (data inventory, …) | |

## Requirements

- Node.js 22+
- An Expo account with access to the client's EAS project (for builds)
- Access to the client's Supabase project
- A real Android phone and a real iPhone for acceptance tests (maps and push need a development build, not Expo Go)

## 1. Database (Supabase)

All schema changes live in `supabase/migrations`. Never edit tables by hand in production.

```bash
# Link the CLI to the client's project (once)
npx supabase login
npx supabase link --project-ref <project-ref>

# Apply migrations
npx supabase db push

# Development/preview projects only: load seed data (20 plans in Temuco/Pucón, places, categories)
npx supabase db push --include-seed
```

After linking, configure in the Supabase dashboard (these are not in migrations):

1. **Auth → Email templates → Reset password**: paste `supabase/templates/recovery.html`
   (the app uses the 6-digit `{{ .Token }}` code, not a link).
2. **Auth → Providers → Email**: minimum password length 8, "letters and digits"
   (matches `supabase/config.toml`). Decide with Davi whether "Confirm email" stays on;
   the app supports both.
3. **Auth → SMTP**: configure a real SMTP sender before inviting testers (the built-in one is rate limited).

### Database tests (no Docker needed)

The tests run the real migrations + seed inside PGlite (Postgres + PostGIS compiled to WASM) and check
every RLS policy, guard and function with several users.

```bash
cd supabase/tests && npm install && npm test     # or from the root: npm run db:test
```

### Test accounts and the last-seat race test

Copy `.env.example` to `.env` at the repo root and fill in the Supabase URL, anon key, service role key and
test account credentials (never commit `.env`). Then:

```bash
npm install
npm run db:test-users   # creates/updates explorer, explorer 2, host and admin accounts
npm run db:race         # two explorers race for the last seat 10 times; exactly one must win each time
```

Run `db:race` only against a development/preview project.

### Making someone an admin

Admins are never self-selected. In the SQL editor:
`update public.profiles set role = 'admin' where id = '<user uuid>';`

## 2. Mobile app

```bash
cd app
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm start                # needs a development build installed on the phone (see below)
```

### Environment variables (`app/.env`, and EAS environment variables for builds)

| Name | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | app bundle | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app bundle | **Anon key only.** The service role key must never be in the app. |
| `EAS_PROJECT_ID` | build time | From the client's Expo project |
| `GOOGLE_MAPS_ANDROID_API_KEY` | build time | Maps SDK for Android, restricted to the package + signing fingerprints |

### Design preview (no Supabase needed)

For design reviews and screenshots: a fake signed-in explorer ("Catalina", Temuco) with the 20 seed plans,
8 places and 10 categories, placeholder photos and simulated seats/ratings. Development only (never in builds).

```bash
cd app
npm run preview -- --web     # or `npm run preview` and open in a development build
npm run preview -- --web --host   # signed in as a demo host: "Mis planes", publish, edit, hide, cancel
```

Preview data lives in memory: a full page reload resets it.

Data comes from the real migrations + seed via PGlite; regenerate after changing `supabase/seed.sql`:
`npm run preview:fixtures` (root). On web the maps are a static OpenStreetMap preview; phones use
Google Maps (Android, needs `GOOGLE_MAPS_ANDROID_API_KEY`) / Apple Maps (iOS).

### Quality checks

```bash
cd app
npm run typecheck     # TypeScript strict, zero errors
npm run lint          # ESLint (+ rule: no hex/rgb colors outside src/theme/tokens.ts)
npm run format:check  # Prettier
npm test              # Jest unit + component tests
npm run check         # all of the above
npm run doctor        # expo-doctor
```

CI (`.github/workflows/ci.yml`) runs the app checks and the database tests on every pull request.

### Builds (EAS)

Profiles in `app/eas.json`:

| Profile | Use | Output |
|---|---|---|
| `development` | Daily development (dev client) | Internal APK / iOS dev build |
| `preview` | **Stage deliveries** to Davi and the client | Internal APK + iOS build |
| `production` | Store builds (submission is done later by Davi) | AAB / IPA |

```bash
cd app
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile preview --platform all
```

Version (`app.config.ts`) is the marketing version; build numbers are managed remotely by EAS
(`appVersionSource: remote`, `autoIncrement`). The bundle identifier / package name `cl.planya.app`
must be confirmed with Davi before the first build and never changed afterwards.

### Regenerating database types

`app/src/types/database.ts` mirrors the schema. After every migration, once the project is linked:

```bash
cd app && SUPABASE_PROJECT_REF=<ref> npm run gen:types
```

## 3. Admin panel

Created in Stage 3 (`admin/`, React + Vite). Admin rights come from `profiles.role = 'admin'` and are
enforced by RLS, not by the UI.

## Project rules

See `docs/conventions.md` for conventions, design-token rules and the non-negotiable database rules.
