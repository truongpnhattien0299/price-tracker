# Plan 05 — Landing: nội dung thật, ảnh app, link store, giá Pro

**Phụ thuộc:** không phụ thuộc plan nào khác. Landing là trang tĩnh, không gọi API.

## Hiện trạng

Bản dựng từ đầu gồm `Hero` + `Features` (4 card) + `Pricing` (Free/Pro với giá `TBD`). Thiếu:

- **Ảnh app.** Chưa có hình nào cho thấy app trông ra sao.
- **Link store.** Mobile chưa lên App Store / Google Play.
- **Giá Pro.** DESIGN.md §14.4 ghi rõ "con số giá cụ thể (VND) chốt sau".
- Phần "cách dùng", FAQ, CTA cuối trang.
- Menu cho mobile (nav đang `hidden md:flex`, màn nhỏ không có link nào).
- SEO cơ bản: Open Graph, `sitemap.xml`, `robots.txt`.

## Quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| L1 | Ảnh app | **Mockup dựng bằng JSX**, không dùng ảnh chụp màn hình. App mobile mới có màn camera + sheet nhập, chưa có bản build để chụp. Mockup dùng cùng ngôn ngữ hình với `MonthPreview` ở trang auth (ô màu `--produce-*` + emoji danh mục), tự đổi theo theme sáng/tối và không phải chụp lại khi UI đổi. |
| L2 | Link store | Đọc từ env `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL`. Chưa set thì nút store hiện **"Sắp có"** và bị disable, CTA chính dẫn sang bản web (`/register`). Không dùng badge chính thức của Apple/Google (cần asset + tuân guideline thương hiệu). |
| L3 | Giá Pro | Để trong `src/config/pricing.ts` (`monthly` / `yearly`, VND, `null` = chưa chốt). `null` thì hiện **"Sắp công bố"** thay vì bịa số. Gói năm mặc định tính như DESIGN §14.4 (≈ 10 tháng). Đổi giá = sửa một file. |
| L4 | Nội dung | Chỉ hứa những gì đã có hoặc DESIGN đã chốt. OCR, ngân sách, xuất CSV gắn nhãn **"Sắp có"**. Trần Free (~50/tháng, 3 tháng lịch sử) chưa được backend enforce (plan 07), nhưng là chính sách đã chốt ở §14.1 nên vẫn ghi. |
| L5 | Tĩnh | Landing không đọc cookie, giữ static để build ra HTML sẵn. Người đã đăng nhập bấm "Đăng nhập" sẽ được middleware chuyển thẳng vào dashboard. |

## Bố cục

1. **Header**: logo, nav (Tính năng · Cách dùng · Bảng giá · Hỏi đáp), theme, Đăng nhập, Dùng thử. Dưới `md`: nút menu mở `Sheet` chứa nav.
2. **Hero**: hai cột trên `lg`.
   - Trái: badge trial 30 ngày, tiêu đề, mô tả, CTA "Dùng thử miễn phí" + "Xem cách dùng", hàng nút store.
   - Phải: `PhoneMockup` vẽ màn sheet nhập sau khi chụp (ảnh món hàng, giá, chip danh mục, nút Lưu).
3. **Cách dùng** (`#how`): 3 bước = 3 chạm (Chụp → Gõ giá → Lưu), mỗi bước một số thứ tự + mô tả. Ghi rõ GPS, giờ, danh mục tự điền.
4. **Tính năng** (`#features`): lưới bento.
   - Ô lớn "Lịch ảnh" chứa lịch tháng mẫu (tách lưới từ `MonthPreview` thành `MonthGrid` dùng chung).
   - Ô "Báo cáo" có thanh chi theo danh mục vẽ bằng div.
   - Các ô nhỏ: Vị trí, Trên web, Riêng tư (ảnh private, link ký 5 phút).
5. **Bảng giá** (`#pricing`): `ToggleGroup` Tháng / Năm. Hai card Free / Pro. Dòng tính năng "Sắp có" dùng `Badge`.
6. **Hỏi đáp** (`#faq`): `Accordion` (thêm component shadcn). Trial có cần thẻ không, hết trial thì sao, dữ liệu cũ có bị xoá không, ảnh có ai xem được không, có app mobile chưa, có dùng offline được không.
7. **CTA cuối**: một dải kêu gọi đăng ký + nút store.
8. **Footer**: logo + mô tả, cột link (Sản phẩm / Tài khoản), store, ©.

