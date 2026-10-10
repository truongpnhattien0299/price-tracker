# Plan 04 — CRUD entry trên web (thêm / sửa / xoá, upload ảnh)

**Phụ thuộc:** Plan 02 (hooks, `DeleteEntryDialog`), Plan 03 (`EntryDetailDialog`, `Photo`, batch URL), storage R2 ([docs/storage-r2.md](../docs/storage-r2.md)).

## Mục tiêu

- **Thêm** khoản chi từ web, có thể kèm ảnh. Ảnh chọn từ máy, được nén giống mobile rồi PUT thẳng lên storage.
- **Sửa** mọi trường của một entry:
  - Ảnh: thay hoặc bỏ.
  - Giá, tên, danh mục, đơn vị, cửa hàng, địa chỉ, ghi chú, giờ mua.
- **Xem chi tiết** từ trang Khoản chi. Bấm một dòng mở `EntryDetailDialog` (đã có từ plan 03) và ghi `?entry=<id>` lên URL, nên F5 và share link vẫn mở đúng entry.
- Xoá đã có từ plan 02/03, giữ nguyên.

Toạ độ GPS không sửa trên web. Chọn vị trí trên bản đồ thuộc Phase 8 (mobile). Web giữ nguyên lat/long cũ.

## Backend: lỗ hổng phải vá trước

Đọc `entries.service.ts` thấy hai vấn đề.

### 1. `photoKey` không được kiểm quyền khi create/update

Client gửi `photoKey` của user khác thì vẫn được lưu. Đọc ảnh thì `photo-url(s)` chặn 403, nên không lộ ảnh. Nhưng khi **xoá entry**, backend gọi `deleteObject(entry.photoKey)`, tức là **xoá được ảnh của người khác**.

Sửa:

- `create` / `update` kiểm `photoKey` có prefix `entries/<userId>/`. Sai thì 403, cùng quy tắc với `photo-url`.
- Đưa helper `assertOwnKey` từ controller xuống `UploadsService.assertOwnKey` để `EntriesService` dùng chung.

### 2. PATCH với `null` ở cột NOT NULL ra 500

`UpdateEntryDto` là `PartialType` với `@IsOptional`, nên `null` lọt qua validation.

- `price: null` làm `new Prisma.Decimal(null)` ném lỗi.
- `currency: null` / `purchasedAt: null` bị Prisma từ chối.

Cả hai thành 500. Sửa: các cột này mà nhận `null` thì trả 400. Các cột nullable (`productName`, `unit`, `photoKey`, `storeName`, …) vẫn nhận `null` để **xoá giá trị**.

### 3. Thay / bỏ ảnh để lại object mồ côi

PATCH đổi `photoKey` (sang key mới hoặc `null`) thì sau khi update thành công, xoá best-effort object cũ, giống `remove`.

## Thiết kế web

### Upload ảnh (`lib/image.ts`, `hooks/queries/use-upload-photo.ts`)

1. `compressImage(file)`:
   - `createImageBitmap(file, { imageOrientation: "from-image" })` để xoay đúng ảnh chụp dọc.
   - Canvas thu về rộng tối đa **1080px**, xuất **JPEG 0.7**. Giống `mobile/src/lib/image.ts`, nên ảnh web và mobile cùng chuẩn.
2. `uploadsApi.presign({ contentType: "image/jpeg", ext: "jpg" })` → `{ uploadUrl, photoKey }`.
3. `fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } })`. Content-Type phải khớp với lúc ký. **Không** đi qua BFF; bytes ảnh đi thẳng lên storage.
4. Trả `photoKey` để đưa vào `POST` / `PATCH /entries`.

- File nhận vào là `image/jpeg|png|webp`, tối đa 15 MB trước khi nén. HEIC không decode được trên Chrome; iPhone chọn ảnh qua Safari thường tự đổi sang JPEG.
- **CORS:** đây là chỗ đầu tiên browser PUT thẳng lên storage.
  - MinIO local cho phép mọi origin mặc định.
  - R2 phải thêm `http://localhost:3001` và domain web prod vào CORS policy (docs/storage-r2.md §4).
- Upload xong mà lưu entry lỗi thì object thành mồ côi. Chấp nhận được; đã ghi ở mục dọn ảnh mồ côi trong docs.

### Hooks

