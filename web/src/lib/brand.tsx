// Hex copies of the theme tokens for places that cannot read CSS variables:
// generated images (next/og has no oklch and no stylesheet) and <meta theme-color>.
// Source of truth stays globals.css — keep these in sync when the brand changes.
export const brandHex = {
  primary: "#05773b", // --primary (light)
  primaryForeground: "#fafafa",
  background: "#ffffff",
  backgroundDark: "#0a0a0a", // --background (dark)
  foreground: "#0a0a0a",
  mutedForeground: "#737373",
  authPanel: "#f1f5ed",
  produce: ["#5a8a3d", "#bd6254", "#ca8a10", "#836145", "#6b8496"], // greens, meat, fruit, drink, snack
}

/** lucide "camera", inlined so next/og can draw it. */
export function CameraMark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
