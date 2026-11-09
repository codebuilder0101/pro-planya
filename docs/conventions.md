# PlanYá development conventions

Read this before working on the project. Keep it up to date when conventions change.

## Context
- PlanYá MVP: React Native (Expo) app for Android + iOS, a web admin panel, Supabase backend.
- Region: La Araucanía, Chile (Temuco, Pucón). Two roles: explorer and host (+ admin in the panel).
- Core loop (Stage 1): host publishes → explorer finds → joins → chats with host.
- Only contact: Davi (lead dev). Build ONLY what is in the brief; propose extras to Davi first.
- App UI language: Spanish (Chile). Code, comments, commits, docs: English.

## Repo layout
```
app/        Expo SDK 58 app (src/app = routes, src/components, src/features, src/lib, src/theme, src/types)
admin/      React + Vite admin panel (Stage 3)
supabase/   migrations/, seed.sql, templates/, tests/ (PGlite DB tests), scripts/ (test users, race test)
docs/       data inventory, etc.
```

## Commands
- App: `cd app && npm start | npm run check | npm run typecheck | npm run lint | npm test | npm run doctor`
- DB tests: `npm run db:test` (root) — runs migrations + seed + RLS tests in PGlite, no Docker
- Test users / race test: `npm run db:test-users`, `npm run db:race` (root `.env`, dev/preview project only)
- Add dependencies with `npx expo install <pkg>` (SDK-compatible), then pin the exact version in package.json.

## Tech rules
- Expo-compatible libraries only; native needs → config plugin + dev build. Never eject without Davi.
- Expo APIs change every SDK: check the installed package's .d.ts or https://docs.expo.dev/versions/v58.0.0/ before using an API.
- TypeScript strict (+ noUncheckedIndexedAccess). No `any` without an eslint-disable comment explaining why.
- Server state via TanStack Query (keys in `src/lib/query-client.ts`); lists paginate 20 items.
- Reanimated shared values: use `.get()` / `.set()` (React Compiler is on), never `.value` assignment.
- React Native 0.88 types: TextInput refs are `TextInputInstance`; `StyleSheet.absoluteFillObject` no longer exists.
- Supabase client: `src/lib/supabase.ts` only, anon key only.
- User-facing errors: always `toUserMessage(error)` from `src/lib/errors.ts` (friendly Spanish). Add new DB error codes there.
- Formats: money with `formatCLP` → "$25.000"; dates with `src/lib/dates.ts` (America/Santiago, independent of device TZ).
- Images: `pickImage` → `compressImage` (≤1600 px JPEG) → `uploadImage`; render with `expo-image`.
- Permissions: location while in use only; camera/photos only when the user taps the action.

## Design rules
- Tokens in `app/src/theme/tokens.ts` (primitive → semantic colors, 8pt spacing, radius, elevation, motion, typography).
  Components use semantic tokens only. ESLint fails on hex/rgb literals outside tokens.
  Values come from the client's Figma (Design System v1.0): foundations pages + colors measured on the final
  Sprint screens (forest green `#3B7050` primary, warm stone neutrals). Error red is not in Figma (confirm).
  `shape.*` maps components to radii (cards 20, sheets 24, buttons/inputs 12, chips pill).
- Figma reference: `npm run figma:export` (root `.env` FIGMA_TOKEN) → `reference/figma/` (gitignored, confidential).
- Fonts: SF Pro (system) on iOS, Inter on Android: use `typography.*` / `font()`, never raw `fontWeight` with Inter.
- Use the UI kit in `src/components/ui` (Text, Button, TextField, Chip, Avatar, Skeleton, EmptyState, Screen,
  Badge, IconButton, HeartButton, CoverImage, SectionHeader, Rating, SegmentedControl, SearchField, Stepper,
  InlineError…). Maps: `src/components/map/plans-map` (react-native-maps; `.web.tsx` = static OSM preview).
- Bottom sheets = Expo Router routes with `presentation: 'formSheet'` (see `(app)/_layout.tsx`).
- Pressable cards that contain buttons use `accessibilityRole={CARD_ROLE}` (web previews can't nest buttons).
- Design preview: `cd app && npm run preview -- --web` = fake signed-in user + seed data, no Supabase
  (`src/dev/design-preview.ts`, dev only, stripped from release builds). Regenerate data after seed changes:
  `npm run preview:fixtures` (root).
- Skeletons, not spinners, for loading content. Every screen handles loading, empty and error states.
- One primary action per screen. Tap targets ≥ 44 pt. Respect reduced motion (`useReducedMotion`).
- Bottom sheets for join, filters and actions. Light mode only (semantic tokens keep dark mode possible).
- After the design approval, do not redesign approved screens without asking Davi.

## Database rules (non-negotiable)
1. RLS enabled on every table; policies only in migrations; test with two users (`supabase/tests`).
2. Bookings only through `join_experience` / `cancel_booking` (row lock + seats_taken in one transaction).
   The app never writes `seats_taken` (column privileges + guard trigger enforce it).
3. Nearby search: PostGIS `ST_DWithin` + GiST index, returns `distance_km` (`search_experiences` / `nearby_experiences`).
   Never read `location` columns directly (EWKB hex): use the RPCs, which return `lat`/`lng`
   (`get_experience` for the detail screen, `list_places` for places).
4. Blocked users are excluded from each other's plans and conversations at the database level.
5. Admin rights = `profiles.role = 'admin'` checked in policies (`private.is_admin()`), not hidden UI.
6. Only the anon key in clients; the service role key only in Edge Functions / local scripts.
- Helpers and trigger functions live in schema `private` (not exposed by the API).
- Business errors: `raise exception '<code>' using errcode = 'P0001'` + Spanish mapping in `app/src/lib/errors.ts`.
- Every new table/function migration must re-apply the anon revokes (the DB test fails otherwise),
  add tests in `supabase/tests/db.test.mjs`, and update `app/src/types/database.ts` (gen:types).
- User references cascade on delete (account deletion must stay clean).
- Database changes only via migrations; never edit production tables by hand.

## Git and process
- `main` always builds. Feature branches, small commits pushed daily, one PR per feature for Davi.
- Before a PR: `npm run check` in app + `npm run db:test`.
- No secrets in git or in prompts. `.env` files are gitignored; `.env.example` files are committed.
- For each feature: short plan first (files, schema changes, components), then implement, run the app, commit.
- Stage delivery = preview APK + TestFlight build + admin URL (when applicable) + Spanish test list (5–10 steps)
  + test accounts + all merged to main + docs/conventions.md + README updated + a short screen recording.