| Hook | Ghi chú |
|---|---|
| `useEntry(id, initial?)` | `qk.entries.detail(id)`. `initialData` lấy từ dòng trong list hoặc calendar, nên mở dialog không phải chờ. Dialog chi tiết luôn đọc từ đây, nên sau khi sửa thì hiện dữ liệu mới. |
| `useCreateEntry()` | `POST /entries` |
| `useUpdateEntry()` | `PATCH /entries/:id`. Thành công thì `setQueryData(detail)`. |
| Cả hai | Invalidate `entries`, `calendar`, `reports`, giống xoá. Gom vào helper `invalidateEntryData`. |

### Form (`entry-form-dialog.tsx`)

Một dialog dùng cho cả thêm và sửa. `FieldGroup` + `Field` theo skill shadcn.

| Field | Control | Ghi chú |
|---|---|---|
| Ảnh | Ô chọn file + preview + nút "Bỏ ảnh" / "Đổi ảnh" | Preview dùng `URL.createObjectURL`. Khi sửa, hiện ảnh cũ qua `usePhotoUrl`. |
| Giá * | `InputGroup` + hậu tố `₫` | VND chỉ nhận số nguyên, hiện phân cách nghìn khi gõ. Entry khác VND (hiếm) nhận tối đa 2 số lẻ. Phải > 0. |
| Tên sản phẩm | `Input` | ≤ 120 |
| Danh mục | `Select` | Có lựa chọn "Không có" |
| Đơn vị | `Input` | ≤ 20, vd. "kg", "bó" |
| Cửa hàng | `Input` | ≤ 120 |
| Địa chỉ | `Input` | ≤ 255 |
| Giờ mua * | `Input type="datetime-local"` | Hiểu theo **giờ VN** dù máy ở múi giờ khác (`toVnInput` / `fromVnInput` trong `date-range.ts`). Mặc định là bây giờ. Không cho chọn tương lai. |
| Ghi chú | `Textarea` | ≤ 500 |

- **Sửa chỉ gửi trường đã đổi.** Trường text bị xoá trắng thì gửi `null` để xoá ở backend.
- **Submit:** nén + upload ảnh (nếu có ảnh mới) → POST/PATCH. Nút hiện spinner và trạng thái "Đang tải ảnh…" / "Đang lưu…". Trong lúc chạy không đóng được dialog.
- **Lỗi:** dùng `Alert` trong form. 400 thì báo kiểm tra lại dữ liệu; upload lỗi thì báo riêng (thường do CORS hoặc mạng).

### Chỗ gắn UI

- **Trang Khoản chi:**
  - Nút **"Thêm khoản chi"** ở `PageHeader`.
  - Cột cuối của bảng là menu `⋯` (DropdownMenu) gồm **Sửa** và **Xoá**.
  - Bấm tên sản phẩm mở dialog chi tiết, ghi `?entry=<id>`.
  - Deep link có id không tồn tại (404) thì toast và bỏ param.
- **Dialog chi tiết** (calendar + entries): footer có **Sửa** và **Xoá**. Sửa mở form chồng lên; lưu xong, dialog chi tiết hiện dữ liệu mới.
- **Calendar:** sửa giờ mua sang ngày khác thì lưới ngày và ô lịch tự cập nhật nhờ invalidate.

## Các bước

1. **Backend:**
   - `UploadsService.assertOwnKey`, dùng ở controller và `EntriesService.create/update`.
   - Trả 400 khi PATCH `price|currency|purchasedAt = null`.
   - PATCH đổi ảnh thì xoá ảnh cũ.
   - Cập nhật DESIGN.md §5.2 và Memory.md.
2. **Web API:** `entriesApi.create/update`, `uploadsApi.presign`, type `EntryInput`.
3. `lib/image.ts` (`compressImage`), `lib/date-range.ts` (`toVnInput` / `fromVnInput`).
4. Hooks: `useEntry`, `useCreateEntry`, `useUpdateEntry`, `useUploadPhoto`.
5. Thêm shadcn `textarea`, `input-group`.
6. `entry-form-dialog.tsx`.
7. Gắn UI:
   - `EntryDetailDialog` thêm Sửa và đọc qua `useEntry`.
   - `EntriesTable` thêm menu thao tác và tên bấm được.
   - `EntriesView` thêm `?entry=` và nút Thêm.
8. Verify, cập nhật `CLAUDE.md` + README.

