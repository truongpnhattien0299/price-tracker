import { MapPinIcon, ReceiptTextIcon } from "lucide-react"

import { Photo } from "@/components/shared/photo"
import { cn } from "@/lib/utils"

/**
 * A photo pin: round thumbnail, white rim and a small tail pointing at the spot
 * (render the Marker with `anchor="bottom"`). With `count` it is a cluster,
 * showing its newest photo and how many entries it holds.
 */
export function PhotoPin({
  src,
  hasPhoto,
  failed,
  label,
  count,
  selected,
}: {
  src: string | undefined
  hasPhoto: boolean
  failed?: boolean
  label: string
  count?: number
  selected?: boolean
}) {
  return (
    <div className="group flex cursor-pointer flex-col items-center drop-shadow-[0_2px_4px_rgb(0_0_0/0.3)]">
      <div
        className={cn(
          "relative rounded-full border-2 border-white bg-white transition-transform duration-150 group-hover:scale-110",
          count ? "size-13" : "size-11",
          selected && "border-primary scale-110",
        )}
      >
        {hasPhoto ? (
          <Photo src={src} failed={failed} alt={label} className="size-full rounded-full" />
        ) : (
          <div className="bg-primary text-primary-foreground flex size-full items-center justify-center rounded-full">
            <ReceiptTextIcon className="size-5" aria-label={label} />
          </div>
        )}
        {count ? (
          <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[11px] leading-none font-semibold tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </div>
      <div className={cn("-mt-1 size-2.5 rotate-45 bg-white", selected && "bg-primary")} />
    </div>
  )
}

/** The pin the user drags to set a location (entry form). */
export function LocationPin() {
  return (
    <MapPinIcon
      className="fill-primary text-primary-foreground size-9 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
      strokeWidth={1.5}
      aria-hidden
    />
  )
}
