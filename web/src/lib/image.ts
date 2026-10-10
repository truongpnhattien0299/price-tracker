// Same output as mobile/src/lib/image.ts (≤1080px wide, JPEG 0.7), so photos
// look alike whichever client took them and stay small in storage.
const MAX_WIDTH = 1080
const QUALITY = 0.7

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

/** Resize + re-encode a picked file as JPEG. Honours EXIF rotation from phone cameras. */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D is not available")
    // JPEG has no alpha: paint transparent PNG/WebP areas white, not black.
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode JPEG"))), "image/jpeg", QUALITY),
    )
  } finally {
    bitmap.close()
  }
}
