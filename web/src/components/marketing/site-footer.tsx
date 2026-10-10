import Link from "next/link"

import { Logo } from "@/components/shared/logo"
import { Separator } from "@/components/ui/separator"
import { marketingNav, siteConfig, storeLinks } from "@/config/site"

const columns = [
  { title: "Sản phẩm", links: marketingNav.map((n) => ({ title: n.title, href: n.href })) },
  {
    title: "Tài khoản",
    links: [
      { title: "Đăng nhập", href: "/login" },
      { title: "Đăng ký", href: "/register" },
    ],
  },
  {
    title: "Tải app",
    links: [
      { title: "App Store", href: storeLinks.appStore, external: true },
      { title: "Google Play", href: storeLinks.playStore, external: true },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[2fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm text-pretty">{siteConfig.description}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3 text-sm">
            <p className="font-medium">{col.title}</p>
            <ul className="text-muted-foreground flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.title}>
                  {!l.href ? (
                    <span className="text-muted-foreground/60">{l.title} · sắp có</span>
                  ) : "external" in l ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                      {l.title}
                    </a>
                  ) : (
                    <Link href={l.href} className="hover:text-foreground transition-colors">
                      {l.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Separator />
      <p className="text-muted-foreground container mx-auto px-4 py-6 text-sm">
        © {new Date().getFullYear()} {siteConfig.name}
      </p>
    </footer>
  )
}