## Verify

Chạy 2026-10-10 trên tài khoản test B (dữ liệu plan 02/03), MinIO local.

- [x] **Thêm có ảnh:** PNG 2400×1600 (3.4 MB) + giá gõ `045000` (hiện `45.000`) + danh mục Rau củ.
  - Request: `presign` → PUT thẳng `localhost:9000` → `POST /entries` 201.
  - Ảnh lưu là JPEG 1080×720, 10 KB.
  - `purchasedAt` 10:37 VN = `03:37Z`. Dòng mới đứng đầu bảng, có toast.
- [x] **Mở chi tiết:** bấm tên ghi `?entry=<id>`. F5 mở lại đúng dialog, lúc này có `GET /entries/:id`. Esc thì bỏ param.
- [x] **Sửa từ dialog chi tiết** (giá 52000, cửa hàng, giờ 9/10 19:15): PATCH chỉ có `{price, storeName, purchasedAt: "…12:15Z"}`. Dialog hiện ngay giá trị mới.
- [x] **Sửa từ menu ⋯** (xoá trắng cửa hàng + đổi ảnh WebP): PATCH `{storeName: null, photoKey: <mới>}`. Object cũ 404 trên MinIO, mới 200. Sau khi đóng, `body` không còn `pointer-events: none`.
- [x] **Từ calendar** (Sheet 9/10 → chi tiết → Sửa → bỏ ảnh + giờ 10/10 09:00):
  - PATCH `{purchasedAt, photoKey: null}`, không có `price` vì giá không đổi.
  - Sheet 9/10 còn 1 khoản; lịch hiện 9/10 = 1 và 10/10 = 1.
- [x] **Validation:** giá trống báo "Nhập giá lớn hơn 0.", giờ 11/10 báo "Giờ mua không được ở tương lai.". Không gửi request nào.
- [x] `?entry=<uuid lạ>`: 1 toast "Không tìm thấy khoản chi này.", param bị bỏ, không mở dialog.
- [x] **Backend** (`t04.py`):
  - `photoKey` của user khác → 403 ở cả POST lẫn PATCH. Object của A không bị đụng.
  - PATCH `price|currency|purchasedAt: null` → 400. `price: 0` → 400. `storeName: null` → 200.
  - Đổi ảnh: object cũ 404. PATCH trường khác: ảnh giữ nguyên. Bỏ ảnh: object 404.
- [x] **Datetime khác múi giờ:** `toVnInput` / `fromVnInput` chạy dưới `TZ=America/New_York` và `Asia/Tokyo` cho kết quả như nhau, round-trip đúng (`17:30Z` ↔ `10/10 00:30`).
- [x] **Mobile 375px:** `scrollWidth` 375, dialog rộng 343, cuộn dọc được.
- [x] typecheck + lint + build pass (web), `tsc` backend pass.
- [ ] **Thông báo lỗi upload khi thiếu CORS trên R2:** chưa thử, vì MinIO local cho mọi origin.

### Lệch so với thiết kế

- **Lỗi layout có từ plan 03:** dialog chi tiết ở màn thấp (cao 506px) bị ảnh đè lên nội dung và không cuộn được.
  - Nguyên nhân: `Photo` có `overflow-hidden`, nên khi là grid item thì min-height bằng 0 và hàng bị co.
  - Sửa bằng `auto-rows-max` trên `DialogContent`.
- **Invalidate sau khi ghi bỏ qua detail của chính entry vừa ghi.** Sau update thì detail vừa được set từ response; sau delete thì refetch chỉ ra 404. `useEntry` có thêm `enabled` để dialog đang đóng không refetch.
- **Nút "Thêm khoản chi" nằm ở thanh filter, không ở `PageHeader`.** Page là server component, còn state của form nằm trong `EntriesView`.
- **Form một cột.** Skill shadcn yêu cầu `FieldGroup` + `Field` và không dùng `div grid` để dàn form.

## Ngoài phạm vi

- Chọn vị trí trên bản đồ, sửa lat/long (Phase 8).
- Blurhash (mobile cũng chưa sinh).
- Dán ảnh từ clipboard / kéo-thả nhiều ảnh cùng lúc.
- Dọn ảnh mồ côi khi lưu entry lỗi sau upload.
- Trần entry gói Free (plan 07 / backend Phase 10).
