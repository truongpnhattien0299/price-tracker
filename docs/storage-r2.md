# Lưu ảnh trên Cloudflare R2

Ảnh entry nằm trên **Cloudflare R2**. Local dev dùng **MinIO**.

Cả hai đều nói S3 API, nên backend dùng nguyên `@aws-sdk/client-s3` + presigned URL. Luồng upload không đổi:

1. App xin URL ký sẵn ở `POST /uploads/presign`.
2. App PUT ảnh thẳng lên R2.
3. Backend chỉ lưu `photoKey`.

## Vì sao R2 thay S3

- **Không tính phí egress.** App tải ảnh nhiều (lịch tháng, lưới ngày, chi tiết). Ở S3, phần này là chi phí chính.
- Free tier mỗi tháng: 10 GB lưu trữ, 1 triệu thao tác ghi (Class A), 10 triệu thao tác đọc (Class B).
- Tương thích S3, nên chỉ đổi config, không đổi code nghiệp vụ.

Đổi lại:

- **Không có IAM role.** Luôn cần access key tường minh.
- **Textract không đọc thẳng được R2** (OCR, DESIGN.md §14.7). Backend phải tải bytes rồi gửi cho Textract.

## 1. Tạo bucket

Trên Cloudflare dashboard → **R2 Object Storage**.

Lần đầu phải bật R2 và khai báo phương thức thanh toán. Dùng trong free tier thì không bị trừ tiền.

**Create bucket:**

| Mục | Giá trị |
|---|---|
| Name | `price-tracker-photos` (dev riêng thì `price-tracker-photos-dev`) |
| Location | *Provide a location hint* → **Asia-Pacific (APAC)**, gần người dùng VN |
| Default storage class | Standard |

Sau khi tạo, vào **Settings** của bucket:

- **Public access:** để **tắt**, cả *R2.dev subdomain* lẫn *Custom domain*. Ảnh là dữ liệu riêng của từng user, chỉ đọc qua presigned GET 5 phút.
- **CORS:** xem mục 4.

## 2. Tạo API token

R2 → **Manage API tokens** → **Create API token** (Account API token là đủ):

| Mục | Giá trị |
|---|---|
| Permissions | **Object Read & Write**. Không chọn *Admin*. |
| Specify bucket(s) | **Apply to specific buckets only** → chỉ `price-tracker-photos` |
| TTL | Tuỳ, để Forever thì nhớ xoay key định kỳ |

Bấm Create. Cloudflare hiện ra:

- **Access Key ID**
- **Secret Access Key**: **chỉ hiện một lần**, copy ngay.
- **Endpoint** dạng `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

Account ID cũng xem được ở trang R2 Overview, mục *Account Details*.

Bucket tạo với jurisdiction EU thì endpoint là `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.

## 3. Biến môi trường backend

Các biến dùng tên trung lập `STORAGE_*`. Không dùng `AWS_*`, vì mọi client AWS SDK khác (Textract sau này) sẽ tự đọc `AWS_ACCESS_KEY_ID` và nhận nhầm key R2.

```dotenv
STORAGE_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_FORCE_PATH_STYLE="false"
STORAGE_BUCKET="price-tracker-photos"
STORAGE_ACCESS_KEY_ID="<Access Key ID>"
STORAGE_SECRET_ACCESS_KEY="<Secret Access Key>"
```

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `STORAGE_ENDPOINT` | ✔ | Endpoint S3 API của account. **Không** dùng custom domain hay `*.r2.dev`, vì presigned URL chỉ chạy trên endpoint S3 API. |
| `STORAGE_BUCKET` | ✔ | |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | ✔ | Từ bước 2. Production để trong env / SSM, **không commit**. |
| `STORAGE_REGION` | | R2 luôn là `auto` (mặc định). MinIO dùng `us-east-1`. |
| `STORAGE_FORCE_PATH_STYLE` | | R2 nhận cả hai kiểu. MinIO local cần `true`. |

Thiếu biến bắt buộc thì API **không khởi động** (`getOrThrow`), không chết âm thầm lúc upload.

### Kiểm tra key

```bash
cd backend
corepack pnpm@10.34.3 run storage:check
```

Script `scripts/check-storage.mjs` chạy đúng luồng của app với file thử dưới `healthcheck/`: presigned PUT → presigned GET (so bytes) → DeleteObject. Kết quả mong đợi:

```
✓ presigned PUT → <ACCOUNT_ID>.r2.cloudflarestorage.com
✓ presigned GET returns the same bytes
✓ DeleteObject
Storage OK: bucket "price-tracker-photos"
```

Lỗi thường gặp:

| Lỗi | Nguyên nhân |
|---|---|
| `PUT 403 … SignatureDoesNotMatch` | Sai secret key, hoặc `Content-Type` lúc PUT khác lúc ký |
| `PUT 403 … AccessDenied` / `Unauthorized` | Token không có quyền trên bucket này (sai bucket ở bước 2) |
| `PUT 404 … NoSuchBucket` | Sai `STORAGE_BUCKET`, hoặc endpoint thiếu `.eu` với bucket EU |
| `PUT 400 … checksum` | Mất cấu hình `requestChecksumCalculation: 'WHEN_REQUIRED'` (xem *Ghi chú kỹ thuật*) |

## 4. CORS

Hiện **không cần** CORS:

- App mobile PUT bằng `fetch` native, không qua browser.
- Web chỉ hiện ảnh bằng `<img>`, không bị CORS chặn.

Cần thêm khi **browser** PUT thẳng lên R2: Expo web (`pnpm run web`), hoặc web dashboard có upload (plan sau). Bucket → Settings → **CORS policy**:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3001", "http://localhost:8081", "https://<domain-web-prod>"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Chỉ liệt kê origin thật, không dùng `"*"`.

## 5. Local dev

Mặc định vẫn dùng MinIO, không cần mạng hay key Cloudflare:

```bash
cd backend
docker compose up -d minio minio-init
```

`.env.example` có sẵn cả hai block MinIO và R2. Muốn thử local với R2 thật thì tạo **bucket + token riêng cho dev** (`price-tracker-photos-dev`), rồi đổi block `STORAGE_*` trong `.env`. Không dùng chung bucket production.

## 6. Production

- Set 6 biến `STORAGE_*` trong env của container API (EC2 / SSM Parameter Store).
- Chạy `storage:check` một lần trên máy deploy để chắc key và endpoint đúng.
- Hiện chưa có dữ liệu thật trên S3 nên không phải migrate. Nếu sau này có, dùng `rclone sync` từ S3 sang R2. `photoKey` giữ nguyên, vì DB chỉ lưu key, không lưu URL.

## Ghi chú kỹ thuật

- **Checksum:** `@aws-sdk/client-s3` ≥ 3.729 mặc định ký `x-amz-checksum-crc32` của **body rỗng** vào presigned PUT URL. Client upload ảnh thật thì checksum lệch, R2 từ chối. `uploads.service.ts` vì vậy đặt `requestChecksumCalculation` / `responseChecksumValidation` = `'WHEN_REQUIRED'`. **Đừng xoá.**
- Presigned URL của R2 hết hạn tối đa 7 ngày. App dùng 5 phút cho cả PUT lẫn GET.
- Xoá entry thì backend xoá object trên R2 theo kiểu best-effort, lỗi bị bỏ qua.
- Ảnh mồ côi (đã presign + PUT nhưng không tạo entry) chưa được dọn. Sau này có thể dùng lifecycle rule của R2 hoặc job dọn theo prefix.
