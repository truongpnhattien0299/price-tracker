# Plan 09 — Cửa hàng (store): user tự tạo, admin duyệt lên global

**Phụ thuộc:** Plan 04 (form entry), Plan 08 (location picker, Photon search). Backend làm trước, rồi web. Mobile làm sau (capture sheet chọn store).

## Mục tiêu

OSM thiếu phần lớn quán nhỏ / tạp hoá / sạp chợ ở VN, nên tìm kiếm Photon và POI trên bản đồ không đủ. Thay vào đó app có **bảng cửa hàng riêng**:

- User tự tạo cửa hàng (tên + vị trí, địa chỉ tuỳ chọn). Cửa hàng mới là **personal**: chỉ người tạo thấy.
- Chọn cửa hàng trong form entry thì **không phải chọn toạ độ nữa**: vị trí lấy từ cửa hàng.
- User **đề xuất công khai** → admin duyệt → **global**: mọi user thấy và chọn được. Từ lúc global, người tạo không sửa / xoá được nữa; chỉ admin.

## Hiện trạng trước plan

- `Entry` lưu `storeName`, `address`, `latitude`, `longitude` dạng tự do; mỗi entry chọn vị trí lại từ đầu (EXIF → GPS → search Photon → ghim tay).
- `User` không có role, repo chưa có khái niệm admin.
- Tìm theo tên dùng `contains insensitive`, phân biệt dấu (`muống` ≠ `muong`).

## Quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| S1 | Admin | Enum `Role { user, admin }` trên `User`, mặc định `user`. Set admin bằng script `pnpm run admin:grant <email>` (hoặc Prisma Studio). **Không** đưa role vào JWT: `AdminGuard` đọc role từ DB mỗi request, nên cấp / thu quyền có hiệu lực ngay, không phải chờ access token 15 phút hết hạn. Endpoint admin hiếm, thêm một query không đáng kể. Non-admin → `403`. `/auth/me` trả thêm `role` để web hiện menu. |
| S2 | Trạng thái store | Enum `StoreStatus { personal, pending, global }`. `personal` → (user đề xuất) `pending` → (admin duyệt) `global`, hoặc (admin từ chối / user rút lại) về `personal` kèm `reviewNote`. Không có đường global → personal: entry của user khác đang trỏ vào nó. |
| S3 | Ai thấy store | User thấy store `global` + store của chính mình (mọi status). Store của người khác chưa global → `404`, như entry. Admin chỉ thấy store **pending** và **global**: store personal là dữ liệu riêng, admin không soi. |
| S4 | Ai sửa / xoá | Người tạo sửa / xoá store `personal` hoặc `pending` của mình. Store `global` → `403` code `STORE_GLOBAL` cho cả người tạo. Admin sửa / xoá store pending và global, tạo thẳng store global. |
| S5 | Vị trí bắt buộc | Store luôn có `latitude` + `longitude` (NOT NULL): ý nghĩa của store là "nó luôn nằm ở đó". `address` tuỳ chọn. Tạo store dùng lại location picker của Plan 08 (search Photon, chạm bản đồ, "Vị trí hiện tại"). |
| S6 | Entry ↔ store | `Entry.storeId` FK nullable, `onDelete: SetNull`, **đồng thời copy snapshot** `storeName` / `address` / `latitude` / `longitude` từ store vào entry. Nhờ vậy bản đồ, báo cáo top-stores, filter `store` không phải sửa, và xoá store thì entry vẫn giữ vị trí. |
| S7 | Giữ snapshot đúng | Create / PATCH entry có `storeId` → server ghi đè 4 trường snapshot từ store, bỏ giá trị client gửi. PATCH sửa tay một trong 4 trường mà không gửi `storeId` → tự bỏ liên kết (`storeId = null`): entry không còn khớp store. Sửa store (tên / địa chỉ / toạ độ) → `updateMany` mọi entry trỏ tới nó, kể cả entry của user khác (với store global). |
| S8 | Tìm không dấu | Cột `nameSearch` = tên bỏ dấu, chữ thường, `đ→d`, tính trong JS lúc ghi (`common/normalize.util.ts`). Tìm bằng `name_search LIKE %q%` sau khi chuẩn hoá `q` cùng cách. Không cần extension `unaccent`. Entry search giữ nguyên (ngoài phạm vi). |
| S9 | Thứ tự gợi ý | `GET /stores?q&lat&lng`: có `lat/lng` → xếp theo khoảng cách (xấp xỉ phẳng `Δlat² + (Δlng·cos lat)²`, đủ cho vài km, không cần PostGIS). Không có → store user dùng nhiều nhất trước (đếm entry của chính user), rồi theo tên. Trả `distanceM` khi có toạ độ. |
| S10 | Trùng lặp | Hai user tạo cùng một Circle K rồi cùng đề xuất. Admin có **gộp**: `POST /admin/stores/:id/merge { targetId }` (target phải global) chuyển mọi entry sang target (cập nhật snapshot) rồi xoá store nguồn. Không tự phát hiện trùng; trang admin hiện store global gần đó (≤ 100 m) cạnh mỗi đề xuất để admin quyết. |
| S11 | Giới hạn | Tối đa **300 store personal/pending** mỗi user (`400` khi vượt), chặn spam. Không gắn với Free/Pro. |
| S12 | Dữ liệu cũ | Entry cũ giữ nguyên `storeId = null`. Không tự sinh store từ `storeName` cũ (tên tự do, vị trí không chắc). |

