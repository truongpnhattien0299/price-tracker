# Plan 07 — Entitlement: trial, trần Free, khoá lịch sử > 3 tháng

**Phụ thuộc:** Plan 02–04 (dashboard đọc API thật). Plan này làm luôn phần backend của **Phase 10** (DESIGN.md §13): `/me/entitlement`, trần entry `402`, khoá dữ liệu ngoài cửa sổ 3 tháng. Phần thanh toán thật (RevenueCat / IAP / webhook) **không** nằm ở đây.

## Hiện trạng

- Backend đã cấp trial 30 ngày khi đăng ký (`proSource='trial'`, `proExpiresAt`). `isPro()` tính động, nhưng **chưa endpoint nào dùng**: Free và Pro thấy y hệt nhau.
- Chưa có `/me/entitlement`. Web tự tính gói từ `proExpiresAt` ở trang Cài đặt (`planOf`).
- `ReportsView` đã chờ sẵn `402/403` cho báo cáo năm, nhưng backend chưa bao giờ trả.
- Landing ghi Free "50 khoản chi / tháng, xem rõ 3 tháng" (`config/pricing.ts`), backend chưa enforce.

## Quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| E1 | Phạm vi | Backend: entitlement + trần + khoá lịch sử. Web: hiển thị gói, chặn đúng chỗ, gợi ý nâng cấp. **Không** làm thanh toán: IAP chỉ chạy trên build thật (§14.3), web chưa có cổng thanh toán. Nút nâng cấp dẫn tới `/#pricing`. |
| E2 | Nơi giữ luật | Hằng số `FREE_LIMITS = { entriesPerMonth: 50, historyMonths: 3 }` trong `backend/src/common/entitlement.util.ts`. Là chính sách sản phẩm, không phải cấu hình vận hành, nên không đưa vào env. Web dashboard đọc con số từ API. Landing tĩnh giữ bản sao ở `config/pricing.ts`. |
| E3 | Đếm trần | Đếm entry theo **`created_at`** trong tháng hiện tại (giờ VN). Không đếm theo `purchased_at`, vì user tự đặt được ngày mua và lách bằng cách lùi ngày. Xoá entry thì trả lại suất. Đây là trần mềm: count rồi mới insert, nên hai request đồng thời có thể vượt 1. |
| E4 | Cửa sổ lịch sử | Trượt theo ngày: `historyFrom` = nửa đêm (theo tz) của ngày hôm nay lùi 3 tháng. Tính trong Postgres cùng câu lấy `pro_expires_at` (một query). Mốc nằm đúng ranh giới ngày, nên một ô lịch luôn khoá cả ngày hoặc mở cả ngày. |
| E5 | Entry bị khoá | `GET /entries` và `GET /entries/:id` trả `{ id, purchasedAt, blurhash, locked: true }`: không ảnh, không giá, không tên (§14.6). Entry thường có thêm `locked: false`. `PATCH` entry bị khoá → `402` (response sẽ lộ dữ liệu). `DELETE` vẫn cho: dữ liệu là của user. |
| E6 | Lịch | Ngày bị khoá: `coverPhotoKey: null`, `blurhash` của ảnh bìa, `locked: true`. Vẫn giữ `count`, vì số khoản chi không phải dữ liệu Pro. |
| E7 | Ảnh | `photo-url` / `photo-urls` → `402` nếu có key thuộc entry bị khoá. Key chưa gắn entry nào (vừa upload) vẫn cấp được. |
| E8 | Báo cáo | Free chỉ xem báo cáo **trong cửa sổ 3 tháng**: thiếu `from` hoặc `from < historyFrom` → `402`. `groupBy=year` → `402`. Cùng thông điệp với lịch: "muốn nhìn xa hơn 3 tháng thì lên Pro" (§14.6). Rộng hơn "chỉ tháng hiện tại" ở bảng §14.1, nhưng một luật dễ hiểu và dễ enforce hơn hai luật. |
| E9 | Lỗi 402 | Body chuẩn NestJS cộng `code`: `ENTRY_LIMIT`, `HISTORY_LOCKED`, `PRO_ONLY`. Web dựa vào `code`, không dựa vào `message` tiếng Anh. |
| E10 | `/me/entitlement` | `{ isPro, proSource, proExpiresAt, limits, usage: { entriesThisMonth }, historyFrom }`. Pro thì `limits` và `historyFrom` là `null`. Web dùng `historyFrom` để chặn date picker, nên không phải tự tính lại mốc. |
| E11 | Không làm blurhash trên web | Web và mobile hiện chưa sinh blurhash (để `null`). Ô bị khoá vẽ nền muted + icon khoá. Giải mã blurhash làm khi mobile bắt đầu ghi nó. |

