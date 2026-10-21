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
pnpm run start:local             # watch mode on .env.local (local DB), http://localhost:3000/api/v1
pnpm run start:dev               # same, but on .env (Neon = production DB) — avoid locally
pnpm run build                   # nest build
pnpm exec prisma migrate dev     # create + apply migration (export .env.local first, see Environment)
node --env-file=.env.local scripts/grant-admin.mjs <email> [--revoke]   # set/unset role admin
pnpm exec prisma generate        # if @prisma/client is missing after install
pnpm exec prisma studio
docker compose up -d minio minio-init   # local storage (MinIO :9000 API / :9001 console)
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

- Backend has **two env files**: `.env` points at **Neon, the production DB** (Render runs `prisma migrate deploy` on deploy); `.env.local` points at the **local shared Postgres container on host port 2345** (not managed by this repo's `docker-compose.yml`). Local dev uses `.env.local`: `pnpm run start:local` (the `api` launch config does this), and for Prisma CLI `set -a; . ./.env.local; set +a` before `prisma migrate dev` — Prisma and `@nestjs/config` only read `.env`, and an already-exported variable wins over it. Never run `migrate dev` against `.env`. Inspect the local DB via Prisma from the host — `docker exec` into that container is blocked.
- Photo storage is **Cloudflare R2** in production and **MinIO** locally, both through the S3 API (`@aws-sdk/client-s3`). Config is the provider-neutral `STORAGE_*` set (endpoint + keys always explicit — R2 has no IAM role chain); do not reintroduce `AWS_*` names, other AWS SDK clients would pick them up. Bucket/token/CORS setup: `docs/storage-r2.md`.
- `EXPO_PUBLIC_API_URL` must not be `localhost` for a real device — use the dev machine's LAN IP (Android emulator: `10.0.2.2`, iOS simulator: `localhost`).

## Backend architecture

Feature-module layout under `backend/src/<feature>/` (`controller` / `service` / `module` / `dto/`). `main.ts` sets the global prefix `api/v1`, a global `ValidationPipe` (`whitelist` + `transform`), and a global `ThrottlerGuard` (60 req/min per IP) registered in `app.module.ts`.

Invariants that cut across the code:

- **Every `Entry` query is scoped by `userId`** taken from the JWT via the `@CurrentUser()` decorator. A foreign id returns 404, not 403.
- **Money is `Prisma.Decimal`** (`@db.Decimal(12,2)`), never a float. Coordinates likewise.
- **Auth is stateless**: JWT access 15m + refresh 7d, no refresh tokens stored in the DB. Hashing uses `bcryptjs` (pure JS, drop-in for the `bcrypt` named in DESIGN.md). `passwordHash` is never returned.
- **Entitlement is computed, not stored**: `isPro(user)` in `common/entitlement.util.ts` is `proExpiresAt != null && now < proExpiresAt`. No cron downgrade job. Registration grants a 30-day trial (`proSource='trial'`).
- **Free limits are enforced server-side** (plans/07) by `entitlement/EntitlementService`, called from the services/controllers that need it (no guard: every rule depends on params). `FREE_LIMITS` (50 entries/month counted by `createdAt`, 3-month history) lives in `common/entitlement.util.ts`. Outside the history window (`historyFrom` = VN midnight 3 months back) entries are returned as `{id, purchasedAt, blurhash, locked: true}`: never the price, name or photo key. Calendar days lose their cover, photo URLs and Free reports with `from < historyFrom` or `groupBy=year` are refused. Refusals are **402 with a `code`** (`ENTRY_LIMIT` / `HISTORY_LOCKED` / `PRO_ONLY`) via `paymentRequired()`. Every entry read goes through `present()` in `entries.service.ts`, so new read paths must too.
- **Storage: store `photoKey` only** (`entries/<userId>/<uuid>.<ext>`), never a full URL. The client PUTs directly to R2 with a backend-issued presigned URL (5-min expiry); the backend never proxies image bytes. `GET /uploads/photo-url` rejects keys not prefixed with the caller's `entries/<userId>/`. Deleting an entry best-effort deletes the S3 object.
- **Timestamps are stored UTC but grouped by user-local timezone** for calendar and time-series: raw SQL `purchased_at AT TIME ZONE 'UTC' AT TIME ZONE $tz`, default `Asia/Ho_Chi_Minh`. `purchasedAt` is deliberately separate from `createdAt`.
- `GET /reports/category-series` (`groupBy=month|year`, `categoryIds=<uuid>,…,none`; omitted = all) returns one row per (period, category) with entries. Same entitlement rule as `time-series` (Free: no `year`, range inside the history window).
- **Reports aggregate in Postgres** (`SUM`/`GROUP BY`), never by pulling rows. They use `$queryRawUnsafe` with `$N` params (`userId` always `$1::uuid`) plus a `buildDateWhere()` helper — Prisma's `$queryRaw` template tag generates wrong `$N` numbering when clauses are built conditionally, so do not switch these back to tagged templates.
- Categories are shared by all users. The 8 Vietnamese defaults are seeded on boot **only into an empty table** (`categories.service.ts`), so admin renames/deletes stick. Admins CRUD them via `/admin/categories` (409 `CATEGORY_EXISTS` on a case-insensitive duplicate name; deleting sets entries' `categoryId` to null). Web page: `/dashboard/admin/categories`.
- **Stores (plans/09)**: `Store` rows are user-created (`personal`) → proposed (`pending`) → admin-approved (`global`). A user sees global + own stores; someone else's non-global store is a 404. Global stores are admin-only to change (`403` code `STORE_GLOBAL`); admins never see personal stores. `Entry.storeId` (FK, `SetNull`) plus a **snapshot** in `storeName`/`address`/`latitude`/`longitude`: the server copies the store on write, rewrites linked entries when a store changes (`StoresService.save` / `merge`), and a PATCH that edits those fields by hand unlinks the store. So map/reports/filters keep reading the entry columns. A store's `kind` is `physical` (point required) or `online` (no address, no point; DB CHECK `stores_kind_location_check`): an online store's snapshot clears the entry's location, it sorts after nearby stores in the picker, and its review candidates are online stores with a matching `name_search` instead of the 100 m radius. Search uses `name_search` (lowercase, no diacritics, `đ→d`, `common/normalize.util.ts`), not `unaccent`.
- **Keep-alive**: `health/keep-alive.service.ts` pings the API's own `RENDER_EXTERNAL_URL` + `/api/v1/health/live` every 10 min so Render's free plan never spins down (it sleeps after 15 min idle). Off where that var is unset (local); `KEEP_ALIVE=false` disables, `KEEP_ALIVE_URL` / `KEEP_ALIVE_INTERVAL_MIN` override. It must hit `/health/live`, never `/health`, which queries the DB and would keep Neon awake.
- **Admin** = `User.role` (`user | admin`). `AdminGuard` reads it from the DB per request (not the JWT), so granting/revoking is immediate. `/auth/me` returns `role`.

Known limitation: `search` / `store` filters use Prisma `contains insensitive`, which is diacritic-literal (`muống` ≠ `muong`). Diacritic-insensitive search needs the Postgres `unaccent` extension — deferred.

## Mobile architecture

`app/` is Expo Router file-based routing only; all non-route logic lives in `src/` (`api/`, `hooks/`, `lib/`, `store/`), with shared UI in `components/ui/`. Path alias `@/*` → `./*`.

- `app/_layout.tsx` composes providers (SafeArea → React Query → `AuthProvider`) and gates navigation on auth state via `useSegments`, redirecting between `/(auth)/login` and `/`.
- `src/api/client.ts` is the single axios instance: bearer-token request interceptor plus a **single-flight 401 → refresh → retry** response interceptor. It calls `setUnauthorizedHandler` (registered by the auth store) instead of importing the store, to avoid a circular import. Refresh uses raw `axios`, not `api`, so it cannot recurse.
- Tokens live in `expo-secure-store` (`src/lib/tokens.ts`).
- Capture flow (`app/index.tsx` → `app/capture.tsx` as a modal): take photo → compress (`src/lib/image.ts`, JPEG 0.7 / width 1080) → `POST /uploads/presign` → **raw `fetch` PUT to storage where the `Content-Type` must match the signed type exactly** → `POST /entries`. GPS is captured on sheet mount (i.e. at capture time). Mutations invalidate the `entries` and `calendar` query keys.

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
- **Data layer is TanStack React Query** (plans/02). Layering: `lib/api/endpoints.ts` (plain calls) → `hooks/queries/*` (useQuery/useMutation) → components; components never call endpoints directly. Keys come only from `lib/query/keys.ts`; entry mutations invalidate `entries`, `calendar` and `reports`. Logout calls `queryClient.clear()`. Dashboard pages stay server components (for `metadata`) and render a client `*-view.tsx`.
- `/reports/*` return plain **numbers** (backend `Number()`s the SQL text), unlike entry `price` which is a Decimal string. `GET /entries` does not include the category relation — resolve names with `useCategoryMap()`.
- Date ranges are computed in Asia/Ho_Chi_Minh (fixed UTC+7) by `lib/date-range.ts`; backend `to` is inclusive, so ranges end 1 ms before the next period. Entries filters live in the URL (`?search=&category=&from=&to=&page=`, days as `YYYY-MM-DD`), written with `router.replace`.
- **Photos**: storage objects are private. Grids fetch presigned GET URLs in one `POST /uploads/photo-urls` (`usePhotoUrls`, which also seeds each key's `usePhotoUrl` cache) — never one request per photo, because the API throttles 60 req/min **per IP** and a grid page should not burn a user's budget. (The BFF forwards the browser IP as `X-Client-IP` + `X-BFF-Secret` when `BFF_SECRET` is set on both sides, and the backend's `ClientIpThrottlerGuard` keys on it; without the secret every web user shares the Next server's IP.) Render with `components/shared/photo.tsx` (plain `<img>`; signed URLs expire in 5 min, so `next/image` optimisation is useless).
- Calendar (plans/03): `?month=YYYY-MM&day=YYYY-MM-DD` in the URL, Monday-first grid from `monthGrid()`, cover = first photo of the VN day. No money on the calendar (DESIGN.md §8).
- Entry create/edit (plans/04): one `EntryFormDialog` for both. PATCH sends only changed fields, `null` clears a nullable one. Photos are compressed in the browser (`lib/image.ts`, ≤1080px JPEG 0.7 like mobile) and PUT straight to storage by `useUploadPhoto` — so the R2 bucket **needs a CORS policy** for the web origins (`docs/storage-r2.md` §4); MinIO allows any origin. Purchase time is VN wall time (`YYYY-MM-DDTHH:mm`) via `toVnInput` / `fromVnInput`, edited with `DateTimePicker` (Calendar popover + hour/minute popover, future times disabled) — not `datetime-local`, which Safari renders with a fixed min width (overflows the dialog) and no calendar icon. `EntryDetailDialog` reads through `useEntry(id, initial)`, so it shows saved edits; `/dashboard/entries?entry=<id>` deep-links it.
- Landing (plans/05) stays static (no cookie reads). Pro prices are in `config/pricing.ts` (`null` = not decided → "Sắp công bố"); store links come from `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` (unset → disabled "Sắp có"). Product visuals are JSX mockups on the `--produce-*` tokens (`PhoneMockup`, `components/shared/month-grid.tsx`, shared with the auth pages), not screenshots.
- Entitlement (plans/07): `useEntitlement()` (`GET /me/entitlement`) is the only source of plan state; the client never computes Pro itself. Entry reads are `EntryRow = Entry | LockedEntry`, so narrow on `locked` first. Locked UI lives in `components/dashboard/pro-lock.tsx`; "upgrade" links to `/#pricing` (no checkout yet). `paywallCode(err)` reads a 402's `code`. Free reports must not request `from` before `historyFrom` (picker `minDate`, overview uses 3 months).
- Brand (plans/06): green, OKLCH hue 152, set only through tokens in `globals.css` (`--primary`, `--ring`, `--chart-1..5`, `--sidebar-primary`); background/card/muted stay neutral so photos stay the loudest thing. `lib/brand.ts` holds hex copies for the `next/og` image (`opengraph-image.tsx`, which inlines `public/icons/icon-512.png` as a data URL) and `theme-color` — `next/og` reads no CSS vars and its default font has no Vietnamese diacritics, so generated images use Latin-only text. App icons (and the `Logo` component, `public/icons/icon-192.png`) are raster PNGs rendered from the designer's artwork, not generated: web `src/app/{icon.png,apple-icon.png,favicon.ico}` + `public/icons/*` (PWA manifest), mobile `assets/{icon,android-icon-*,favicon}.png`. Round art → favicon / Android adaptive / PWA; rounded-square art → iOS + apple-touch (opaque, full-bleed — the OS rounds corners).
- Map (plans/08): MapLibre GL **v5** (pinned; v6 is ESM-only with a separate worker file) via `react-map-gl/maplibre`, on OpenFreeMap vector tiles (free, no key). Styles `public/map/{light,dark}.json` are **generated** by `node scripts/map-style/build.mjs` from the vendored Liberty style — edit the palettes there, never the JSON. MapLibre is client-only: import map components through `next/dynamic` with `ssr: false` (`BaseMap` in `components/shared/map/`). Pins are HTML `<Marker>`s clustered by `supercluster`; photo URLs come from one `photo-urls` batch per settled view. `GET /entries/map` returns every located point (cap 5000) and clamps a Free range to the history window (`lockedCount`, no 402).
- Location in the entry form: EXIF GPS (`exifr`, read **before** `compressImage()` strips it) → device GPS only for a photo taken in the last 2 min → address search or manual pin. Phone browsers usually strip GPS from picked photos, so device GPS is the common path: `getDevicePosition()` uses `watchPosition` (`maximumAge: 0`), keeps the most accurate fix and stops at ≤20 m or 15 s — the first fix is typically a coarse Wi-Fi/cell guess. `latitude`/`longitude` must be sent together (400 otherwise). Reverse geocoding goes through the BFF route `/api/geocode/reverse` (Nominatim, one shared ≥1.1 s queue + identifying User-Agent per its usage policy) — never call Nominatim from the browser. Address search (combobox above the form map) goes through `/api/geocode/search` → **Photon** (`PHOTON_URL`, default photon.komoot.io), because Nominatim's policy forbids search-as-you-type; Photon also matches without diacritics. A picked suggestion fills store/address directly (no reverse call). Autofill rule (`autoFill(…, picked)`): a spot the user chose (map tap/drag, search, "Vị trí hiện tại") always overwrites the address; a spot from a photo fills only empty/auto-filled fields. Store name is never forced. Geolocation needs a secure context: a phone on `http://<LAN IP>` gets nothing.
- Online stores: `StoreFormDialog` has a Có địa chỉ / Online toggle (online hides map + address). An entry linked to a store but without coordinates is treated as linked to an online store. Use `storePlace()` / `StoreKindIcon` for a store's subtitle and icon, and `TOGGLE_ON` (`components/shared/toggle-on.ts`) when a toggle's selected state must be obvious.
- Stores (plans/09): the entry form's "Cửa hàng" field is `StorePicker` (combobox over `GET /stores`, nearest-first from the current pin). Free text still works (no link); picking a store hides address + map and sends only `storeId` (the server fills the rest — sending location fields would unlink it). "Tạo cửa hàng …" opens `StoreFormDialog` **outside** the entry `<form>`: React submit events bubble through portals. Store mutations invalidate `stores` + `entries` + `reports` (snapshots change). Pages: `/dashboard/stores` (own stores, propose/withdraw) and `/dashboard/admin/stores` (sidebar group shown when `role === "admin"`; the API enforces it).
- In the Claude browser pane the document is often `hidden` (e.g. another tab such as the `api` preview is fronted), which pauses React Query retries, fires focus refetches, and blocks `requestAnimationFrame` so `<Suspense>` content may not render until a screenshot — not an app bug. Front the tab with `tabs_select`.
- `next build` shares `.next/` with the dev server — restart `pnpm run dev` after building.
- Likewise `nest build` wipes `backend/dist/` and kills a running `start:dev` watcher — stop it first.

## Working conventions

- Backend-first: each roadmap phase (see `DESIGN.md` §13 and the phase log in `Memory.md`) lands and is verified on the API before the matching mobile screen.
- The full Prisma schema was authored up front to avoid migration churn; prefer extending it over reshaping it.