## Backend

1. **Prisma** (migration `stores`):
   ```prisma
   enum Role { user admin }
   enum StoreStatus { personal pending global }

   model User { … role Role @default(user) … stores Store[] }

   model Store {
     id         String      @id @default(uuid()) @db.Uuid
     ownerId    String?     @map("owner_id") @db.Uuid   // người tạo; null nếu admin tạo hoặc user bị xoá
     name       String
     nameSearch String      @map("name_search")
     address    String?
     latitude   Decimal     @db.Decimal(10, 7)
     longitude  Decimal     @db.Decimal(10, 7)
     status     StoreStatus @default(personal)
     reviewNote String?     @map("review_note")
     proposedAt DateTime?   @map("proposed_at")
     createdAt  DateTime    @default(now()) @map("created_at")
     updatedAt  DateTime    @updatedAt @map("updated_at")
     owner   User?   @relation(fields: [ownerId], references: [id], onDelete: SetNull)
     entries Entry[]
     @@index([status])
     @@index([ownerId])
     @@map("stores")
   }

   model Entry { … storeId String? @map("store_id") @db.Uuid
                 store Store? @relation(fields: [storeId], references: [id], onDelete: SetNull)
                 @@index([userId, storeId]) }
   ```
2. `auth/guards/admin.guard.ts` (`AdminGuard`, đọc role từ DB). `scripts/grant-admin.mjs` (`node --env-file=.env.local scripts/grant-admin.mjs <email> [--revoke]`).
3. Module `stores/`:
   - `GET /stores?q&lat&lng&limit` — store thấy được (S3, S8, S9). Mỗi item `{ id, name, address, lat, lng, status, mine, distanceM? }`.
   - `GET /stores/mine` — store của mình, mọi status, kèm `reviewNote`, `entryCount`.
   - `POST /stores`, `PATCH /stores/:id`, `DELETE /stores/:id` (S4, S11). Sửa store `pending` vẫn để pending.
   - `POST /stores/:id/propose` (personal → pending), `POST /stores/:id/withdraw` (pending → personal).
   - `StoresService.snapshot(store)` + `assertUsable(userId, storeId)` cho `EntriesService`.
4. `stores/admin-stores.controller.ts` (route `admin/stores`, `JwtAuthGuard` + `AdminGuard`, cùng module `stores/` vì dùng chung service):
   - `GET /admin/stores?status=pending|global&q&page` — pending kèm `nearbyGlobal` (≤ 100 m, S10), tên người đề xuất.
   - `POST /admin/stores` (tạo global), `PATCH /admin/stores/:id`, `DELETE /admin/stores/:id` (pending | global).
   - `POST /admin/stores/:id/approve`, `/reject { note }`, `/merge { targetId }`.
5. `EntriesService`: DTO thêm `storeId?: string | null` (S6, S7). Store không thấy được → `400 Invalid storeId`.

## Web

