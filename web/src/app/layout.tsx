import type { Metadata, Viewport } from "next"
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google"

import { Providers } from "@/components/shared/providers"
import { siteConfig } from "@/config/site"
import { brandHex } from "@/lib/brand"

import "./globals.css"

// Geist has no Vietnamese subset (ạ, ố, ữ… would fall back to another font).
const fontSans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
})
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
}

// Mobile browser chrome matches the page background in each colour scheme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandHex.background },
    { media: "(prefers-color-scheme: dark)", color: brandHex.backgroundDark },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables go on <html>: globals.css applies `font-sans` there.
    <html lang="vi" className={`${fontSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
