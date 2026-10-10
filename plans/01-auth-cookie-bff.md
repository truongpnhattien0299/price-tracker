# Plan 01 — Auth: httpOnly cookie + BFF + middleware

**Trạng thái:** ✅ Xong 2026-10-10. Toàn bộ mục Verify đã chạy với backend thật (curl + browser).

## Mục tiêu

Bỏ hẳn token trong `localStorage`. JWT chỉ nằm trong httpOnly cookie, browser không đọc được, nên XSS không lấy được token. Next.js đứng giữa làm **BFF** (backend-for-frontend): nhận request same-origin từ browser, gắn `Authorization: Bearer` rồi gọi NestJS.

```
Browser ──(same-origin, cookie)──▶ Next.js /api/*  ──(Bearer)──▶ NestJS :3000/api/v1
                                   │ route handlers
                                   └ middleware.ts (chặn /dashboard)
```

Backend **không cần sửa**. Nó vẫn stateless JWT như cũ (DESIGN.md §6).

## Thiết kế

### Cookie

| Cookie | Giá trị | `maxAge` | `path` |
|---|---|---|---|
| `pt_access` | access JWT | lấy từ `exp` trong JWT (~15 phút) | `/` |
| `pt_refresh` | refresh JWT | lấy từ `exp` trong JWT (~7 ngày) | `/` |

Cả hai đều `httpOnly`, `sameSite: "lax"`, `secure` khi `NODE_ENV === "production"`. Hạn cookie lấy từ claim `exp` (decode, **không verify** vì Next không giữ JWT secret), nên đổi TTL ở backend thì không phải sửa web.

### Route handlers (`src/app/api/`)

| Route | Việc làm |
|---|---|
| `POST /api/auth/login` | Gọi `POST /auth/login`, set 2 cookie, trả `{ user }` (không trả token). |
| `POST /api/auth/register` | Như trên với `/auth/register`. |
| `POST /api/auth/logout` | Xoá 2 cookie, trả `204`. |
| `GET\|POST\|PATCH\|DELETE /api/backend/[...path]` | Proxy generic: đọc `pt_access` → gọi `API_URL + /path?query` với Bearer, chuyển tiếp body và status. |

**Refresh trong proxy:** backend trả 401 mà có `pt_refresh` thì gọi `/auth/refresh`, set lại cookie, retry đúng 1 lần. Nếu refresh fail thì xoá cookie và trả 401, client redirect `/login`. Cũng refresh trước khi gọi nếu `pt_access` đã hết hạn (cookie biến mất) mà `pt_refresh` còn.

> Nhiều request song song lúc access hết hạn có thể refresh cùng lúc. Backend không lưu/rotate refresh token nên việc này vô hại, cookie set sau cùng thắng. Không cần single-flight phía server.

**CSRF:** `sameSite=lax` đã chặn cookie trên POST cross-site. Thêm lớp thứ hai: với method khác GET, proxy và các route auth so header `Origin` với host của request, lệch thì trả `403`.

### Middleware (`src/middleware.ts`)

- `matcher: ["/dashboard/:path*", "/login", "/register"]`.
- Vào `/dashboard/*` mà **không có `pt_refresh`** → redirect `/login?next=<path>`.
- Vào `/login` hoặc `/register` mà **có `pt_refresh`** → redirect `/dashboard`.
- Chỉ check cookie có hay không; tính hợp lệ do backend quyết định qua 401 → proxy → client.

### Client

- `lib/api/client.ts`: base URL thành `/api/backend` (same-origin). Bỏ bearer header, bỏ refresh, bỏ `setUnauthorizedHandler`. Gặp 401 thì `window.location.assign("/login?next=…")`.
- `auth-form.tsx`: POST tới `/api/auth/login|register`. Đọc `?next=` và chỉ chấp nhận path tương đối bắt đầu bằng `/`, không phải `//` (chống open redirect).
- `nav-user.tsx`: logout gọi `POST /api/auth/logout` rồi `router.replace("/login")`. Plan 02 bổ sung `queryClient.clear()`.

### Env

- Thêm `API_URL` (server-only, ví dụ `http://localhost:3000/api/v1`).
- Bỏ `NEXT_PUBLIC_API_URL`: browser không còn gọi backend trực tiếp. CORS backend vẫn để nguyên vì mobile/dev cần.

## Các bước

