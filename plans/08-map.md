# Plan 08 — Vị trí ảnh + tab Bản đồ (OpenStreetMap)

**Phụ thuộc:** Plan 03 (`Photo`, `usePhotoUrls`, `EntryDetailDialog`), Plan 04 (`EntryFormDialog`, `compressImage`, `useUploadPhoto`), Plan 07 (`present()`, `historyFrom`, `ProLock`).

**Trạng thái:** ✅ Xong 2026-10-10. User chốt: Free xem bản đồ trong cửa sổ 3 tháng; làm cả reverse geocode (M11) và giờ chụp từ EXIF (M12). Chưa thử trên điện thoại thật (xem "Còn lại").

## Mục tiêu

1. **Lấy toạ độ cho entry tạo/sửa trên web**, theo thứ tự ưu tiên:
   - GPS trong **EXIF của ảnh** (ảnh upload từ máy, ảnh gốc từ điện thoại).
   - **Vị trí thiết bị** (`navigator.geolocation`) khi user vừa **chụp** ảnh bằng camera qua trình duyệt điện thoại.
   - **Chọn tay trên bản đồ** (kéo ghim / chạm bản đồ) khi hai cách trên không có.
2. **Tab "Bản đồ"** (`/dashboard/map`): mỗi entry có toạ độ thành một ghim là ảnh thu nhỏ; gần nhau thì gom cụm. Bấm ghim mở `EntryDetailDialog`.
3. Bản đồ **miễn phí, dữ liệu OpenStreetMap**, nhưng **trông ngang hoặc đẹp hơn Google Maps**. Không dùng tile raster mặc định của OSM (`tile.openstreetmap.org`): ảnh PNG cố định, màu cũ, mờ trên retina, không có dark mode. Thay bằng **vector tile + style tự viết** (MapLibre GL + OpenFreeMap).

Plan 04 ghi "toạ độ GPS không sửa trên web". Plan này bỏ giới hạn đó.

## Hiện trạng trước plan

- Schema đã có `latitude` / `longitude` (`Decimal(10,7)`, nullable) và `address`. `CreateEntryDto` có `@IsLatitude` / `@IsLongitude`. **Không cần migration.**
- Mobile đã ghi toạ độ lúc chụp (`useLocation`). Entry tạo trên web luôn `null`.
- `compressImage()` vẽ lại ảnh qua canvas → **EXIF mất hết**. Phải đọc EXIF **trước** khi nén. Đây cũng là điều tốt: ảnh lưu trên R2 không mang GPS, toạ độ chỉ nằm trong DB.
- Chưa có endpoint lấy toạ độ hàng loạt; `GET /entries` phân trang, không hợp để vẽ bản đồ.

## Quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| M1 | Thư viện bản đồ | **MapLibre GL JS v5** qua **`react-map-gl/maplibre`** (v8). Vẽ vector bằng WebGL: zoom mượt, xoay/nghiêng, chữ nét trên retina, nhà 3D, đổi màu được từng lớp. Đánh đổi: ~220 KB gzip → chỉ lazy-load (`next/dynamic`, `ssr: false`) ở trang Bản đồ và field Vị trí; `next build` xác nhận không trang nào có MapLibre trong first-load JS. Không có WebGL → thông báo thay cho map. **Ghim `maplibre-gl@^5`**: v6 là ESM-only, worker tách file riêng, chưa chắc bundle được với Turbopack + react-map-gl 8. |
| M2 | Nguồn tile | **[OpenFreeMap](https://openfreemap.org)**: vector tile OSM theo schema OpenMapTiles. Miễn phí, không đăng ký, không API key, không giới hạn lượt xem, cho dùng thương mại. Attribution "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" đến từ TileJSON, MapLibre tự hiện (thu gọn thành `ⓘ`). Rủi ro: sống bằng donate, không SLA → style chỉ trỏ tới URL source, đổi nguồn = sửa một URL. Không chọn MapTiler / Stadia / Mapbox: cần key, có hạn mức. |
| M2b | Style "kiểu Google Maps" | Style **tự sinh** từ *Liberty* của OpenFreeMap bằng `web/scripts/map-style/build.mjs` (mục "Style bản đồ"): giữ cấu trúc layer, thay toàn bộ màu theo bảng màu kiểu Google, tên tiếng Việt, bớt POI. **2 bản sáng / tối** cùng một danh sách layer. |
| M3 | Đọc EXIF | **`exifr`** (bản full, `import()` lười khi chọn ảnh đầu tiên): `exifr.gps()` + `DateTimeOriginal` / `OffsetTimeOriginal` với `reviveValues: false` để tự xử lý múi giờ. Chạy trong browser, không gửi file đi đâu. |
| M4 | Khi nào dùng vị trí thiết bị | Chỉ khi ảnh **vừa chụp**: `file.lastModified` cách hiện tại ≤ 2 phút **và** EXIF không có GPS. Ảnh cũ không GPS thì **không đoán** (sai chỗ tệ hơn không có) → để trống, user chọn tay hoặc bấm "Vị trí hiện tại". |
| M5 | Thực tế trên trình duyệt điện thoại | iOS Safari và Android Chrome (Android 10+) **thường xoá GPS khỏi ảnh** đưa qua `<input type=file>`. Trên điện thoại, nguồn chính là M4; EXIF chủ yếu có ích khi upload ảnh gốc từ máy tính. Không cố vượt qua giới hạn này. |
| M6 | Nút chụp | Nút **"Chụp ảnh"** (`<input capture="environment">`) cạnh "Chọn ảnh", chỉ hiện khi `(pointer: coarse)`. |
| M7 | Endpoint bản đồ | `GET /entries/map?from&to&category` trả **toàn bộ** điểm có toạ độ trong khoảng, trần 5000 + cờ `truncated`. Free tối đa 50 entry/tháng → vài trăm điểm; gửi một lần rồi gom cụm ở client rẻ hơn query theo bbox mỗi lần kéo map. |
| M8 | Free / Pro | Luật plan 07: Free chỉ thấy điểm **trong cửa sổ 3 tháng**. Không trả toạ độ của entry bị khoá (vị trí cũng là dữ liệu Pro), chỉ trả `lockedCount`. `from < historyFrom` thì **kẹp** về `historyFrom` thay vì 402 — bản đồ mở mặc định "tất cả", báo lỗi ngay khi vào trang là trải nghiệm tệ. `lockedCount` chỉ đếm phần khoảng được hỏi mà cửa sổ che đi (hỏi `from` sau `historyFrom` → 0). |
| M9 | Gom cụm | **`supercluster`** ở client, ghim/cụm là `<Marker>` HTML. Không dùng cluster của GeoJSON source MapLibre: vẽ bằng WebGL, không gắn được ảnh presigned. Cụm dừng tách ở z17 (`getClusters` kẹp zoom ≤ 17): nhiều lần mua trong ~70 m (cùng chợ) vẫn là một cụm khi zoom sâu, không chồng ghim; bấm vào thì mở Sheet. |
| M10 | Ảnh trên ghim | Ghim = ảnh tròn 44px viền trắng + bóng + mũi nhọn; cụm = ảnh bìa (entry **mới nhất có ảnh**, tính trong `map`/`reduce` của supercluster) + badge số. URL qua **một** `POST /uploads/photo-urls` cho key **đang trong khung nhìn** (≤ 100), tính lại khi `moveend` (không debounce thêm: `moveend` chỉ bắn khi map dừng). Không bao giờ một request cho mỗi ghim. Entry không ảnh → tròn màu primary có icon hoá đơn. |
| M11 | Reverse geocode | Nominatim qua BFF route `GET /api/geocode/reverse?lat&lng` (cần cookie phiên): `User-Agent` định danh app, **hàng đợi chung ≥ 1.1 s/request** cho mọi user của instance, cache 500 ô ~11 m. Trả `{ address, placeName }`: `address` rút gọn (số nhà + đường, phường, quận nếu có, tỉnh/TP), `placeName` chỉ khi điểm là chỗ bán hàng (`shop`, hoặc `amenity` trong chợ/quán ăn/cà phê/bar/xăng/thuốc). Form điền **Địa chỉ** và **Cửa hàng** khi ô đang trống hoặc vẫn giữ giá trị lần tra trước (user đã gõ thì không đè). |
| M12 | Giờ mua từ EXIF | Khi **tạo** entry và user chưa sửa ô giờ mua: điền `DateTimeOriginal` (`OffsetTimeOriginal` nếu có, không thì coi là giờ VN), bỏ qua nếu ở tương lai. Mô tả dưới ô đổi thành "Lấy từ giờ chụp trong ảnh". |

## Backend

1. **`GET /entries/map`** (`MapQueryDto`: `from?`, `to?`, `category?`), khai báo trước `@Get(':id')`.
   - `mapPoints(userId, q)`: `access()` → Free kẹp `from`; `findMany` có `latitude/longitude not null`, `orderBy purchasedAt desc`, `take 5001`; mỗi dòng **vẫn qua `present()`** rồi bỏ `locked` (giữ bất biến "mọi lần đọc entry qua `present()`").
   - Response `{ points: MapPoint[], truncated, lockedCount }`, `MapPoint = { id, lat, lng, photoKey, blurhash, purchasedAt, price, currency, productName, storeName, categoryId }`. Toạ độ là **number**; `price` vẫn Decimal string.
2. **`latitude` / `longitude` phải gửi cùng nhau** (`assertCoordinatePair` trong `create` + `update`): chỉ một key, hoặc một `null` một số → 400. Trước đó `PATCH {latitude: null}` lọt qua và để lại nửa toạ độ.

## Web

### 0. Style bản đồ (`web/scripts/map-style/` → `web/public/map/`)

`node scripts/map-style/build.mjs` đọc `liberty.json` (bản vendored của `https://tiles.openfreemap.org/styles/liberty`) và ghi `public/map/light.json` + `dark.json`. **Sửa bảng màu trong script, không sửa JSON sinh ra.** Kiểm hợp lệ bằng `validateStyleMin` của `@maplibre/maplibre-gl-style-spec` (đã chạy, cả hai "valid").

Nguyên tắc: **giống Google ở chỗ dễ đọc** (màu quen, phân cấp đường rõ, nhãn sạch), **hợp app hơn ở chỗ yên tĩnh**: bản đồ là nền trung tính để **ảnh trên ghim là thứ nổi nhất** (cùng tinh thần plan 06).

| Lớp | Sáng | Tối |
|---|---|---|
| Nền đất | `#f5f3f0` | `#1d2126` |
| Nước | `#aadaff` | `#132c44` |
| Công viên | `#cdeacb` | `#1d3527` |
| Toà nhà | `#e9e6e2`, 3D `#e4e1dc` | `#272b31` |
| Đường thường / chính | trắng, viền `#e2ded8` / `#d6d2cb` | `#33383e` / `#3b4047` |
| Quốc lộ (trunk) / cao tốc | `#fde293` / `#fdd77e` | `#665a35` / `#7a6431` |
| Chữ đường / địa danh | `#5f6368` / `#3c4043`, halo trắng | `#a9afb5` / `#dadde0` |

Các thay đổi khác so với Liberty:

- **Tên tiếng Việt**: Liberty ưu tiên `name_en` ("Ho Chi Minh City"). Đổi thành `coalesce(name:vi, name:latin, name)`: tên Việt, rồi tên chữ Latin (quán chỉ có biển Hán/Hàn ra phiên âm), rồi tên gốc. Font Noto Sans của OpenFreeMap hiển thị đủ dấu (đã xem "Đường Nguyễn Thị Minh Khai", "Sông Sài Gòn").
- **POI tiết chế hơn Google**: z15–16 chỉ chỗ bán hàng (shop, grocery, bakery, butcher, nhà hàng, cà phê, bar, …); POI khác dồn vào layer `poi_other` từ z17.
- **Nhãn "Khu phố"** (`neighbourhood`, `hamlet`) dời sang z15.5 và **trạm xe buýt** sang z16.5: ở z14 Liberty dày đặc "KHU PHỐ n" và icon xe buýt, Google không hiện. Phường (`suburb`, `quarter`) giữ nguyên.
- Bỏ lớp hillshade Natural Earth, viền công viên chấm chấm, khiên đường Mỹ.
- Ánh sáng 3D `intensity 0.2` (sáng: trắng, tối: xám) để nhà nhìn từ trên xuống trông phẳng như Google, không thành khối đen; hoa văn khu đi bộ (sprite vẽ cho nền sáng) mờ 12% ở bản tối.

Đổi theme: `BaseMap` đổi `mapStyle` theo `resolvedTheme`; marker HTML giữ nguyên (đã thử đổi khi đang mở map). Nút zoom / attribution theo theme qua `globals.css`.

### 1. Đọc vị trí (`lib/photo-location.ts`)

- `readPhotoMeta(file)` → `{ gps, takenAt }`, không bao giờ throw. Bỏ toạ độ NaN, ngoài khoảng, hoặc đúng `0,0`.
- `isFreshCapture(file)`: `lastModified` trong 2 phút.
- `getDevicePosition()`: `null` nếu không có secure context / bị từ chối / quá 10 s. **Mở dev server qua `http://<IP LAN>` trên điện thoại thì geolocation bị chặn** — test bằng `next dev --experimental-https` hoặc tunnel.
- `roundCoord()`: làm tròn 7 số lẻ như cột DB, để so sánh "không đổi" khi PATCH.

### 2. Form entry (`entry-form-dialog.tsx`, `location-picker.tsx`)

- Chọn ảnh → `locatePhoto(file)`: EXIF GPS → (ảnh vừa chụp) GPS thiết bị → không có thì giữ nguyên. Đổi ảnh khi sửa mà ảnh mới có vị trí → ghi đè (vẫn kéo ghim lại được). Bộ đếm `locateSeq` / `geocodeSeq`: lần chọn ảnh / thả ghim sau thắng kết quả chậm của lần trước.
- Field **"Vị trí"** dưới "Địa chỉ": bản đồ nhỏ h-56 (chỉ tải khi có vị trí hoặc bấm "Chọn trên bản đồ"), ghim kéo được, chạm bản đồ đặt ghim; nút "Vị trí hiện tại", "Xoá vị trí"; dòng trạng thái theo nguồn (`exif` / `device` / `manual` / `saved`).
- Lưu: tạo → gửi cả hai toạ độ nếu có. Sửa → chỉ gửi khi đổi; xoá → `null` cả hai. Đang chờ GPS vẫn lưu được (lưu không toạ độ).
- `EntryDetailDialog`: entry có toạ độ → "Xem trên bản đồ" (`/dashboard/map?entry=<id>`; ẩn khi đang ở trang Bản đồ).

### 3. Tab Bản đồ

| Phần | File |
|---|---|
| Nav "Bản đồ" (sau "Lịch") | `config/dashboard.ts` |
| Route | `app/(dashboard)/dashboard/map/page.tsx` |
| View: bộ lọc danh mục + khoảng ngày (Free có `minDate`), URL `?from&to&category&entry`, banner Free, empty state, Sheet "cùng một chỗ", dialog chi tiết | `components/dashboard/map/map-view.tsx` |
| Map + supercluster + batch URL ảnh + fit | `components/dashboard/map/entries-map.tsx` |
| Nền dùng chung (style theo theme, điều khiển, attribution, kiểm WebGL) | `components/shared/map/base-map.tsx` |
| Ghim ảnh / ghim chọn vị trí | `components/shared/map/pins.tsx` |
| Query `qk.entries.map(q)` — nằm dưới `entries`, nên mọi mutation entry làm mới bản đồ | `hooks/queries/use-map-points.ts` |

Hành vi: lần đầu / đổi bộ lọc → `fitBounds` (padding 64, tối đa z15), kéo map thì không fit lại; mở bằng `?entry=` → bay tới đúng ghim (z17). Bấm cụm → `flyTo` zoom tách cụm; không tách được nữa → Sheet lưới ảnh. Bấm ghim → `?entry=<id>` + dialog. Banner/ghi chú nằm trên map, chừa chỗ cho nút zoom.

### 4. Dependencies (web)

`maplibre-gl@^5`, `react-map-gl@^8`, `supercluster`, `exifr`, `@types/supercluster` (dev).

## Kết quả verify (2026-10-10)

Tài khoản test mới đăng ký qua API, hạ xuống Free bằng Prisma; 12 entry seed (8 có ảnh quanh Q1, 1 ở Hà Nội 4 tháng trước, 1 không vị trí). Dữ liệu test đã xoá sau khi verify (DELETE qua API, backend xoá luôn object ảnh).

Backend (curl):

- `/entries/map` không token → 401. Pro: đủ 3 điểm có toạ độ, không có entry `latitude null`. Free: điểm 4 tháng trước biến mất, `lockedCount: 1`; `from=2020-…` bị kẹp (vẫn 200, `lockedCount: 1`); `from` = tuần trước → `lockedCount: 0`.
- `PATCH {latitude:null}` / `{longitude:106}` / `{latitude:10,longitude:null}` → 400; PATCH không đụng toạ độ → 200; `{latitude:null, longitude:null}` → xoá, điểm biến khỏi map.

Web (browser pane, Chrome):

- Style: z14 Quận 1 và z16.5 Bến Thành, sáng + tối; tên đủ dấu; tile chỉ từ `tiles.openfreemap.org`.
- Map: 6 ghim + cụm "5" ở Bến Thành; bấm cụm → bay vào tách thành 2/2/1; bấm cụm "2" (cùng chợ) → Sheet "Chợ Bến Thành"; bấm ảnh → dialog + `?entry=`. Network chỉ có batch `POST photo-urls`, không có `photo-url` lẻ. Deep link `?entry=` từ ngoài → bay tới đúng ghim. Đổi theme khi đang mở map → giữ ghim. Viewport 375px.
- Form: ảnh JPEG có EXIF GPS + `DateTimeOriginal` (EXIF tự chèn bằng script) → giờ mua 08:15, địa chỉ tự tra, ghim đúng chỗ, trạng thái "Lấy từ thông tin GPS trong ảnh". Chạm bản đồ → "Đã chọn trên bản đồ". Lưu → API trả đúng toạ độ ghim, `purchasedAt 01:15Z` (= 08:15 VN), địa chỉ. Sửa → "Xoá vị trí" → PATCH null cả hai.
- Ảnh "vừa chụp" không GPS (geolocation giả lập) → "Vị trí của máy lúc chụp" + địa chỉ tra từ toạ độ. Ảnh cũ 7 ngày không GPS → để trống, không gọi geolocation.
- `typecheck`, `lint`, `build` pass.

Gặp khi verify, **không thuộc plan này**: `backend/.env` đang trỏ storage vào **bucket R2 thật**, và bucket chưa có CORS cho `http://localhost:3001` → upload ảnh từ web local bị chặn ("Không tải được ảnh lên"). Sửa: thêm CORS theo `docs/storage-r2.md` §4, hoặc trỏ `STORAGE_*` về MinIO khi dev. Phần form được verify bằng cách bỏ ảnh trước khi lưu (vị trí vẫn giữ).

## Còn lại

- Thử trên điện thoại thật (HTTPS): nút "Chụp ảnh" → quyền vị trí → ghim; xác nhận M5 (ảnh chọn từ thư viện iOS/Android có còn GPS không).
- So sánh style cạnh Google Maps ở Hà Nội và z11 toàn TP — mới so ở TP.HCM z14 / z16.5.

## Ngoài phạm vi

- Bản đồ trên mobile (Phase 8, `react-native-maps`) — tái dùng được `GET /entries/map`.
- Tìm địa điểm theo tên (forward geocode / autocomplete): Nominatim cấm autocomplete.
- Heatmap chi tiêu theo khu vực, gợi ý tên cửa hàng theo vị trí gần đây (DESIGN.md §9.2).
- Tự host tile: PMTiles (Protomaps) cắt riêng Việt Nam đặt trên R2 (không phí egress) + `pmtiles` protocol. Chỉ cần nếu OpenFreeMap ngừng hoặc chậm; style giữ nguyên, đổi URL source.
- Nominatim tự host / nhà cung cấp geocode khác: chỉ khi traffic vượt 1 req/s.
