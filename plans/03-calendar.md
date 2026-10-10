# Plan 03 — Calendar: lưới ảnh theo tháng

**Phụ thuộc:** Plan 02 (React Query, `qk.calendar`, `usePhotoUrl`, `DeleteEntryDialog`).

## Mục tiêu

`/dashboard/calendar` thành lưới ảnh tháng đúng DESIGN.md §9.3:

- Mỗi ô ngày có entry hiện **ảnh đầu tiên trong ngày** (`coverPhotoKey`).
- Lịch **chỉ hiện ảnh, không hiện tiền** (§8).
- Chạm ngày → lưới ảnh của ngày đó. Chạm ảnh → chi tiết entry (ảnh lớn + giá, danh mục, cửa hàng, vị trí, ghi chú), có nút xoá.
- Sửa entry thuộc plan 04.

## Vấn đề: rate limit + BFF

Backend có `ThrottlerGuard` 60 req/phút **theo IP**. Qua BFF, mọi request tới NestJS đều từ IP của server Next.

Lưới tháng cần tới 31 presigned URL. Gọi `GET /uploads/photo-url` từng cái thì chỉ 2 lần đổi tháng là 429.

**Quyết định:** thêm endpoint batch ở backend.

| Method | Endpoint | Body → Trả về |
|---|---|---|
| POST | `/uploads/photo-urls` | `{ keys: string[] }` (1–100, unique) → `{ urls: Record<key, url> }` |

- Kiểm quyền giống `photo-url`: có key nào không bắt đầu bằng `entries/<userId>/` thì 403 cả request.
- Presign là phép ký cục bộ, không gọi S3, nên batch 100 key vẫn rẻ.
- Dùng POST vì danh sách key có thể dài (100 × ~70 ký tự).
- Mobile sau này dùng lại được cho màn lịch.

Throttle theo IP sau BFF vẫn là vấn đề chung, không riêng gì calendar: mọi user web chung một bucket. Xử lý ở mục *Ngoài phạm vi*.

## Thiết kế

### URL

`/dashboard/calendar?month=YYYY-MM&day=YYYY-MM-DD`

- `month` mặc định là tháng hiện tại theo giờ VN.
- Không cho đi quá tháng hiện tại.
- `day` mở Sheet chi tiết ngày.
- Ghi bằng `router.replace`, giống filter entries, nên F5 giữ nguyên và share link được.

Entry đang xem để ở local state, không đưa lên URL. Deep link tới entry thuộc plan 04 (`useEntry(id)`).

### Date helpers (`lib/date-range.ts`)

Ngày/tháng tính theo VN (UTC+7) như plan 02.

- `currentMonthKey()`: `"2026-10"`.
- `todayKey()`: `"2026-10-10"`.
- `shiftMonth("2026-01", -1)`: `"2025-12"`.
- `monthGrid("2026-10")`: mảng ô cho lưới 7 cột, **thứ Hai đầu tuần** (lịch VN). Ô đệm đầu tháng là `null`, các ô còn lại là `"YYYY-MM-DD"`.

Lưới tính thuần từ năm/tháng, không đụng `Date` local của browser.

### Data

| Hook | Ghi chú |
|---|---|
| `useCalendar(month)` | `qk.calendar.month(month)`. `keepPreviousData` để đổi tháng không chớp. |
| `usePhotoUrls(keys)` | `qk.photoUrls(keys)` với keys đã sort + unique. `staleTime` 4 phút. Sau khi fetch, ghi từng URL vào cache `qk.photoUrl(key)` để `usePhotoUrl` ở dialog chi tiết ăn cache, không gọi lại. |
| `useEntries({ from, to, limit: 100 })` | Entry của 1 ngày, range lấy từ `dayKeysToRange(day, day)`. Dùng lại hook có sẵn. |

- Đã có sẵn: mutation xoá invalidate `calendar.all`, nên xoá entry thì ảnh bìa ô ngày tự cập nhật.
- Presigned URL đổi mỗi lần refetch, nên browser tải lại ảnh. Chấp nhận được với `staleTime` 4 phút.

### Ảnh (`components/shared/photo.tsx`)

`<Photo src alt />` dùng `<img>` thường, không dùng `next/image`:

- Presigned URL có chữ ký đổi liên tục và hết hạn sau 5 phút, nên optimizer của Next cache vô ích.
- Không phải khai báo `remotePatterns` cho host S3 / MinIO.

Có skeleton khi chưa có URL hoặc ảnh đang tải. Lỗi (URL hết hạn, 403 ở gói Free của plan 07) thì hiện icon `ImageOff`.

### UI

- **Thanh tháng:** nút ‹ / › và tên tháng ("Tháng 10, 2026"). Nút "Hôm nay" chỉ hiện khi đang ở tháng khác. › bị disable ở tháng hiện tại.
- **Lưới:** 7 cột, ô `aspect-square`, header T2…CN.
  - Ô có ảnh bìa: ảnh `object-cover`, số ngày đè ở góc. Nếu `count > 1` thì thêm badge số lượng (số khoản, không phải tiền).
  - Ô có entry nhưng không ảnh: nền muted + icon.
  - Ô trống: chỉ số ngày.
  - Hôm nay có `ring`. Ngày tương lai mờ.
  - Ô có entry là `<button>` có `aria-label` (ví dụ "10 tháng 10, 3 khoản chi"). Ô trống không bấm được.
