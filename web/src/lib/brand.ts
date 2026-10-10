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
