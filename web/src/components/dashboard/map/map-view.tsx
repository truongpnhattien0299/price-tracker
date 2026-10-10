"use client"

import { ImageIcon, LockIcon, MapPinOffIcon } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { EntryDetailDialog } from "@/components/dashboard/entry-detail-dialog"
import { UPGRADE_HREF } from "@/components/dashboard/pro-lock"
import { ErrorState } from "@/components/shared/query-state"
import { Photo } from "@/components/shared/photo"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useCategories } from "@/hooks/queries/use-categories"
import { useEntitlement } from "@/hooks/queries/use-entitlement"
import { useMapPoints } from "@/hooks/queries/use-map-points"
import { usePhotoUrls } from "@/hooks/queries/use-photo-url"
import { useIsMobile } from "@/hooks/use-mobile"
import { dayKeysToRange, fromDayKey, toDayKey } from "@/lib/date-range"
import { formatDate, formatMoney } from "@/lib/format"
import type { MapPoint, MapQuery } from "@/types/api"

// MapLibre needs window + WebGL, and ~220 KB that only this page should load.
const EntriesMap = dynamic(() => import("./entries-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALL_CATEGORIES = "all"

type Filters = { from: string; to: string; category: string }

/** `?from=&to=&category=&entry=` — same shape as the entries page. */
function useMapParams() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const dayKey = (k: string) => {
    const v = params.get(k) ?? ""
    return DAY_KEY.test(v) ? v : ""
  }
  const filters: Filters = { from: dayKey("from"), to: dayKey("to"), category: params.get("category") ?? "" }
  const rawEntry = params.get("entry") ?? ""
  const entryId = UUID.test(rawEntry) ? rawEntry : null

  const replace = useCallback(
    (patch: Partial<Filters & { entry: string | null }>) => {
      const next = new URLSearchParams(params)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { filters, entryId, replace }
}

function GroupSheet({
  group,
  onOpenChange,
  onOpen,
}: {
  group: MapPoint[] | null
  onOpenChange: (open: boolean) => void
  onOpen: (point: MapPoint) => void
}) {
  const isMobile = useIsMobile()
  // Keep the last group rendered while the sheet animates out.
  const [shown, setShown] = useState(group)
  if (group && group !== shown) setShown(group)
  const keys = useMemo(() => shown?.map((p) => p.photoKey) ?? [], [shown])
  const urls = usePhotoUrls(keys)
  const place = shown?.find((p) => p.storeName)?.storeName

  return (
    <Sheet open={!!group} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto data-[side=bottom]:max-h-[85svh]">
        <SheetHeader>
          <SheetTitle>{place ?? "Cùng một chỗ"}</SheetTitle>
          <SheetDescription>{shown?.length ?? 0} khoản chi ở gần nhau</SheetDescription>
        </SheetHeader>
        <ul className="@container grid grid-cols-3 gap-2 px-4 pb-4">
          {shown?.map((p) => {
            const name = p.productName ?? "Khoản chi"
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded-md text-left outline-none focus-visible:ring-[3px]"
                >
                  {p.photoKey ? (
                    <Photo
                      src={urls.data?.[p.photoKey]}
                      failed={urls.isError}
                      alt={name}
                      className="aspect-square w-full rounded-md"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center rounded-md">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  <span className="truncate text-xs">{name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {formatMoney(p.price, p.currency)} · {formatDate(p.purchasedAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

/** Free plan: how many older located entries the window hid. */
function LockedBanner({ count, historyFrom }: { count: number; historyFrom: string | null | undefined }) {
  return (
    <div className="bg-background/95 flex items-center gap-3 rounded-2xl border py-1.5 pr-1.5 pl-3 text-sm shadow-md backdrop-blur">
      <LockIcon className="text-muted-foreground size-4 shrink-0" />
      <span>
        {count} điểm {historyFrom ? `trước ${formatDate(historyFrom)}` : "cũ"} bị ẩn với gói Free
      </span>
      <Button asChild size="sm" className="h-7 rounded-full">
        <Link href={UPGRADE_HREF}>Xem gói Pro</Link>
      </Button>
    </div>
  )
}

export function MapView() {
  const { filters, entryId, replace } = useMapParams()
  const { from, to, category } = filters
  const categories = useCategories()
  const entitlement = useEntitlement()
  const historyFrom = entitlement.data?.historyFrom ? new Date(entitlement.data.historyFrom) : undefined
  const [group, setGroup] = useState<MapPoint[] | null>(null)

  const query = useMemo<MapQuery>(
    () => ({ category: category || undefined, ...dayKeysToRange(from || undefined, to || undefined) }),
    [category, from, to],
  )
  const points = useMapPoints(query)
  const data = points.data

  const onOpen = useCallback((p: MapPoint) => replace({ entry: p.id }), [replace])
  const onEntryNotFound = useCallback(() => {
    // Fixed id: the URL update lags a render, so the effect may call this twice.
    toast.error("Không tìm thấy khoản chi này.", { id: "entry-not-found" })
    replace({ entry: null })
  }, [replace])

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={category || ALL_CATEGORIES}
          onValueChange={(v) => replace({ category: v === ALL_CATEGORIES ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Lọc theo danh mục">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_CATEGORIES}>Tất cả danh mục</SelectItem>
              {categories.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <DateRangePicker
          clearable
          placeholder={historyFrom ? "3 tháng gần nhất" : "Mọi ngày"}
          minDate={historyFrom}
          value={from ? { from: fromDayKey(from), to: to ? fromDayKey(to) : undefined } : undefined}
          onChange={(r) => replace({ from: r?.from ? toDayKey(r.from) : "", to: r?.to ? toDayKey(r.to) : "" })}
        />
        {data && (
          <span className="text-muted-foreground text-sm sm:ml-auto">
            {data.points.length} khoản chi có vị trí
          </span>
        )}
      </div>

      <div className="bg-muted relative isolate h-[calc(100svh-14rem)] min-h-96 overflow-hidden rounded-xl border">
        {points.isError ? (
          <ErrorState error={points.error} onRetry={() => points.refetch()} retrying={points.isFetching} />
        ) : (
          <EntriesMap
            className="size-full"
            points={data?.points ?? []}
            fitKey={JSON.stringify(query)}
            selectedId={entryId}
            onOpen={onOpen}
            onOpenGroup={setGroup}
          />
        )}

        <div className="pointer-events-none absolute top-3 right-14 left-3 z-10 flex flex-col items-start gap-2 [&>*]:pointer-events-auto">
          {points.isFetching && (
            <div className="bg-background/95 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm">
              <Spinner className="size-3.5" /> Đang tải…
            </div>
          )}
          {data && data.lockedCount > 0 && (
            <LockedBanner count={data.lockedCount} historyFrom={entitlement.data?.historyFrom} />
          )}
          {data?.truncated && (
            <p className="bg-background/95 rounded-lg border px-3 py-2 text-xs shadow-sm">
              Chỉ hiện {data.points.length} khoản chi mới nhất. Thu hẹp khoảng ngày để xem các điểm cũ hơn.
            </p>
          )}
        </div>

        {data && data.points.length === 0 && !points.isPlaceholderData && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="bg-background/95 pointer-events-auto flex max-w-xs flex-col items-center gap-2 rounded-xl border p-5 text-center shadow-lg backdrop-blur">
              <MapPinOffIcon className="text-muted-foreground size-6" />
              <p className="font-medium">Chưa có khoản chi nào có vị trí</p>
              <p className="text-muted-foreground text-sm">
                Ảnh chụp bằng app, hoặc ảnh có GPS khi thêm trên web, sẽ tự hiện ở đây.
              </p>
            </div>
          </div>
        )}
      </div>

      <GroupSheet
        group={group}
        onOpenChange={(open) => !open && setGroup(null)}
        onOpen={(p) => replace({ entry: p.id })}
      />
      <EntryDetailDialog
        entryId={entryId}
        onOpenChange={(open) => !open && replace({ entry: null })}
        onNotFound={onEntryNotFound}
      />
    </>
  )
}
