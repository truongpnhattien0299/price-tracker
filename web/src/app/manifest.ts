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
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "/icons/icon-maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  }
}