## Backend

1. `common/entitlement.util.ts`: `FREE_LIMITS`, `DEFAULT_TZ`, `paymentRequired(code, message)`.
2. Module mới `entitlement/` (service + controller `GET /me/entitlement`), export service.
   - `access(userId, tz)` trả `{ isPro, historyFrom | null }`.
   - `usage(userId, tz)` đếm entry tạo trong tháng.
   - `assertCanCreate`, `assertKeysVisible`, `assertReportRange`.
3. `EntriesService`: `create` kiểm trần. List / detail / calendar qua `present()`. `update` chặn entry bị khoá.
4. `UploadsController`: `assertKeysVisible` trước khi ký URL GET.
5. `ReportsService`: `assertReportRange` ở mỗi endpoint.

## Web

1. Types: `Entitlement`, `LockedEntry`, `EntryRow = Entry | LockedEntry`, `CalendarDay.locked/blurhash`, `ApiError.code`.
2. `entitlementApi.get`, `useEntitlement()` (`qk.entitlement`). Mutation entry invalidate thêm `entitlement`, vì số đã dùng thay đổi.
3. `PlanCard` ở chân sidebar (ẩn khi sidebar thu gọn, ẩn với Pro trả phí):
   - Trial: còn N ngày.
   - Free: thanh `Progress` X/50 khoản chi tháng này, nút "Xem gói Pro".
4. `ProLock`: khối `Empty` dùng chung (icon khoá, lời giải thích, nút `/#pricing`). Hiện trong dialog chi tiết của entry bị khoá và trong dialog khi bấm ô lịch bị khoá.
5. Lịch: ô khoá có icon khoá, không có ảnh. Mô tả tháng nói rõ "Ngày trước dd/mm cần Pro".
6. Bảng entries và lưới ngày: entry khoá hiện "Đã khoá", không giá, không menu sửa / xoá.
7. Form thêm: Free đã chạm trần thì hiện `Alert` và khoá nút Lưu. `402 ENTRY_LIMIT` vẫn được xử lý phòng khi số liệu cũ.
8. Báo cáo: Free thì range mặc định bắt đầu không sớm hơn `historyFrom`, date picker disable ngày trước mốc, chọn "Năm" hiện Alert Pro như cũ. Tổng quan: biểu đồ 6 tháng (Pro) / 3 tháng (Free).
9. Cài đặt: thẻ "Gói dịch vụ" đọc `/me/entitlement` (bỏ `planOf` tự tính). Thêm số đã dùng và mốc lịch sử.
10. Landing: sửa dòng Free "Báo cáo tháng hiện tại" thành "Báo cáo trong 3 tháng gần nhất" cho khớp E8.

## Verify

API: tài khoản test C đăng ký qua API, thêm entry hôm nay / 20 ngày / 4 tháng / 5 tháng, rồi đặt `proExpiresAt` về quá khứ bằng Prisma để thành Free. Web: tài khoản test B (đang đăng nhập trong browser) được hạ tạm xuống Free bằng Prisma, thêm 2 entry cũ + 15 entry cho đủ trần, xong trả `proExpiresAt` gốc và xoá entry seed.

