import { cn } from "@/lib/utils"

// A sample month of the product's photo calendar (DESIGN.md §9.3), shown beside
// the auth form. Tiles stand in for photos: the backend's category emoji on a
// colour taken from the produce itself.

type Purchase = { icon: string; tone: string; price: string }

// Colours are theme tokens (globals.css `--produce-*`).
const tones = {
  greens: "bg-produce-greens", // rau muống
  meat: "bg-produce-meat", // thịt, cá
  fruit: "bg-produce-fruit", // xoài
  drink: "bg-produce-drink", // trà sữa
  snack: "bg-produce-snack",
}

const purchases: Record<number, Purchase> = {
  1: { icon: "🥬", tone: tones.greens, price: "15k" },
  2: { icon: "🍖", tone: tones.meat, price: "120k" },
  4: { icon: "🍎", tone: tones.fruit, price: "60k" },
  5: { icon: "🍖", tone: tones.meat, price: "85k" },
  6: { icon: "🥤", tone: tones.drink, price: "45k" },
  8: { icon: "🥬", tone: tones.greens, price: "22k" },
  9: { icon: "🍪", tone: tones.snack, price: "30k" },
}

const TODAY = 10
const DAYS_IN_MONTH = 31
const LEADING_BLANKS = 3 // 1/10/2026 is a Thursday; weeks start Monday.
const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

export function MonthPreview() {
  const cells = [
    ...Array.from({ length: LEADING_BLANKS }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ]

  return (
    <figure className="w-full max-w-md">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-lg font-semibold">Tháng 10</p>
        <p className="text-muted-foreground text-sm tabular-nums">377.000 ₫</p>
      </div>

      <div className="grid grid-cols-7 gap-x-2 gap-y-3" aria-hidden>
        {weekdays.map((d) => (
          <span key={d} className="text-muted-foreground text-center text-xs">
            {d}
          </span>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />
          const p = purchases[day]
          const isToday = day === TODAY
          const isFuture = day > TODAY

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "relative flex aspect-square w-full items-center justify-center rounded-md text-xl",
                  p && [p.tone, "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 fill-mode-both duration-500"],
                  !p && !isFuture && "bg-background",
                  isFuture && "border-border/60 border border-dashed",
                  isToday && "ring-foreground ring-2 ring-offset-2 ring-offset-auth-panel",
                )}
                style={p ? { animationDelay: `${150 + day * 70}ms` } : undefined}
              >
                {p?.icon}
                <span
                  className={cn(
                    "absolute top-1 left-1.5 text-[10px] leading-none font-medium tabular-nums",
                    p ? "text-produce-foreground" : "text-muted-foreground",
                    isFuture && "text-muted-foreground/60",
                  )}
                >
                  {day}
                </span>
              </div>
              <span className="text-muted-foreground h-4 text-[11px] tabular-nums">{p?.price}</span>
            </div>
          )
        })}
      </div>

      <figcaption className="text-muted-foreground mt-6 max-w-xs text-sm text-pretty">
        Mỗi lần mua là một ô ảnh. Cuối tháng nhìn lại là biết tiền đi đâu.
      </figcaption>
    </figure>
  )
}
