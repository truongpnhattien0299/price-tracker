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
- Storage: AWS S3 (presigned URLs).
- Deploy (later): Docker → EC2 + RDS + S3 + Nginx HTTPS; ECR registry; GitHub Actions CI/CD last.

## Key technical decisions (remember these)

- **UUID** primary keys (not auto-increment) — don't leak row counts.
- `price` = **Decimal** (`@db.Decimal(12,2)`), never float — money precision.
- S3: store **`photo_key` only** (e.g. `entries/<userId>/<uuid>.jpg`), not full URL. Client uploads **direct to S3** via backend-issued **presigned PUT URL** (5-min expiry); backend never proxies image bytes.
- **`blurhash`** stored per entry: smooth placeholder + used as the Free-tier "lock cover" (send blurhash, not real image).
- **Entitlement computed dynamically**: `isPro = proExpiresAt != null && now < proExpiresAt`. No cron downgrade. `proSource` enum = `none | trial | subscription`.
- New user gets **1-month free trial** (server-granted at register, no card, no IAP). Subscription via RevenueCat webhook later.
- **All Entry queries scoped by `user_id`** from JWT.
- **Timezone**: store timestamps UTC, but group calendar/stats by **user local timezone** (e.g. `AT TIME ZONE 'Asia/Ho_Chi_Minh'`) so photos don't fall on wrong day.
- `purchased_at` separate from `created_at` (real purchase date vs entry date).
- Reports: **push aggregation down to Postgres** (GROUP BY/SUM), don't pull rows to client.
- Free tier: ~40-50 entries/month soft cap + only last **3 months** visible (older = blur/lock, never deleted). Enforced **server-side** (don't trust client). `EntitlementGuard` (NestJS) gates Pro endpoints; over-cap create → `402`.
- OCR (Pro, later) = AWS Textract reads S3 object → prefill only, user edits.

## Roadmap (DESIGN.md §13) — backend-first principle

0 Setup · 1 Auth · 2 Entries CRUD+calendar · 3 Uploads(S3 presign) · 4 Reports · 5 Mobile MVP(camera) · 6 Mobile calendar · 7 Mobile stats · 8 Mobile map · 9 Deploy · 10 Freemium · 11 OCR/export/etc · 12 AI.

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
  - DELETE has `TODO Phase 3`: also delete S3 object at photoKey.
  - **Known limit**: `search`/`store` use Prisma `contains insensitive` = diacritic-literal (`muống`≠`muong`). Diacritic-insensitive needs Postgres `unaccent` ext — defer.
- **Next: Phase 3 — Uploads** (S3 presigned PUT/GET URLs), then Phase 4 Reports.
- Toolchain: Node v20.19.2, npm 11.6.2, Docker 29.4.2.

## Local dev gotchas

- **DB = shared Postgres container `postgres` on host port 2345** (NOT the compose db). `.env` `DATABASE_URL=...@localhost:2345/price_tracker`. `docker-compose.yml` db service removed; `api` service uses `host.docker.internal:2345`. Project no longer manages its own PG container.
- Schema lives on that 2345 db (init migration applied). Can't `docker exec` into `postgres` container (not created by us → auto-mode blocks); inspect DB via Prisma from host instead.
- **Package manager = pnpm (NOT npm).** User preference. `pnpm@10.34.3`, lockfile `pnpm-lock.yaml`. The earlier `.pnpm`/`.ignored` mess + npm arborist crash came from mixing npm over a pnpm-style tree — don't run `npm install` here.
  - `package.json` has `pnpm.onlyBuiltDependencies: [@prisma/client, prisma, @nestjs/core]` so `pnpm install` runs prisma generate automatically (pnpm v10 blocks build scripts by default). If prisma client missing after install: `pnpm exec prisma generate`.
- **Avoided bcrypt native addon** → using **bcryptjs** (pure JS) instead. DESIGN.md says bcrypt; bcryptjs is API-compatible drop-in.
- Install: `pnpm install`. Run: `pnpm run start:dev`. Build: `pnpm run build`. Migrate: `pnpm exec prisma migrate dev`.
- Dockerfile uses corepack + pnpm.
- git initialized at project root; files **staged but not committed** (awaiting user go-ahead).
- ⚠️ `~/.npmrc` contains a plaintext npm `_authToken` (user's home config, not in repo) — heads-up for the user to rotate if unintended; out of project scope.
