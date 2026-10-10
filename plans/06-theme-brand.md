# Plan 06 — Theme / brand color

**Phụ thuộc:** Plan 05 (landing, `MonthGrid`, `PhoneMockup` dùng token).

## Hiện trạng

Theme là preset mặc định `radix-nova` + `neutral`:

- `--primary` đen (sáng) / gần trắng (tối). Nút, logo, badge, thanh báo cáo đều xám, không có màu nhận diện.
- `--chart-1..5` là 5 mức xám. Biểu đồ chi tiêu dùng `--chart-2` (xám vừa).
- Dark mode có `--sidebar-primary` **xanh dương** (`oklch(0.488 0.243 264)`), sót lại từ preset, lệch với mọi thứ khác.
- Favicon là `favicon.ico` mặc định của Next. Không có `apple-icon`, ảnh OG, `theme-color`, manifest.

## Quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| T1 | Màu brand | **Xanh lá, hue 152** (OKLCH). Ngôn ngữ hình đã nghiêng về chợ / rau: nền panel auth hue 130, ô "rau củ" hue 135. Hue 152 ngả về xanh ngọc một chút để nút không lẫn với ô ảnh rau. DESIGN.md chưa chốt brand, đây là mặc định, đổi được (xem T2). |
| T2 | Chỗ đặt | Chỉ sửa token trong `globals.css`, không sửa component. Đổi brand sau này = đổi hue / lightness ở `--primary`, `--ring`, `--chart-*`, `--sidebar-primary`, cộng hex trong `lib/brand.tsx` và `app/icon.svg`. |
| T3 | Độ tương phản | Kiểm bằng công thức WCAG trên giá trị OKLCH → sRGB. Sáng: `oklch(0.5 0.13 152)` = `#05773b`, chữ trắng **5.4:1**. Tối: `oklch(0.75 0.15 152)` = `#58c97d`, chữ `oklch(0.18 0.03 152)` **8.9:1**; làm chữ trên nền tối **9.4:1**. Cả hai đạt AA cho chữ thường. |
| T4 | Phần trung tính | Giữ `neutral` (background, card, muted, border). Chỉ màu hành động và dữ liệu mang brand, như vậy ô ảnh `--produce-*` vẫn nổi bật nhất trên lịch. |
| T5 | Biểu đồ | `--chart-1` = brand. `--chart-2..5` là thang cùng hue, sáng / tối dần, dùng khi cần nhiều series. Biểu đồ chi tiêu đổi sang `--chart-1`. |
| T6 | Icon | `app/icon.svg` (camera trắng trên ô vuông bo góc xanh, giống `Logo`) thay `favicon.ico`. `app/apple-icon.tsx` và `opengraph-image.tsx` vẽ bằng `next/og`, chỉ dùng chữ Latin không dấu ("Price Tracker") nên font mặc định của `next/og` đủ dùng, không phải tải font lúc build. |
| T7 | Trình duyệt | `viewport.themeColor` theo `prefers-color-scheme` (thanh địa chỉ mobile cùng màu nền). `app/manifest.ts` cho "Add to Home Screen". |

## Các bước

1. `globals.css`: `--primary`, `--primary-foreground`, `--ring`, `--chart-1..5`, `--sidebar-primary(-foreground)`, `--sidebar-ring` cho cả `:root` và `.dark`.
2. `spending-chart.tsx`: `var(--chart-2)` → `var(--chart-1)`.
3. Rà các chỗ dùng `primary` trên nền khác `background`/`card`: chip trong `PhoneMockup`, số thứ tự ở "Cách dùng", badge, thanh danh mục.
4. Icon: xoá `favicon.ico`, thêm `icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx`. Hex dùng chung ở `lib/brand.tsx`.
5. `layout.tsx`: `export const viewport` với `themeColor`. `manifest.ts`.
6. typecheck + lint + build, xem landing / auth / dashboard / calendar / reports ở cả hai theme.

## Verify

- [x] Nút chính, logo, badge, thanh danh mục, biểu đồ chi tiêu ra màu xanh ở cả hai theme (landing, `/dashboard/reports`, `/dashboard/calendar`). Dark: `--primary` = `--sidebar-primary` = fill cột biểu đồ.
- [x] Dark mode: sidebar không còn xanh dương.
- [x] Focus ring: Tab tới "Tổng quan" ở sidebar, viền xanh thấy rõ.
- [x] Lịch: ô ảnh vẫn là điểm nhấn; viền "hôm nay" thành xanh.
- [x] `/icon.svg` 200 `image/svg+xml`, `/apple-icon` 200 PNG 180×180, `/opengraph-image` 200 PNG 1200×630, `/manifest.webmanifest` 200. `<head>` có `link rel=icon` (svg), `apple-touch-icon`, `og:image` + `twitter:image` (card `summary_large_image`), 2 thẻ `theme-color` theo scheme, `manifest`. `/favicon.ico` 404 (đã xoá, trình duyệt dùng `icon.svg`).
- [x] Toast: `sonner.tsx` chỉ map `--popover` / `--border`, `richColors` không đụng `--primary`.
- [x] Mọi route icon / OG / manifest build ra static (`○`). typecheck, lint, build pass.

### Lệch so với thiết kế

- Không làm `twitter-image` riêng: Next tự gắn `opengraph-image` cho cả `twitter:image`.
- Ảnh OG không có tagline: font mặc định của `next/og` không có dấu tiếng Việt, mà một câu tiếng Anh lẻ trên trang tiếng Việt thì lạc. Chỉ có tên + lịch ô màu. Font cũng chỉ có weight thường, nên tên không đậm.
- Hex của token nằm ở `src/lib/brand.tsx` (dùng cho ảnh sinh ra và `theme-color`, vì không đọc được CSS variable). Đổi brand phải sửa cả file này.

## Ngoài phạm vi

- Đồng bộ màu sang mobile (`mobile/global.css` dùng HSL kiểu shadcn v3). Làm khi đụng UI mobile: `--primary` sáng ≈ `148 92% 24%`, tối ≈ `140 51% 57%`.
- Đổi font, radius, style preset.
- Bộ nhận diện đầy đủ (logo chữ, guideline).
