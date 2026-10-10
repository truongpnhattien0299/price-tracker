import Image from "next/image"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      {/* Same round art as the favicon / PWA icon (public/icons). */}
      <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="size-7 shrink-0" />
      <span>{siteConfig.name}</span>
    </Link>
  )
}
