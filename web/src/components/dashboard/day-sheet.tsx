"use client"

import { CalendarXIcon, ImageIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { EntryDetailDialog } from "@/components/dashboard/entry-detail-dialog"
import { EmptyState, ErrorState } from "@/components/shared/query-state"
import { Photo } from "@/components/shared/photo"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useEntries } from "@/hooks/queries/use-entries"
import { usePhotoUrls } from "@/hooks/queries/use-photo-url"
import { useIsMobile } from "@/hooks/use-mobile"
import { dayKeysToRange, fromDayKey } from "@/lib/date-range"
import type { Entry } from "@/types/api"

// Sized by the sheet (narrow on the right, wide from the bottom), not the viewport.
const GRID = "grid grid-cols-3 gap-2 @lg:grid-cols-4"

function EntryTile({ entry, url, failed, onOpen }: { entry: Entry; url?: string; failed: boolean; onOpen: () => void }) {
  const name = entry.productName ?? "Khoản chi"
  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded-md text-left outline-none focus-visible:ring-[3px]"
    >
      {entry.photoKey ? (
        <Photo src={url} failed={failed} alt={name} className="aspect-square w-full rounded-md" />
      ) : (
        <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center rounded-md">
          <ImageIcon className="size-5" />
        </div>
      )}
      <span className="truncate text-xs">{name}</span>
    </button>
  )
}

function DayBody({ day, onClose }: { day: string; onClose: () => void }) {
  const query = useMemo(() => ({ ...dayKeysToRange(day, day), limit: 100 }), [day])
  const entries = useEntries(query)
  // useEntries keeps the previous result as placeholder; another day's photos would be wrong here.
  // The API sorts newest first; a day reads better in order, like the cover (first photo).
  const list = useMemo(
    () => (entries.isPlaceholderData ? undefined : entries.data && [...entries.data.data].reverse()),
    [entries.isPlaceholderData, entries.data],
  )
  const keys = useMemo(() => list?.map((e) => e.photoKey) ?? [], [list])
  const urls = usePhotoUrls(keys)
  const [selected, setSelected] = useState<Entry | null>(null)

  const title = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(
    fromDayKey(day),
  )

  let body: React.ReactNode
  if (entries.isError) {
    body = <ErrorState error={entries.error} onRetry={() => entries.refetch()} retrying={entries.isFetching} />
  } else if (!list) {
    body = (
      <div className={GRID}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
    )
  } else if (list.length === 0) {
    body = <EmptyState icon={CalendarXIcon} title="Không có khoản chi" description="Ngày này chưa ghi khoản chi nào." />
  } else {
    body = (
      <ul className={GRID}>
        {list.map((e) => (
          <li key={e.id}>
            <EntryTile
              entry={e}
              url={e.photoKey ? urls.data?.[e.photoKey] : undefined}
              failed={urls.isError}
              onOpen={() => setSelected(e)}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="first-letter:uppercase">{title}</SheetTitle>
        <SheetDescription>{list ? `${list.length} khoản chi` : "Đang tải…"}</SheetDescription>
      </SheetHeader>
      <div className="@container px-4 pb-4">{body}</div>
      <EntryDetailDialog
        entry={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        // Deleted the day's last entry: nothing left to show.
        onDeleted={() => list?.length === 1 && onClose()}
      />
    </>
  )
}

/** Photo grid of one VN day. The calendar keeps `day` in the URL. */
export function DaySheet({ day, onOpenChange }: { day: string | null; onOpenChange: (open: boolean) => void }) {
  const isMobile = useIsMobile()
  // Keep the last day rendered while the sheet animates out.
  const [shown, setShown] = useState(day)
  if (day && day !== shown) setShown(day)

  return (
    <Sheet open={!!day} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto data-[side=bottom]:max-h-[85svh]">
        {shown && <DayBody key={shown} day={shown} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}
