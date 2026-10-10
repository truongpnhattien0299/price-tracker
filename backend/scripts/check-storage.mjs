// Smoke test for the photo storage in `.env` (Cloudflare R2 or local MinIO).
// Runs the app's exact flow with presigned URLs: PUT → GET → DELETE.
//
//   node --env-file=.env scripts/check-storage.mjs
//
// Mirrors the S3Client options in src/uploads/uploads.service.ts — keep in sync.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const env = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

const bucket = env('STORAGE_BUCKET');
const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? 'auto',
  endpoint: env('STORAGE_ENDPOINT'),
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
  credentials: {
    accessKeyId: env('STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: env('STORAGE_SECRET_ACCESS_KEY'),
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const Key = `healthcheck/${randomUUID()}.txt`;
const body = `price-tracker storage check ${new Date().toISOString()}`;
const step = (msg) => console.log(`✓ ${msg}`);

try {
  const putUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key, ContentType: 'text/plain' }),
    { expiresIn: 300 },
  );
  const put = await fetch(putUrl, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!put.ok) throw new Error(`PUT ${put.status}: ${await put.text()}`);
  step(`presigned PUT → ${new URL(putUrl).host}`);

  const getUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key }),
    { expiresIn: 300 },
  );
  const get = await fetch(getUrl);
  if (!get.ok) throw new Error(`GET ${get.status}: ${await get.text()}`);
  if ((await get.text()) !== body) throw new Error('GET returned other bytes');
  step('presigned GET returns the same bytes');

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  step('DeleteObject');
  console.log(`Storage OK: bucket "${bucket}"`);
} catch (err) {
  console.error(`✗ ${err.message ?? err}`);
  process.exitCode = 1;
}
