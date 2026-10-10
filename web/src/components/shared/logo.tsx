import { CameraIcon } from "lucide-react"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
        <CameraIcon className="size-4" />
      </span>
      <span>{siteConfig.name}</span>
    </Link>
  )
}
