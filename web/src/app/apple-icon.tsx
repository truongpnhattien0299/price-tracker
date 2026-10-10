import { ImageResponse } from "next/og"

import { brandHex, CameraMark } from "@/lib/brand"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// iOS rounds the corners itself, so the square is full-bleed.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: brandHex.primary }}>
        <CameraMark size={104} color={brandHex.primaryForeground} />
      </div>
    ),
    size,
  )
}
