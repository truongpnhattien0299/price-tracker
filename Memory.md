# Memory — Price Tracker

> Project-local context so any new session resumes fast. Source of truth for the full design is **`DESIGN.md`** (Vietnamese, 16 sections + AI extras). This file = the non-obvious distilled context + current state.

## Product

Camera-first **image expense diary** (Locket-style UX): open app → camera → snap → enter price → save. Swipe up → monthly photo calendar. Stats tab (day/month/year).
- Online-only MVP (offline-first deferred).
- Multi-user, per-user data isolation by `user_id`.
- **VND-first** (currency field defaults `"VND"`; multi-currency = Pro/later).
- Single-user usage (auth + private data), no social/sharing.
- Goal: portfolio project for interviews — clean architecture, explainable decisions.

## Stack

- Mobile: Expo (React Native) + TS, React Query, react-native-gifted-charts, expo-secure-store.
- Backend: **NestJS + TS**, **Prisma** ORM, **PostgreSQL**.
- Auth: JWT access (15m) + refresh (7d), bcrypt (cost ≥10).
- Validation: class-validator + class-transformer (DTO).
- Storage: **Cloudflare R2** via its S3 API (presigned URLs, `@aws-sdk/client-s3`). Switched from AWS S3 on 2026-10-10 (no egress fees). Local dev = MinIO. Setup: [docs/storage-r2.md](docs/storage-r2.md).
- Deploy (later): Docker → EC2 + RDS + R2 + Nginx HTTPS; ECR registry; GitHub Actions CI/CD last.

## Key technical decisions (remember these)

