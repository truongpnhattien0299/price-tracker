"use client"

import { MenuIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { marketingNav, siteConfig } from "@/config/site"

/** The marketing nav below `md`, where the header only has room for the logo and CTAs. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{siteConfig.name}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {marketingNav.map((item) => (
            <Button key={item.href} variant="ghost" className="justify-start" asChild>
              <Link href={item.href} onClick={close}>
                {item.title}
              </Link>
            </Button>
          ))}
          <Separator className="my-2" />
          <Button variant="ghost" className="justify-start" asChild>
            <Link href="/login" onClick={close}>
              Đăng nhập
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
