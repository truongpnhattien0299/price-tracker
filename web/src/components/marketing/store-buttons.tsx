import { SmartphoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { storeLinks } from "@/config/site"
import { cn } from "@/lib/utils"

const stores = [
  { name: "App Store", platform: "iOS", href: storeLinks.appStore },
  { name: "Google Play", platform: "Android", href: storeLinks.playStore },
]

/** Plain buttons, not the official store badges (plans/05 L2). Disabled until a listing URL is set. */
export function StoreButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {stores.map((s) =>
        s.href ? (
          <Button key={s.name} variant="outline" size="lg" asChild>
            <a href={s.href} target="_blank" rel="noopener noreferrer">
              <SmartphoneIcon data-icon="inline-start" />
              {s.name}
            </a>
          </Button>
        ) : (
          <Button key={s.name} variant="outline" size="lg" disabled aria-label={`${s.name} (${s.platform}) — sắp có`}>
            <SmartphoneIcon data-icon="inline-start" />
            {s.name}
            <Badge variant="secondary">Sắp có</Badge>
          </Button>
        ),
      )}
    </div>
  )
}
