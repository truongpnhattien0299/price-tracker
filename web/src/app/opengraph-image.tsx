import { ImageResponse } from "next/og"

import { siteConfig } from "@/config/site"
import { brandHex, CameraMark } from "@/lib/brand"

export const alt = siteConfig.name
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Latin-only text on purpose: next/og's bundled font has no Vietnamese
// diacritics, and loading one would mean a network fetch at build (plans/06 T6).
// The month of coloured tiles says "photo diary" without words.

// Filled days of a sample month (Mon-first, 5 weeks); values index brandHex.produce.
const days: (number | null)[] = [
  null, null, null, 0, 1, null, 2,
  1, 3, null, 0, 4, null, 2,
  null, 0, 1, null, 3, 0, null,
  4, null, 2, 1, null, 0, 3,
  0, 1, null, 2, null, null, null,
]

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: brandHex.authPanel, padding: 72, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", width: 112, height: 112, borderRadius: 28, background: brandHex.primary, alignItems: "center", justifyContent: "center" }}>
            <CameraMark size={64} color={brandHex.primaryForeground} />
          </div>
          <div style={{ fontSize: 84, fontWeight: 700, color: brandHex.foreground, letterSpacing: -2 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", width: 7 * 64 + 6 * 10, gap: 10 }}>
          {days.map((d, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: d === null ? brandHex.background : brandHex.produce[d],
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  )
}
