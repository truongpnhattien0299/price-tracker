# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent packages, each with its own `package.json` / lockfile — there is no workspace root:

- `backend/` — NestJS 11 + Prisma 6 + PostgreSQL REST API.
- `mobile/` — Expo SDK 54 (React Native 0.81, Expo Router 6) camera-first app.
- `web/` — Next.js 15 (App Router) + Tailwind v4 + shadcn/ui (Radix base, `radix-nova` style): landing page + web dashboard.

Design docs at the root:

- `DESIGN.md` — full technical design (Vietnamese, 16 sections). Source of truth; code comments reference it as `DESIGN.md §N`.
- `Memory.md` — distilled project state, per-phase progress, and gotchas. **Read this before starting work**, and keep it updated as phases complete.

## Commands

**Package manager is pnpm, never npm.** Mixing npm over the pnpm tree has broken this repo before.

The globally installed `pnpm` shim has self-updated to 11.x, which requires Node ≥ 22.13 while this machine runs Node 20.19.2 — every bare `pnpm` call dies with `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`. Both packages pin `packageManager: pnpm@10.34.3`, so run pnpm through corepack until Node is upgraded:

```bash
corepack pnpm@10.34.3 install
```

Backend (`cd backend`):

```bash
pnpm install                     # runs prisma generate via pnpm.onlyBuiltDependencies
pnpm run start:dev               # watch mode, http://localhost:3000/api/v1
pnpm run build                   # nest build
pnpm exec prisma migrate dev     # create + apply migration
pnpm exec prisma generate        # if @prisma/client is missing after install
pnpm exec prisma studio
docker compose up -d minio minio-init   # local S3 (MinIO :9000 API / :9001 console)
```

Mobile (`cd mobile`):

```bash
pnpm install
pnpm start                       # expo start
pnpm run ios | android | web
pnpm exec tsc --noEmit           # primary correctness gate
pnpm exec expo export --platform ios   # full module-graph check (prod bundle)
```

Web (`cd web`, dev server on **:3001** because the API owns :3000):

```bash
pnpm run dev                     # http://localhost:3001
pnpm run typecheck && pnpm run lint && pnpm run build
pnpm dlx shadcn@latest add <component>   # needs a pnpm-10 shim on PATH, see below
```

The shadcn CLI shells out to bare `pnpm`, which hits the broken 11.x shim. Put a corepack shim first on PATH: `corepack enable --install-directory <dir> pnpm && PATH=<dir>:$PATH pnpm dlx shadcn@latest add …`.

