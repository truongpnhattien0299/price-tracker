import Link from "next/link"

import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Button } from "@/components/ui/button"
import { marketingNav } from "@/config/site"

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Logo />
        <nav className="text-muted-foreground hidden gap-6 text-sm md:flex">
          {marketingNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground transition-colors">
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Dùng thử</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