1. `pnpm add server-only` (đánh dấu module chỉ chạy server, import nhầm vào client sẽ báo lỗi build).
2. `src/lib/auth/session.ts` (server-only): tên cookie, `setSession(res, tokens)`, `clearSession(res)`, `decodeExp(jwt)`.
3. `src/lib/api/backend.ts` (server-only): `backendFetch(path, init, accessToken?)` gọi `API_URL`, kèm helper `refresh(refreshToken)`.
4. `src/lib/auth/origin.ts`: `assertSameOrigin(req)` cho method khác GET.
5. Route handlers: `api/auth/login`, `api/auth/register`, `api/auth/logout`, `api/backend/[...path]`.
6. `src/middleware.ts`.
7. Sửa `lib/api/client.ts`, `auth-form.tsx`, `nav-user.tsx`. **Xoá** `lib/api/tokens.ts`.
8. `config/site.ts`: bỏ `apiUrl`. Cập nhật `.env.example` (`API_URL`).
9. Xoá comment `TODO(plan)` về auth guard trong `(dashboard)/layout.tsx` và `tokens.ts`.
10. Cập nhật mục Web trong `CLAUDE.md` (bỏ câu "tokens in localStorage, no auth guard").

## Verify

- [x] Chưa login, mở `/dashboard` → về `/login?next=/dashboard`. Login xong quay lại đúng `/dashboard`.
- [x] Đã login, mở `/login` → về `/dashboard`.
- [x] DevTools → Application → Cookies: `pt_access` và `pt_refresh` có cờ `HttpOnly`. `document.cookie` không thấy chúng. `localStorage` trống.
- [x] Response của `/api/auth/login` không chứa `accessToken` / `refreshToken`.
- [x] Xoá tay `pt_access`, gọi `/api/backend/auth/me` → 200 (đã refresh), `pt_access` mới được set.
- [x] Xoá cả 2 cookie, gọi `/api/backend/auth/me` → 401.
- [x] `curl -X POST -H 'Origin: http://evil.test' localhost:3001/api/backend/entries` → 403.
- [x] Logout → cookie bị xoá, về `/login`, Back không vào lại được dashboard.
- [x] Login sai mật khẩu → toast hiện message lỗi của backend.
- [x] `/login?next=//evil.test` → login xong về `/dashboard`, không bị redirect ra ngoài.
- [x] typecheck + lint + build pass.

## Kết quả & lệch so với plan

- Thêm `lib/auth/constants.ts` (tên cookie, không phụ thuộc gì) để middleware chạy trên Edge import được mà không kéo theo `server-only`.
- Logic chuyển tiếp login/register dùng chung một chỗ: `lib/auth/auth-route.ts`.
- Validate `?next=` nằm ở `lib/auth/redirect.ts`, chặn cả `//host` và `/\host`.
- Proxy chặn segment `.`/`..` để không bị điều hướng ra ngoài prefix `/api/v1`.
- Request khác GET mà **thiếu** header `Origin` cũng trả 403. Browser luôn gửi `Origin` cho các request này, nên muốn test bằng curl phải tự thêm `-H 'Origin: http://localhost:3001'`.

## Thiết kế trang auth (theo skill frontend-design + shadcn)

- **Ý tưởng:** chia đôi màn hình. Bên trái là form căn trái. Bên phải là lịch tháng mẫu — thứ đặc trưng nhất của app (DESIGN.md §9.3): mỗi ô là một lần mua, tô màu theo món (`--produce-*`) và dùng emoji danh mục thật của backend, dưới ô là giá. Hôm nay là ô trống có viền, ý là "chưa chụp".
- **Cố tình tránh:** card căn giữa trên nền xám; split screen kèm ảnh stock/testimonial; nhãn chữ in hoa phía trên tiêu đề.
- **Chuyển động:** chỉ một khoảnh khắc — các ô hiện lần lượt theo thứ tự ngày, bọc trong `motion-safe:`.
- **Lỗi:** `Alert` báo lỗi ở mức form, kèm `data-invalid` trên `Field` và `aria-invalid` trên input bị lỗi. Câu lỗi theo status: 401 / 409 / 400 / 429 / 5xx.
- **Token mới trong `globals.css`:** `--auth-panel`, `--produce-*`, đăng ký trong `@theme inline` (theo `customization.md` của skill shadcn).

## Ngoài phạm vi

- Server Components fetch dữ liệu trực tiếp / React Query prefetch + hydrate: làm sau plan 02 nếu cần.
- "Remember me", đăng nhập bằng OAuth.