- [x] `GET /me/entitlement`: trial → `isPro: true`, `limits: null`, `historyFrom: null`. Free → `limits` 50/3, `usage.entriesThisMonth`, `historyFrom` = `2026-07-09T17:00Z` (nửa đêm VN 10/7, hôm nay 10/10).
- [x] Free: `GET /entries` → entry 4 / 5 tháng là `{id, purchasedAt, blurhash, locked:true}`, không `price` / `photoKey` / `userId`. `GET /entries/:id` cũ → khoá. `PATCH` cũ → 402 `HISTORY_LOCKED`. `PATCH` mới → 200 `locked:false`. `DELETE` cũ → 200.
- [x] Free: `/entries/calendar?month=2026-06` → `{coverPhotoKey: null, locked: true}`. Bảng entries web: 17/7 mở, 3/7 khoá (mốc 10/7).
- [x] Free: `photo-url` key cũ → 402, key mới → 200. `photo-urls` có lẫn key cũ → 402.
- [x] Free: `reports/summary` không `from` → 402. `from` = mốc − 1 ms → 402. `from` = mốc → 200 (summary, by-category, top-stores, time-series tháng). `time-series?groupBy=year` → 402 `PRO_ONLY`.
- [x] Free đủ 50 entry tạo trong tháng → `POST /entries` 402 `ENTRY_LIMIT`. Xoá 1 → tạo được 1, lần sau lại 402.
- [x] Trial: list `locked:false` hết. Web lịch tháng 6 không ô khoá nào, sidebar "Đang dùng thử Pro · Còn 30 ngày".
- [x] Web Free:
  - Sidebar "Đã ghi 35/50" (progress 70%), lúc chạm trần thì "Đã dùng hết 50".
  - Lịch tháng 6 có 3 ô khoá, mô tả "Ngày trước 10 thg 7, 2026 cần gói Pro để xem". Bấm ô → dialog Pro, tiêu đề giữ nguyên khi dialog đóng.
  - Bảng entries có hàng "Đã khoá", bấm vào → dialog chi tiết khoá kèm ngày giờ.
  - Form thêm lúc chạm trần: Alert + nút Thêm bị disable.
  - Báo cáo: range mặc định 10/07–10/10, picker disable 8–9/7 và nút lùi tháng, chọn "Năm" → Alert Pro (402 `PRO_ONLY`).
  - Tổng quan: "3 tháng gần nhất" (from 1/8).
  - Cài đặt: Free, 35/50, mốc 10/7.
- [x] Landing `#pricing` hiện copy mới. Backend `tsc -p tsconfig.build.json` sạch. Web typecheck, lint, build pass.

### Lệch so với thiết kế

- Không có class `EntitlementGuard` riêng. Mọi luật hiện tại phụ thuộc tham số (ngày mua của entry, `from` / `groupBy` của báo cáo, số entry trong tháng), nên chúng là các hàm `assert*` của `EntitlementService`, gọi từ service / controller. Khi có endpoint chỉ-Pro thuần (OCR, export), thêm guard + decorator `@ProOnly()` gọi `access()`.
- Dialog chi tiết của entry khoá dùng ô `aspect-video`, không vuông: ô vuông trống quá to.
- Không chạy `nest build`: nó xoá `dist/` của watcher `start:dev` đang chạy ở terminal khác. Thay bằng `tsc -p tsconfig.build.json --noEmit`.

## Ngoài phạm vi

- RevenueCat webhook, IAP, cổng thanh toán web, giá thật.
- Xác thực email chống lạm dụng trial (§14.5).
- Mobile: xử lý `402` ở màn chụp, ô khoá trên lịch mobile (làm cùng Phase 6 mobile).
- Blurhash (E11). Giới hạn danh mục tuỳ chỉnh, đa tiền tệ, độ nén ảnh theo gói.
- Lọc `search` / `store` / `category` vẫn chạy trên entry bị khoá, nên đếm được số entry cũ khớp từ khoá (không lộ giá / ảnh). Chấp nhận.
