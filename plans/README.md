# Plans — web (`web/`)

Kế hoạch phát triển web app (Next.js 15 + shadcn/ui). Mỗi plan là một file đánh số, làm theo thứ tự; plan sau giả định plan trước đã xong.

## Quyết định đã chốt (2026-10-10)

| # | Vấn đề | Quyết định |
|---|---|---|
| D1 | Lưu token | **httpOnly cookie** do Next.js route handler (BFF) set. Browser không bao giờ đọc được JWT. |
| D2 | Chặn route | **`middleware.ts`** redirect `/dashboard/*` ↔ `/login` dựa trên sự có mặt của cookie. |
| D3 | Data layer | **TanStack React Query** ở client, gọi API qua BFF proxy cùng origin. |

## Lộ trình

| Plan | Nội dung | Trạng thái |
|---|---|---|
| [01](01-auth-cookie-bff.md) | Auth: BFF route handlers + httpOnly cookie + middleware | ✅ Xong 2026-10-10 |
| [02](02-react-query-wiring.md) | React Query + nối dashboard với API thật, bỏ mock data | ✅ Xong 2026-10-10 |
| [03](03-calendar.md) | Calendar: lưới ảnh theo tháng (`/entries/calendar` + batch presigned photo URL) | ✅ Xong 2026-10-10 |
| [04](04-entry-crud.md) | CRUD entry trên web: thêm / sửa / xoá, upload ảnh, `?entry=` | ✅ Xong 2026-10-10 |
| [05](05-landing.md) | Landing: nội dung thật, ảnh app, link store, giá Pro | ✅ Xong 2026-10-10 |
| [06](06-theme-brand.md) | Theme / brand color: xanh lá hue 152, chart, icon, ảnh OG | ✅ Xong 2026-10-10 |
| [07](07-entitlement.md) | Entitlement: `/me/entitlement`, trần 50/tháng (402), khoá dữ liệu > 3 tháng, trial còn lại (backend Phase 10 phần không IAP) | ✅ Xong 2026-10-10 |
| [08](08-map.md) | Vị trí ảnh (EXIF / GPS lúc chụp / chọn tay, Nominatim) + tab Bản đồ (MapLibre + vector tile OpenFreeMap, style riêng kiểu Google Maps, gom cụm ảnh) | ✅ Xong 2026-10-10 |

## Cách verify chung

Repo không có test suite. Mỗi plan coi là xong khi:

1. `pnpm run typecheck && pnpm run lint && pnpm run build` pass (trong `web/`, chạy pnpm qua `corepack pnpm@10.34.3`).
2. Backend chạy ở `:3000`, web ở `:3001`, đi hết các luồng trong mục **Verify** của plan bằng browser.
3. Cập nhật bảng trạng thái ở trên + phần Web trong `CLAUDE.md` nếu kiến trúc thay đổi.