There is **no test suite and no linter configured** in either package. `tsc --noEmit` plus a real dev bundle are the verification steps used so far. A production `expo export` can pass while the **dev** bundle fails (dev-only subpaths) — check the dev bundle when touching Metro/Babel/NativeWind config:

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true'
```

## Environment

Both packages need a gitignored `.env`; `.env.example` in each is the reference.

- Backend DB is a **shared Postgres container on host port 2345**, not managed by this repo's `docker-compose.yml` (the `db` service was removed). Inspect it via Prisma from the host — `docker exec` into that container is blocked.
- Local S3 is MinIO. `AWS_S3_ENDPOINT` + `AWS_S3_FORCE_PATH_STYLE` exist only for MinIO; **omit both in production** so the SDK falls back to the EC2 IAM role credentials chain.
- `EXPO_PUBLIC_API_URL` must not be `localhost` for a real device — use the dev machine's LAN IP (Android emulator: `10.0.2.2`, iOS simulator: `localhost`).

## Backend architecture

Feature-module layout under `backend/src/<feature>/` (`controller` / `service` / `module` / `dto/`). `main.ts` sets the global prefix `api/v1`, a global `ValidationPipe` (`whitelist` + `transform`), and a global `ThrottlerGuard` (60 req/min per IP) registered in `app.module.ts`.

Invariants that cut across the code:

- **Every `Entry` query is scoped by `userId`** taken from the JWT via the `@CurrentUser()` decorator. A foreign id returns 404, not 403.
- **Money is `Prisma.Decimal`** (`@db.Decimal(12,2)`), never a float. Coordinates likewise.
- **Auth is stateless**: JWT access 15m + refresh 7d, no refresh tokens stored in the DB. Hashing uses `bcryptjs` (pure JS, drop-in for the `bcrypt` named in DESIGN.md). `passwordHash` is never returned.
- **Entitlement is computed, not stored**: `isPro(user)` in `common/entitlement.util.ts` is `proExpiresAt != null && now < proExpiresAt`. No cron downgrade job. Registration grants a 30-day trial (`proSource='trial'`).
- **S3: store `photoKey` only** (`entries/<userId>/<uuid>.<ext>`), never a full URL. The client PUTs directly to S3 with a backend-issued presigned URL (5-min expiry); the backend never proxies image bytes. `GET /uploads/photo-url` rejects keys not prefixed with the caller's `entries/<userId>/`. Deleting an entry best-effort deletes the S3 object.
- **Timestamps are stored UTC but grouped by user-local timezone** for calendar and time-series: raw SQL `purchased_at AT TIME ZONE 'UTC' AT TIME ZONE $tz`, default `Asia/Ho_Chi_Minh`. `purchasedAt` is deliberately separate from `createdAt`.
- **Reports aggregate in Postgres** (`SUM`/`GROUP BY`), never by pulling rows. They use `$queryRawUnsafe` with `$N` params (`userId` always `$1::uuid`) plus a `buildDateWhere()` helper — Prisma's `$queryRaw` template tag generates wrong `$N` numbering when clauses are built conditionally, so do not switch these back to tagged templates.
- Default categories (8 Vietnamese) are seeded idempotently on boot in `categories.service.ts`.

Known limitation: `search` / `store` filters use Prisma `contains insensitive`, which is diacritic-literal (`muống` ≠ `muong`). Diacritic-insensitive search needs the Postgres `unaccent` extension — deferred.

## Mobile architecture

`app/` is Expo Router file-based routing only; all non-route logic lives in `src/` (`api/`, `hooks/`, `lib/`, `store/`), with shared UI in `components/ui/`. Path alias `@/*` → `./*`.

- `app/_layout.tsx` composes providers (SafeArea → React Query → `AuthProvider`) and gates navigation on auth state via `useSegments`, redirecting between `/(auth)/login` and `/`.
- `src/api/client.ts` is the single axios instance: bearer-token request interceptor plus a **single-flight 401 → refresh → retry** response interceptor. It calls `setUnauthorizedHandler` (registered by the auth store) instead of importing the store, to avoid a circular import. Refresh uses raw `axios`, not `api`, so it cannot recurse.
- Tokens live in `expo-secure-store` (`src/lib/tokens.ts`).
- Capture flow (`app/index.tsx` → `app/capture.tsx` as a modal): take photo → compress (`src/lib/image.ts`, JPEG 0.7 / width 1080) → `POST /uploads/presign` → **raw `fetch` PUT to S3 where the `Content-Type` must match the signed type exactly** → `POST /entries`. GPS is captured on sheet mount (i.e. at capture time). Mutations invalidate the `entries` and `calendar` query keys.

### Camera

The camera is **react-native-vision-camera v5**, which is a full Nitro-based rewrite with an API unlike v4: `useCameraPermission()` (returns `{ hasPermission, requestPermission }`), `useCameraDevice('back')`, `usePhotoOutput()`, and `<Camera device outputs isActive />`. Capture goes through `photoOutput.capturePhotoToFile()`, which returns a **filesystem path, not a `file://` URL** — prefix it before handing the value to the rest of the app.

Two consequences of v5 that are easy to trip over:

- It has **no Expo config plugin** (no `app.plugin.js`), so it must not appear in `app.json` `plugins` — camera permissions are declared by hand in `ios.infoPlist` and `android.permissions`.
- `react-native-nitro-modules` and `react-native-nitro-image` are unmet peer deps that must be installed as direct dependencies (pnpm isolation again).

It also requires a **dev build** — the app cannot run in Expo Go, and native config changes need `expo prebuild` + a rebuild.

### Expo / NativeWind constraints

`mobile/AGENTS.md` (referenced by `mobile/CLAUDE.md`) requires reading the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing Expo code — SDK 56 APIs and config plugins do **not** apply here. Notably `expo-image` has no config plugin in SDK 54, so it must stay out of `app.json` plugins.

UI is react-native-reusables (shadcn/ui for RN) on NativeWind v4 + Tailwind v3. Config is interdependent — `babel.config.js` (jsxImportSource `nativewind`, `react-native-worklets/plugin` must be **last**), `metro.config.js` (`withNativeWind({ input: './global.css' })`), `tailwind.config.js` (`nativewind/preset` + shadcn HSL vars), `global.css` (imported at the top of `app/_layout.tsx`).

pnpm-specific traps: `react-native-css-interop` must stay a **direct dependency** pinned to the version `nativewind` depends on, because the NativeWind babel transform emits an import resolved from the project root and pnpm's isolation hides the nested copy. The react-native-reusables CLI also does not install `class-variance-authority` / `clsx` / `tailwind-merge` — add them manually.

## Web architecture

Route groups under `web/src/app/`: `(marketing)` → `/` (landing), `(auth)` → `/login`, `/register`, `(dashboard)` → `/dashboard/*` (shadcn `Sidebar` shell). Non-route code: `components/{marketing,auth,dashboard,shared}`, `components/ui/` (shadcn-generated — regenerate, don't hand-edit), `config/` (site + nav), `lib/api/` (fetch client with single-flight 401 → refresh, one function per backend route in `endpoints.ts`), `types/api.ts` (mirrors backend DTOs; money is a Decimal **string**).

- Font is Be Vietnam Pro — Geist has no Vietnamese subset. Font CSS variables must sit on `<html>`, because `globals.css` applies `font-sans` there.
- **Auth is a BFF** (plans/01): browser → same-origin `/api/auth/*` and `/api/backend/[...path]` route handlers → NestJS (server-only `API_URL`). JWTs live only in httpOnly cookies `pt_access` / `pt_refresh`; the proxy refreshes on 401 and clears cookies when refresh fails. Non-GET requests need a same-host `Origin` header (CSRF check) — add `-H 'Origin: http://localhost:3001'` when testing with curl. `src/middleware.ts` gates `/dashboard/*` on cookie presence only.
- Dashboard pages still render `lib/mock-data.ts` until plans/02 wires them through React Query.
- `next build` shares `.next/` with the dev server — restart `pnpm run dev` after building.

## Working conventions

- Backend-first: each roadmap phase (see `DESIGN.md` §13 and the phase log in `Memory.md`) lands and is verified on the API before the matching mobile screen.
- The full Prisma schema was authored up front to avoid migration churn; prefer extending it over reshaping it.