## SEO

- `metadata` ở root: `openGraph` (type, locale `vi_VN`, siteName, title, description), `twitter` card `summary`.
- `app/sitemap.ts` (`/`, `/login`, `/register`) và `app/robots.ts` (chặn `/dashboard`, `/api`).
- Không làm ảnh OG động: font mặc định của `next/og` không có đủ dấu tiếng Việt, nhúng font sẽ phải tải lúc build. Để plan 06 (brand) làm cùng logo.

## Các bước

1. `pnpm dlx shadcn@latest add accordion` (qua corepack shim).
2. `config/site.ts`: thêm nav `#how` / `#faq`, `stores` từ env. `config/pricing.ts` mới.
3. `.env.example`: hai biến store (để trống).
4. Tách `MonthGrid` từ `components/auth/month-preview.tsx` sang `components/shared/month-grid.tsx`, `MonthPreview` dùng lại.
5. Component marketing: `phone-mockup`, `store-buttons`, `how-it-works`, `faq`, `cta`, `mobile-nav`. Viết lại `hero`, `features`, `pricing`, `site-header`, `site-footer`.
6. `page.tsx` ghép section. `sitemap.ts`, `robots.ts`, metadata.
7. typecheck + lint + build. Xem trên browser ở 1280px và 375px, sáng và tối.

## Verify

- [x] `/` build ra static (`○ /` trong output của `next build`, 27 kB). `robots.txt`, `sitemap.xml` cũng static.
- [x] Nav anchor cuộn đúng section: đầu `#how`, `#pricing` nằm ở `top = 64px`, ngay dưới header sticky.
- [x] 375px: `scrollWidth = 375`, không tràn ngang. Nút menu mở Sheet; bấm "Bảng giá" thì Sheet đóng, URL thành `/#pricing`, cuộn đúng chỗ.
- [x] Không set env store → hai nút disable, có badge "Sắp có", `aria-label` "… — sắp có". Footer hiện "App Store · sắp có".
- [x] Set tạm `NEXT_PUBLIC_APP_STORE_URL` → nút App Store thành link `target=_blank` (hero, CTA, footer), Google Play vẫn disable.
- [x] Giá `null` → "Sắp công bố", không hiện toggle. Set tạm `39000` / `390000` → toggle hiện, mặc định "Theo năm": `390.000 ₫/năm`, `≈ 32.500 ₫/tháng, tiết kiệm 17%`; "Theo tháng": `39.000 ₫/tháng`. Đã trả về `null`.
- [x] Accordion: Enter mở mục đầu, ArrowDown sang mục 2, Space mở mục 2 và đóng mục 1 (`type="single"`).
- [x] Dark / light: mockup, ô màu, thanh báo cáo đều đọc được.
- [x] `/sitemap.xml` có 3 URL, `/robots.txt` chặn `/dashboard` và `/api`. Trang có thẻ `og:*` (`locale vi_VN`).
- [x] `/login` vẫn hiện lịch mẫu (`Tháng 10`, `377.000`) sau khi tách `MonthGrid`.
- [x] typecheck, lint, build pass.

### Lệch so với thiết kế

- Bento: ô lịch chỉ `col-span-2`, không `row-span-2`. Lịch kéo hết 2/3 chiều ngang ở 1280px thì ô quá to, nên lưới giới hạn `max-w-md` ở giữa panel.
- Viền "hôm nay" trong `MonthGrid` đổi từ `ring-offset-auth-panel` sang `outline-offset-2`. Khe outline trong suốt nên đặt trên nền nào cũng đúng, không phải truyền màu nền vào.

## Ngoài phạm vi

- Ảnh chụp màn hình thật, video demo.
- Ảnh OG động, favicon / logo mới (plan 06).
- Trang chính sách bảo mật / điều khoản (cần trước khi lên store, nội dung do chủ dự án viết).
- Đa ngôn ngữ.
