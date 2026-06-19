import { api } from './client';
import type { PresignResult } from './types';

// Ask the backend for a short-lived presigned PUT URL (DESIGN §7).
export async function presignUpload(
  contentType: string,
  ext: string,
): Promise<PresignResult> {
  const { data } = await api.post<PresignResult>('/uploads/presign', {
    contentType,
    ext,
  });
  return data;
}

// PUT the local image straight to S3 — NOT through `api` (no auth header, and the URL
// is already signed). The Content-Type MUST match what the backend signed, or S3 rejects it.
export async function putImageToS3(
  uploadUrl: string,
  localUri: string,
  contentType: string,
): Promise<void> {
  const fileRes = await fetch(localUri);
  const blob = await fileRes.blob();

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status})`);
  }
}
