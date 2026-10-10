"use client"

import { useMutation } from "@tanstack/react-query"

import { uploadsApi } from "@/lib/api/endpoints"
import { compressImage } from "@/lib/image"

/** Thrown when the PUT to storage fails, so forms can tell it apart from API errors. */
export class UploadError extends Error {}

/**
 * Compress → presign → PUT the bytes straight to storage (R2 / MinIO), never
 * through the BFF. Resolves to the `photoKey` to attach to an entry.
 */
async function uploadPhoto(file: Blob) {
  const blob = await compressImage(file)
  const { uploadUrl, photoKey } = await uploadsApi.presign({ contentType: "image/jpeg", ext: "jpg" })
  let res: Response
  try {
    // Content-Type must equal the signed one or storage rejects the signature.
    res = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } })
  } catch {
    // A CORS rejection looks like a network error to fetch.
    throw new UploadError("network")
  }
  if (!res.ok) throw new UploadError(`HTTP ${res.status}`)
  return photoKey
}

export function useUploadPhoto() {
  return useMutation({ mutationFn: uploadPhoto })
}
