import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { brandHex } from "@/lib/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "vi",
    start_url: "/dashboard",
    display: "standalone",
    background_color: brandHex.background,
    theme_color: brandHex.primary,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  }
}
