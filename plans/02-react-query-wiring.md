# Plan 02 — React Query + nối dashboard với API thật

**Phụ thuộc:** Plan 01 (client gọi `/api/backend/*` same-origin bằng cookie).

## Mục tiêu

Mọi trang dashboard lấy dữ liệu thật qua TanStack React Query, có loading / empty / error state. Xoá `lib/mock-data.ts`. Calendar để sang plan 03.

## Thiết kế

### Tầng code

```
lib/api/endpoints.ts      # hàm gọi API thuần (đã có), không state
lib/query/keys.ts         # query key factory, nguồn duy nhất cho key
hooks/queries/*.ts        # useQuery / useMutation bọc endpoints
components/**             # chỉ gọi hooks, không gọi endpoints trực tiếp
```

### QueryClient (trong `components/shared/providers.tsx`)

- Tạo client bằng `useState(() => new QueryClient(...))` để không share giữa các request.
- Defaults: `staleTime: 30_000`, `refetchOnWindowFocus: true`. `retry`: không retry lỗi `HttpError` 4xx, các lỗi khác tối đa 2 lần.
- `@tanstack/react-query-devtools` chỉ bật khi dev.

### Query keys (`lib/query/keys.ts`)

```ts
export const qk = {
  me: ["me"] as const,
  categories: ["categories"] as const,
  entries: {
    all: ["entries"] as const,
    list: (q: EntryQuery) => ["entries", "list", q] as const,
    detail: (id: string) => ["entries", "detail", id] as const,
  },
  calendar: (month: string) => ["calendar", month] as const,
  reports: {
    all: ["reports"] as const,
    summary: (r: ReportRange) => ["reports", "summary", r] as const,
    byCategory: (r: ReportRange) => ["reports", "by-category", r] as const,
    timeSeries: (g: string, r: ReportRange) => ["reports", "time-series", g, r] as const,
    topStores: (r: ReportRange) => ["reports", "top-stores", r] as const,
  },
  photoUrl: (key: string) => ["photo-url", key] as const,
}
```

Mutation đổi entry thì invalidate `entries.all`, `["calendar"]`, `reports.all`. Mobile cũng invalidate `entries` + `calendar` theo cách này.

### Hooks (`hooks/queries/`)

| File | Hooks |
|---|---|
| `use-me.ts` | `useMe()`, `staleTime: 5 phút` |
| `use-categories.ts` | `useCategories()`, `staleTime: Infinity` (8 danh mục seed sẵn, gần như không đổi) |
| `use-entries.ts` | `useEntries(query)` với `placeholderData: keepPreviousData`; `useDeleteEntry()` |
| `use-reports.ts` | `useReportSummary`, `useCategoryBreakdown`, `useTimeSeries`, `useTopStores` |
| `use-photo-url.ts` | `usePhotoUrl(key)`, `staleTime: 4 phút` (presigned URL hết hạn sau 5 phút) |

### Khoảng thời gian (`lib/date-range.ts`)

Helper `currentMonthRange()` / `lastNMonthsRange(n)` trả `{ from, to }` dạng ISO. Backend group theo `Asia/Ho_Chi_Minh` (DESIGN.md §8), nên biên tháng tính theo giờ VN, không theo giờ máy client.

### Filter entries qua URL

`/dashboard/entries?search=&category=&from=&to=&page=`, đọc bằng `useSearchParams`, ghi bằng `router.replace`. Lợi ích: share link được, Back/Forward giữ filter, F5 không mất. Ô search debounce 300ms.

### UI state dùng chung (`components/shared/`)

- `query-state.tsx`: `<ErrorState onRetry />`, `<EmptyState />`.
- Skeleton riêng từng widget (`StatCards`, `SpendingChart`, `EntriesTable`) dùng shadcn `Skeleton`.

## Các bước

1. `pnpm add @tanstack/react-query` + `pnpm add -D @tanstack/react-query-devtools`.
2. Thêm `QueryClientProvider` vào `providers.tsx`.
3. `lib/query/keys.ts`, `lib/date-range.ts`.
4. `hooks/queries/*` như bảng trên.
5. **NavUser**: `useMe()` thay user giả. Logout gọi thêm `queryClient.clear()`.
6. **Overview** (`/dashboard`): chuyển phần thân thành client component `overview-view.tsx`. Page vẫn là server component để giữ `metadata`. Summary + by-category của tháng này, time-series 6 tháng `groupBy=month`, 5 entry mới nhất.
7. **Entries**: filter (search, `Select` danh mục từ `useCategories`, khoảng ngày bằng `Calendar` + `Popover`), phân trang theo `meta.totalPages`, nút xoá + `Dialog` xác nhận → `useDeleteEntry` + toast.
8. **Reports**: `Tabs` ngày / tháng / năm cho `groupBy`, chọn khoảng ngày, top stores. Nếu backend trả 402/403 (năm là Pro) thì hiện thông báo nâng cấp thay vì lỗi chung.
9. **Settings**: hiện profile từ `useMe()`. `proSource` + `proExpiresAt` → "Trial còn N ngày". `/me/entitlement` thuộc plan 07.
10. Thêm shadcn `popover` (cho date picker): `PATH=<shim>:$PATH pnpm dlx shadcn@latest add popover pagination`.
11. Xoá `lib/mock-data.ts` và các `TODO(plan)` đã xử lý. Cập nhật `CLAUDE.md`.

## Verify

- [ ] Tài khoản mới (0 entry): mọi trang hiện empty state, không lỗi, không NaN.
- [ ] Tạo vài entry từ mobile hoặc curl → dashboard hiện đúng tổng, số khoản, trung bình. So với `GET /reports/summary` gọi tay.
- [ ] Entries: search / lọc danh mục / khoảng ngày / đổi trang chạy đúng. URL đổi theo, F5 giữ nguyên filter. Đổi trang không chớp trắng (`keepPreviousData`).
- [ ] Xoá entry → biến khỏi bảng, overview và reports cập nhật mà không cần F5.
- [ ] Tắt backend → error state + nút thử lại. Bật lại, bấm thử lại → có dữ liệu.
- [ ] Để access hết hạn (hoặc xoá `pt_access`) → query vẫn chạy (proxy refresh), không bị đá ra login.
- [ ] Logout rồi login tài khoản khác → không thấy dữ liệu tài khoản cũ (cache đã clear).
- [ ] React Query Devtools: key đúng cấu trúc, không có query trùng.
- [ ] `lib/mock-data.ts` đã bị xoá, `grep -r mock src/` rỗng.
- [ ] typecheck + lint + build pass.

## Ngoài phạm vi

- Prefetch trên server + `HydrationBoundary` (tối ưu first paint): cân nhắc sau.
- Sửa / tạo entry (plan 04), calendar (plan 03).
