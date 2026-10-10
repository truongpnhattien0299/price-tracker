import type { Metadata } from "next"
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google"

import { Providers } from "@/components/shared/providers"
import { siteConfig } from "@/config/site"

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