- **Loading:** skeleton cả lưới. **Error:** `ErrorState` + thử lại. Tháng không có entry: lưới trống + dòng gợi ý chụp bằng app mobile.
- **Sheet chi tiết ngày** (`day-sheet.tsx`):
  - Tiêu đề là ngày, mô tả "N khoản chi".
  - Nội dung là lưới ảnh vuông 2–3 cột, mỗi tile kèm tên sản phẩm. Entry không ảnh thì tile placeholder.
  - Trên mobile dùng `side="bottom"`.
- **Dialog chi tiết entry** (`entry-detail-dialog.tsx`):
  - Ảnh lớn, giá, danh mục (`useCategoryMap`), cửa hàng, địa chỉ, ghi chú, giờ mua.
  - Nút "Xoá" mở `DeleteEntryDialog`. Xoá xong thì đóng dialog. Nếu ngày hết entry thì đóng luôn Sheet.

## Các bước

1. **Backend:**
   - `PhotoUrlsDto` (`@IsArray @ArrayMinSize(1) @ArrayMaxSize(100) @ArrayUnique @IsString({each})`).
   - `POST /uploads/photo-urls` trong `UploadsController`. Kiểm prefix và gọi `presignGet` từng key.
   - Cập nhật DESIGN.md §5.3.
2. **Web API:** `uploadsApi.photoUrls(keys)`, `qk.photoUrls(keys)`, hook `usePhotoUrls`.
3. `lib/date-range.ts`: thêm `currentMonthKey`, `todayKey`, `shiftMonth`, `monthGrid`.
4. `hooks/queries/use-calendar.ts`.
5. `components/shared/photo.tsx`.
6. `components/dashboard/calendar-view.tsx` (thanh tháng + lưới), `day-sheet.tsx`, `entry-detail-dialog.tsx`.
7. `calendar/page.tsx` render `<CalendarView />` trong `<Suspense>` (vì dùng `useSearchParams`). Xoá TODO.
8. Seed ảnh test: presign → PUT lên MinIO → `POST /entries`, gồm vài ngày nhiều ảnh, 1 entry không ảnh, 1 entry biên ngày `17:30Z`.
9. Cập nhật `CLAUDE.md` + bảng trạng thái.

## Verify

Đã chạy 2026-10-10 trên tài khoản test có 25 entry (plan 02) cộng 9 entry seed bằng script: PNG → presign → PUT MinIO → `POST /entries`. 2/10 tạo lệch thứ tự giờ mua, 1 entry không ảnh, 1 entry `2026-10-09T17:30Z`.

- [x] Ô ngày hiện ảnh **đầu tiên** của ngày. Ảnh 08:00 ngày 2/10 làm bìa dù được tạo sau. Entry `17:30Z` rơi vào 10/10; entry `2026-09-30T17:30Z` của plan 02 nằm ở 1/10, không ở 30/9.
- [x] Lưới tháng: **1** `calendar` + **1** `photo-urls`, không có `photo-url` lẻ.
- [x] Mở dialog chi tiết không bắn `photo-url` (ăn cache do batch ghi sẵn).
- [x] ‹ ›: URL đổi `?month=2026-09`, nút "Hôm nay" hiện, › disable ở tháng hiện tại. F5 với `?day=` mở lại đúng Sheet.
- [x] Sheet đúng số entry, xếp theo giờ tăng dần. Dialog đúng giá, danh mục, cửa hàng, giờ VN.
- [x] Xoá entry duy nhất của ngày 10/10 trong dialog: toast, dialog + Sheet đóng, `?day` bị bỏ, ô 10 trống, mô tả tháng cập nhật.
- [x] Ngày có entry không ảnh: ô nền muted (icon chỉ hiện từ `sm`), tile placeholder.
- [x] `?month=2027-01` / `abc` / `2026-13` → tháng hiện tại. `?day=` ngoài tháng hoặc `2026-10-32` → không mở Sheet.
- [x] Backend `photo-urls`: key user khác → 403; rỗng, 101 key, trùng, không phải string → 400.
- [x] Mobile 375px: ô 41px, `scrollWidth` = 375, Sheet từ dưới, 3 cột. Desktop: Sheet bên phải, card giới hạn `max-w-3xl`.
- [x] typecheck + lint + build pass (web); `nest build` pass (backend).
- [ ] Fallback `ImageOff` khi URL hết hạn / 403: đã code, chưa ép được lỗi để test.

### Lệch so với thiết kế

- Mô tả tháng hiện "N khoản chi trong M ngày" (đếm, không có tiền, vẫn đúng §8).
- Sheet dùng container query (`@lg:grid-cols-4`), vì độ rộng Sheet không theo viewport.
- `DeleteEntryDialog` / `EntryDetailDialog` có thêm `onDeleted` để đóng lớp ngoài sau khi xoá.
- Chạy `nest build` khi `start:dev` đang watch sẽ xoá `dist/` và làm watcher chết (`Cannot find module './app.module'`). Muốn build thì dừng watcher trước.

## Ngoài phạm vi

- **Throttle sau BFF:** backend nên đọc IP thật qua `X-Forwarded-For` (trust proxy + BFF forward IP client), hoặc throttle theo `userId`. Ghi nhận, làm cùng đợt deploy.
- Sửa entry, deep link `?entry=` (plan 04).
- Khoá ảnh > 3 tháng ở gói Free (plan 07). `Photo` đã có fallback khi lỗi.
- Blurhash placeholder (`entry.blurhash`): mobile chưa sinh blurhash, để sau.