- **UUID** primary keys (not auto-increment) — don't leak row counts.
- `price` = **Decimal** (`@db.Decimal(12,2)`), never float — money precision.
- Storage: store **`photo_key` only** (e.g. `entries/<userId>/<uuid>.jpg`), not full URL. Client uploads **direct to R2** via backend-issued **presigned PUT URL** (5-min expiry); backend never proxies image bytes.
- **`blurhash`** stored per entry: smooth placeholder + used as the Free-tier "lock cover" (send blurhash, not real image).
- **Entitlement computed dynamically**: `isPro = proExpiresAt != null && now < proExpiresAt`. No cron downgrade. `proSource` enum = `none | trial | subscription`.
- New user gets **1-month free trial** (server-granted at register, no card, no IAP). Subscription via RevenueCat webhook later.
- **All Entry queries scoped by `user_id`** from JWT.
- **Timezone**: store timestamps UTC, but group calendar/stats by **user local timezone** (e.g. `AT TIME ZONE 'Asia/Ho_Chi_Minh'`) so photos don't fall on wrong day.
- `purchased_at` separate from `created_at` (real purchase date vs entry date).
- Reports: **push aggregation down to Postgres** (GROUP BY/SUM), don't pull rows to client.
- Free tier: ~40-50 entries/month soft cap + only last **3 months** visible (older = blur/lock, never deleted). Enforced **server-side** (don't trust client). `EntitlementGuard` (NestJS) gates Pro endpoints; over-cap create → `402`.
- OCR (Pro, later) = backend GETs the R2 object, sends bytes to AWS Textract (Textract can't read R2 directly) → prefill only, user edits.

## Roadmap (DESIGN.md §13) — backend-first principle

0 Setup · 1 Auth · 2 Entries CRUD+calendar · 3 Uploads(presign, R2) · 4 Reports · 5 Mobile MVP(camera) · 6 Mobile calendar · 7 Mobile stats · 8 Mobile map · 9 Deploy · 10 Freemium · 11 OCR/export/etc · 12 AI.

## Locked scope decisions (this session)

- **Backend-only repo for now**; `mobile/` added later. `DESIGN.md` stays at project root.
- **git init at project root** covering DESIGN.md + backend/.

## Current state

- **Phase 0 (Setup) — DONE.** NestJS v11 + Prisma v6 in `backend/`. Full schema migrated (`init`).
- **Phase 1 (Auth) — DONE.** register/login/refresh/me. JWT access 15m + refresh 7d (stateless, no DB-stored refresh tokens), bcryptjs hash (12 rounds), `JwtStrategy`(passport-jwt) + `JwtAuthGuard`, `@CurrentUser()` decorator, global `ThrottlerGuard` 60/min. Server-granted 1-month trial at register (`proSource='trial'`, `proExpiresAt=now+30d`). `isPro` computed dynamically ([common/entitlement.util.ts](backend/src/common/entitlement.util.ts)) — reuse for `EntitlementGuard` later. `passwordHash` never returned. **All endpoints verified**.
- **Phase 2 (Entries + Categories) — DONE.** All guarded by JWT + scoped by `userId`.
  - Categories: 8 VN defaults seeded idempotently on boot ([categories.service.ts](backend/src/categories/categories.service.ts)), `GET /categories`.
  - Entries CRUD: `POST/GET/GET :id/PATCH/DELETE /entries`. Filters `page,limit,category,from,to,search,store` + pagination meta `{page,limit,total,totalPages}`. Ownership → 404 on foreign id. `price`→`Prisma.Decimal`. `categoryId` validated (BadRequest if invalid).
  - `GET /entries/calendar?month=YYYY-MM&tz=` → `[{date,count,coverPhotoKey}]`, grouped by **local day** via raw SQL `purchased_at AT TIME ZONE 'UTC' AT TIME ZONE $tz` (tz default `Asia/Ho_Chi_Minh`); cover = first photo of day. Verified.
  - **Known limit**: `search`/`store` use Prisma `contains insensitive` = diacritic-literal (`muống`≠`muong`). Diacritic-insensitive needs Postgres `unaccent` ext — defer.
- **Phase 3 (Uploads/storage) — DONE.** [uploads.service.ts](backend/src/uploads/uploads.service.ts) — `@aws-sdk/client-s3` + presigner.
  - `POST /uploads/presign {contentType,ext}` → `{uploadUrl, photoKey}` (presigned PUT, 5-min). photoKey = `entries/<userId>/<uuid>.<ext>`. contentType/ext whitelisted (jpeg/png/webp) → 400 otherwise.
  - `GET /uploads/photo-url?key=` → `{url}` (presigned GET, 5-min). Rejects keys not prefixed `entries/<userId>/` → 403 (ownership). Free-tier lock (DESIGN §14.6) deferred to Phase 10.
  - `POST /uploads/photo-urls` `{keys[]}` (1–100, unique) → `{urls:{[key]:url}}` — batch of the above, same 403 rule for any foreign key. Added for the web calendar (plans/03) because the 60 req/min throttle is per IP and the web BFF puts all users on one IP. Mobile calendar should use it too.
  - Storage client config-driven, provider-neutral `STORAGE_*` env (`ENDPOINT`, `REGION`, `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `FORCE_PATH_STYLE`), all required except region/path-style. Renamed from `AWS_*` with the R2 switch: R2 has no IAM-role chain, and `AWS_*` would leak R2 keys into any other AWS SDK client (Textract). `deleteObject()` exported.
  - `requestChecksumCalculation`/`responseChecksumValidation: 'WHEN_REQUIRED'` is **required**: SDK ≥3.729 otherwise signs `x-amz-checksum-crc32` of an empty body into presigned PUT URLs → R2 rejects the real upload.
  - Entry DELETE now best-effort deletes the stored object (Phase 2 TODO resolved).
  - (plans/04, 2026-10-10) `photoKey` on POST/PATCH /entries must be the caller's own (`UploadsService.assertOwnKey`, 403) — before this, attaching another user's key and deleting the entry deleted **their** photo. PATCH `price|currency|purchasedAt: null` → 400 (was 500). PATCH that replaces/removes the photo best-effort deletes the old object.
  - **Local dev storage = MinIO** in docker-compose (`minio` :9000 API / :9001 console, `minio-init` creates bucket `price-tracker-photos`). `.env` points STORAGE_* at minioadmin/minioadmin. To test against a real R2 dev bucket instead, swap `STORAGE_*` per `.env.example`. Start: `docker compose up -d minio minio-init`.
  - **Full roundtrip verified**: presign→PUT→presign GET→download bytes; 400/403/401 cases; entry delete → object `NoSuchKey`.
- **Phase 4 (Reports) — DONE.** All aggregate via `$queryRawUnsafe` with `$N` params (userId always `$1::uuid`; dates appended). **Never trust Prisma nested `$queryRaw` template tags for conditionals — produces wrong `$N` syntax** → use `$queryRawUnsafe` + `buildDateWhere()` helper for dynamic WHERE.
  - `GET /reports/summary?from&to` → `{totalSpent, entryCount, avgPerEntry, currency}`.
  - `GET /reports/by-category` → `[{categoryName, total, count, percentage}]` (pie chart).
  - `GET /reports/time-series?groupBy=day|month|year&tz=` → `[{period, total}]`, local-tz bucketing same as calendar.
  - `GET /reports/top-stores` → `[{storeName, total, count}]` top-10 by spend.
  - All guarded JWT, all 401 unauthenticated.
- **Backend DONE (Phases 0–4).** Phase 4 committed (`feat(reports)...`).
- **Phase 5 (Mobile MVP) — CODE DONE, device test pending.** Expo app in `mobile/` (**SDK 54**, RN 0.81.5, React 19.1, **Expo Router** v6 file-based, **newArchEnabled**). Validated by `tsc --noEmit` (clean) + full `expo export --platform ios` (whole module graph + routes bundle clean). **Not yet run on a real device** (camera/GPS need device/emulator).
  - **SDK 54 note:** `expo-image` has **no config plugin** in SDK 54 (56 did) → NOT in `app.json` plugins (component still works). Downgraded from 56 via `pnpm add expo@~54` + `expo install --fix` + `pnpm install`.
  - **Downgrade gotcha:** `expo install --fix` left `@expo/metro-runtime`+`react-dom` stuck on 56 (transitive leftovers). expo-router 6 needs metro-runtime 6 (`@expo/metro-runtime/error-overlay` subpath) → **dev** bundle failed (prod `expo export` passed b/c error-overlay is dev-only). Fix: `expo install @expo/metro-runtime react-dom` → 6.1.2 / 19.1.0. **Verified dev bundle compiles** via metro `curl /node_modules/expo-router/entry.bundle?platform=ios&dev=true`.
  - **Navigation:** Expo Router. `app/_layout.tsx` = providers (SafeArea + React Query + AuthProvider) + auth-gated redirect via `useSegments`. Routes: `app/index.tsx` (Camera home, root), `app/capture.tsx` (modal sheet), `app/(auth)/login.tsx`+`register.tsx`.
  - **Auth:** `src/store/auth.tsx` (context, bootstrap via `/auth/me`), tokens in `expo-secure-store` (`src/lib/tokens.ts`). `src/api/client.ts` axios + Bearer interceptor + **single-flight 401→refresh→retry**; failed refresh calls `setUnauthorizedHandler` cb → signOut (avoids circular import). Register form sends **displayName** (backend requires it).
  - **Capture flow (3-tap):** camera `takePictureAsync` → push `/capture?photoUri=`. Sheet: price autofocus (`number-pad`), name, category chips (`useCategories`, remembers last via `src/lib/lastCategory.ts`), GPS via `src/hooks/useLocation.ts` (fires on sheet mount = capture time; reverse-geocode → address/storeName). Save = `compressForUpload` (`src/lib/image.ts`, new `ImageManipulator.manipulate().resize().renderAsync().saveAsync` API, JPEG 0.7, w1080) → `POST /uploads/presign` → **PUT to S3 via raw fetch** (Content-Type `image/jpeg` MUST match signed type) → `POST /entries`. React Query mutation, invalidates `entries`/`calendar`.
  - **Config:** `app.json` scheme `pricetracker` + camera/location config plugins + iOS infoPlist + Android perms (VN copy). API base from `EXPO_PUBLIC_API_URL` (`.env`, gitignored; `.env.example` committed). ⚠️ phone can't reach `localhost` → `.env` uses LAN IP `192.168.1.55`; Android emulator `10.0.2.2`; iOS sim `localhost`.
  - **Removed** `react-native-reanimated`+`react-native-gesture-handler` (reanimated 4 needs worklets/babel; not needed for Phase 5 — swipe-up calendar is Phase 6). Expo Router stack works without them.
  - **blurhash deferred to Phase 6** (optional on POST /entries; keep 3-tap path fast).
  - **UI = react-native-reusables (shadcn/ui for RN) on NativeWind v4.** `nativewind@4.2.5` + `tailwindcss@3.4` (v3) + `react-native-reanimated@4.1.7` + `react-native-worklets@0.5.1`. Config: `babel.config.js` (preset jsxImportSource `nativewind` + `nativewind/babel`, plugin `react-native-worklets/plugin` LAST), `metro.config.js` `withNativeWind({input:'./global.css'})`, `tailwind.config.js` (preset `nativewind/preset`, shadcn HSL color vars), `global.css` (shadcn :root + .dark:root tokens), `nativewind-env.d.ts`. `global.css` imported top of `app/_layout.tsx`. Path alias `@/*`→`./*` in tsconfig (Expo metro resolves it). Components in `components/ui/` (button/input/text/label/card) added via `npx @react-native-reusables/cli@latest add ... --styling-library nativewind`; `components.json` (style new-york, aliases @/). `lib/utils.ts` = `cn()`.
  - **pnpm gotchas (RNR/NativeWind):** CLI `add` did NOT install `class-variance-authority`/`clsx`/`tailwind-merge` → add manually. NativeWind v4 babel emits `import 'react-native-css-interop/jsx-runtime'` resolved from PROJECT root; pnpm isolation hides nativewind's nested copy → **must add `react-native-css-interop@0.2.5` as direct dep** (match `nativewind` dep version) or dev bundle fails `Unable to resolve react-native-css-interop/jsx-runtime`. `@rn-primitives/*` (label, slot) auto-installed by RNR.
  - All screens restyled with RNR + Tailwind `className`. Camera overlay stays dark (bg-black/text-white over the camera preview). Verified: `tsc` clean + dev iOS bundle compiles.
  - **Camera migrated expo-camera → react-native-vision-camera v5.0.11** (2026-08-12). v5 is a Nitro rewrite, API totally different from v4: `useCameraPermission()`→`{hasPermission,requestPermission}`, `useCameraDevice('back')`, `usePhotoOutput({containerFormat:'jpeg',quality:0.9})`, `<Camera device outputs isActive/>`. Capture = `photoOutput.capturePhotoToFile({flashMode:'off'},{})` → `{filePath}` which is a **filesystem path, NOT a `file://` URL** → must prefix `file://` before pushing to `/capture`. `isActive` driven by expo-router `useFocusEffect` so the session stops while the capture modal is up.
    - **v5 ships NO Expo config plugin** (no `app.plugin.js`) → the `["react-native-vision-camera",{...}]` entry in `app.json` plugins makes `expo export` fail with `PluginError: Unable to resolve a valid config plugin`. Removed it; permissions stay hand-declared in `ios.infoPlist` + `android.permissions` (already there).
    - Unmet peers `react-native-nitro-modules` + `react-native-nitro-image` must be **direct deps** (pnpm isolation) — installed 0.36.5 / 0.15.1.
    - Needs a **dev build** (not Expo Go). Requires `newArchEnabled: true` (already set).
    - Verified: `tsc --noEmit` clean, `expo export --platform ios` clean, dev iOS bundle HTTP 200 / 10.7MB. **Still not run on a device.**
  - **TODO device test:** register→camera, kill/reopen stays logged in, capture→Save → MinIO object under `entries/<userId>/` + `GET /entries` row w/ photoKey+price+coords. Then run on device + commit verified.
- **Web (`web/`, Next.js 15 + shadcn) — plans 01–06 DONE** (2026-10-10, see `plans/README.md`): BFF auth, React Query dashboard, calendar, entry CRUD + upload, landing, brand theme.
  - Landing (plans/05) is static and never invents facts: Pro prices live in `web/src/config/pricing.ts` (`null` → "Sắp công bố", set both → monthly/yearly toggle), store buttons read `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` (empty → disabled "Sắp có"). Update both when prices are fixed / the app ships. App visuals are JSX mockups (`PhoneMockup`, shared `MonthGrid`), not screenshots.
  - Brand color (plans/06) is a **default I picked, not a decided brand**: green hue 152 (`#05773b` light / `#58c97d` dark, both WCAG AA). Mobile still has the neutral shadcn primary — HSL equivalents are in plans/06 "Ngoài phạm vi".
- Toolchain: Node v20.19.2, npm 11.6.2, Docker 29.4.2. Mobile: Expo SDK 56, pnpm.

## Local dev gotchas

- **DB = shared Postgres container `postgres` on host port 2345** (NOT the compose db). `.env` `DATABASE_URL=...@localhost:2345/price_tracker`. `docker-compose.yml` db service removed; `api` service uses `host.docker.internal:2345`. Project no longer manages its own PG container.
- Schema lives on that 2345 db (init migration applied). Can't `docker exec` into `postgres` container (not created by us → auto-mode blocks); inspect DB via Prisma from host instead.
- **Global `pnpm` shim is broken (2026-08-12).** It self-updated to 11.13.1, which needs Node ≥22.13; host Node is 20.19.2 → every bare `pnpm` call dies `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`. Workaround: `corepack pnpm@10.34.3 <cmd>`. Added `packageManager: pnpm@10.34.3` to `mobile/package.json` (backend already had it), but the shim ignores it — corepack is the actual fix until Node is upgraded.
- **Package manager = pnpm (NOT npm).** User preference. `pnpm@10.34.3`, lockfile `pnpm-lock.yaml`. The earlier `.pnpm`/`.ignored` mess + npm arborist crash came from mixing npm over a pnpm-style tree — don't run `npm install` here.
  - `package.json` has `pnpm.onlyBuiltDependencies: [@prisma/client, prisma, @nestjs/core]` so `pnpm install` runs prisma generate automatically (pnpm v10 blocks build scripts by default). If prisma client missing after install: `pnpm exec prisma generate`.
- **Avoided bcrypt native addon** → using **bcryptjs** (pure JS) instead. DESIGN.md says bcrypt; bcryptjs is API-compatible drop-in.
- Install: `pnpm install`. Run: `pnpm run start:dev`. Build: `pnpm run build`. Migrate: `pnpm exec prisma migrate dev`.
- Dockerfile uses corepack + pnpm.
- git initialized at project root; files **staged but not committed** (awaiting user go-ahead).
- ⚠️ `~/.npmrc` contains a plaintext npm `_authToken` (user's home config, not in repo) — heads-up for the user to rotate if unintended; out of project scope.