1. `types/api.ts` (`Store`, `MyStore`, `AdminStore`, `role` trong `User`), `lib/api/endpoints.ts`, key `stores` trong `lib/query/keys.ts`, hooks `hooks/queries/use-stores.ts`. Mutation store invalidate `stores` **và** `entries` / `calendar` / `reports` / map (snapshot có thể đổi).
2. **Form entry** (`entry-form-dialog.tsx`): ô **Cửa hàng** (combobox) đứng đầu phần vị trí.
   - Gợi ý theo khoảng cách từ toạ độ ảnh / GPS nếu có, gõ để tìm (không dấu). Badge "Của bạn" / "Công khai".
   - Chọn store → ẩn ô địa chỉ + location picker, hiện thẻ store (tên, địa chỉ, badge) + nút "Bỏ chọn" (giữ lại tên / địa chỉ / vị trí làm text tự do). EXIF / GPS không ghi đè.
   - Mục cuối "Tạo cửa hàng ‘…’" → dialog tạo store (tên điền sẵn, vị trí lấy từ toạ độ đang có của form, chỉnh bằng location picker).
   - Không chọn store → hành vi cũ của Plan 08, không đổi.
3. Trang **`/dashboard/stores`** ("Cửa hàng"): danh sách store của mình, badge trạng thái, số entry, ghi chú từ chối. Sửa / xoá (khoá khi global), đề xuất / rút đề xuất.
4. Trang **`/dashboard/admin/stores`**: tab "Chờ duyệt" (duyệt / từ chối có ghi chú / gộp vào store global gần đó / sửa trước khi duyệt) và "Công khai" (sửa / xoá, tạo mới). Mục sidebar chỉ hiện khi `role === 'admin'`; trang tự chặn non-admin, backend vẫn là chỗ enforce.

## Verify

- Migration chạy, entry cũ không đổi.
- User A tạo store → B không thấy (`GET /stores`, `GET /stores/:id` → 404, gắn vào entry → 400).
- A tạo entry với store → entry có snapshot đúng, không gửi toạ độ. A sửa store → entry đổi theo, bản đồ chấm đúng chỗ mới.
- A đề xuất → admin thấy ở "Chờ duyệt", non-admin gọi `/admin/*` → 403. Duyệt → B thấy và chọn được; A sửa / xoá → 403 `STORE_GLOBAL`.
- Admin sửa store global → entry của cả A và B đổi snapshot. Admin xoá → entry giữ tên + vị trí, `storeId = null`.
- Gộp: store pending của C gộp vào global → entry của C trỏ sang global, store của C biến mất.
- Tìm "bach hoa" ra "Bách Hoá Xanh". Có `lat/lng` → gần nhất trước.
- `typecheck`, `lint`, `build` (web), `nest build` (backend).

## Kết quả verify (2026-10-11)

- Migration `20261011054537_stores` chạy trên Postgres local (`.env.local`, `:2345`). **Neon chưa chạy**: Render tự `prisma migrate deploy` lúc deploy.
- Backend: script e2e 37 case (scratchpad, không commit) pass hết: ẩn store riêng (404 / 400), snapshot lúc tạo + lúc sửa store, sửa nửa toạ độ → 400, tìm không dấu, sort khoảng cách, `/admin/*` → 403 cho non-admin, admin không thấy store personal, propose / withdraw / reject có note / approve, `STORE_GLOBAL` 403, admin sửa global → entry của 2 user đổi theo, sửa tay vị trí → bỏ liên kết, gộp có `nearbyGlobal`, xoá store (user / admin) → entry giữ snapshot, `/auth/me` có `role`.
- Web (browser pane): gõ tên → "Tạo cửa hàng “…”" → dialog lồng (tên điền sẵn, chặn khi chưa có vị trí, chạm bản đồ → địa chỉ tự điền) → tạo xong tự gắn vào entry, **không** submit form entry (dialog đặt ngoài `<form>`: React submit event bubble qua portal). Entry lưu `storeId` + snapshot. Gõ "co tu" ra "Tạp hoá Cô Tư". Trang Cửa hàng: đề xuất → badge "Chờ duyệt". Trang admin: thấy đề xuất, duyệt → tab Công khai. Sidebar có nhóm "Quản trị" khi role admin.
- `typecheck`, `lint`, `next build` (web), `tsc` (backend) sạch.

### Lệch so với plan

- Admin controller nằm trong module `stores/`, không tách module `admin/`.
- Thẻ store trong form entry chưa có bản đồ nhỏ; chi tiết entry chưa có badge store.

## Ngoài phạm vi

- Mobile (capture sheet chọn store) — plan sau.
- Tự phát hiện store trùng, gợi ý store từ POI OSM / Goong.
- Filter entry theo `storeId`, báo cáo theo store id (top-stores vẫn group theo tên snapshot).
- Bỏ dấu cho search entry (`unaccent`).
