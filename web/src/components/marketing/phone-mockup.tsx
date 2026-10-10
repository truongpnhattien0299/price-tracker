import { MapPinIcon } from "lucide-react"

import { produceTones } from "@/components/shared/month-grid"
import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The mobile capture sheet right after a photo (DESIGN.md §9.2): photo on top,
// price focused, category remembered, store filled from GPS. Drawn in JSX rather
// than a screenshot (plans/05 L1). Purely decorative — no focusable elements.

const categories = [
  { icon: "🥬", name: "Rau củ", selected: true },
  { icon: "🍖", name: "Thịt cá" },
  { icon: "🍎", name: "Trái cây" },
]

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "border-foreground bg-background relative mx-auto flex aspect-[9/19] w-72 flex-col overflow-hidden rounded-[2.75rem] border-[10px] shadow-2xl",
        className,
      )}
    >
      <div className="bg-foreground absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full" />

      <div className={cn("relative flex flex-1 items-center justify-center text-8xl", produceTones.greens)}>
        🥬
        <span className="text-produce-foreground absolute bottom-3 left-4 text-xs font-medium">Hôm nay · 18:42</span>
      </div>

      <div className="bg-card -mt-5 flex flex-col gap-4 rounded-t-3xl px-5 pt-3 pb-6">
        <div className="bg-muted mx-auto h-1 w-10 rounded-full" />

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Giá</span>
          <span className="flex items-baseline gap-1 text-3xl font-semibold tabular-nums">
            15.000
            <span className="bg-primary h-7 w-0.5 self-center motion-safe:animate-pulse" />
            <span className="text-muted-foreground text-lg font-normal">₫</span>
          </span>
        </div>

        <div className="flex gap-1.5">
          {categories.map((c) => (
            <span key={c.name} className={badgeVariants({ variant: c.selected ? "default" : "outline" })}>
              {c.icon} {c.name}
            </span>
          ))}
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MapPinIcon className="size-3.5 shrink-0" />
          <span className="truncate">Chợ Bến Thành, Quận 1</span>
        </div>

        <span className={cn(buttonVariants({ size: "lg" }), "w-full")}>Lưu</span>
      </div>
    </div>
  )
}
