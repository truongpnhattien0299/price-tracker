"use client"

import { ReceiptTextIcon, SearchXIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { DeleteEntryDialog } from "@/components/dashboard/delete-entry-dialog"
import { EntriesPagination } from "@/components/dashboard/entries-pagination"
import { EntriesTable, EntriesTableSkeleton } from "@/components/dashboard/entries-table"
import { EmptyState, QueryContent } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useCategories } from "@/hooks/queries/use-categories"
import { useEntries } from "@/hooks/queries/use-entries"
import { dayKeysToRange, fromDayKey, toDayKey } from "@/lib/date-range"
import type { Entry, EntryQuery } from "@/types/api"

const PAGE_SIZE = 20
const ALL_CATEGORIES = "all"
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

type Filters = { search: string; category: string; from: string; to: string; page: number }

/**
 * Filters live in the URL (`?search=&category=&from=&to=&page=`) so a filtered
 * view survives F5, can be shared, and Back/Forward walk through it.
 */
function useEntryFilters() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const dayKey = (k: string) => {
    const v = params.get(k) ?? ""
    return DAY_KEY.test(v) ? v : ""
  }
  const filters: Filters = {
    search: params.get("search") ?? "",
    category: params.get("category") ?? "",
    from: dayKey("from"),
    to: dayKey("to"),
    page: Math.max(1, Math.trunc(Number(params.get("page"))) || 1),
  }

  // Any filter change resets to page 1 unless the patch sets `page` itself.
  const hrefWith = useCallback(
    (patch: Partial<Filters>) => {
      const next = new URLSearchParams(params)
      if (!("page" in patch)) next.delete("page")
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || (k === "page" && v === 1)) next.delete(k)
        else next.set(k, String(v))
      }
      const qs = next.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [params, pathname],
  )
  const setFilters = useCallback(
    (patch: Partial<Filters>) => router.replace(hrefWith(patch), { scroll: false }),
    [hrefWith, router],
  )

  return { filters, setFilters, hrefWith }
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [term, setTerm] = useState(value)

  // Follow URL changes made elsewhere (Back/Forward, "clear filters").
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setTerm(value)
  }

  useEffect(() => {
    if (term.trim() === value) return
    const t = setTimeout(() => onChange(term.trim()), 300)
    return () => clearTimeout(t)
  }, [term, value, onChange])

  return (
    <Input
      type="search"
      placeholder="Tìm sản phẩm…"
      aria-label="Tìm sản phẩm"
      className="sm:max-w-xs"
      value={term}
      onChange={(e) => setTerm(e.target.value)}
    />
  )
}

export function EntriesView() {
  const { filters, setFilters, hrefWith } = useEntryFilters()
  const { search, category, from, to, page } = filters
  const categories = useCategories()
  const [deleting, setDeleting] = useState<Entry | null>(null)

  const query = useMemo<EntryQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      category: category || undefined,
      ...dayKeysToRange(from || undefined, to || undefined),
    }),
    [page, search, category, from, to],
  )
  const entries = useEntries(query)
  const totalPages = entries.data?.meta.totalPages ?? 0

  // Deleting the last row of the last page leaves us past the end; step back.
  useEffect(() => {
    if (!entries.isPlaceholderData && totalPages > 0 && page > totalPages) setFilters({ page: totalPages })
  }, [entries.isPlaceholderData, page, totalPages, setFilters])

  const onSearch = useCallback((v: string) => setFilters({ search: v }), [setFilters])
  const hasFilters = !!(search || category || from || to)

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={onSearch} />
        <Select
          value={category || ALL_CATEGORIES}
          onValueChange={(v) => setFilters({ category: v === ALL_CATEGORIES ? "" : v })}
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
          placeholder="Mọi ngày"
          value={from ? { from: fromDayKey(from), to: to ? fromDayKey(to) : undefined } : undefined}
          onChange={(r) =>
            setFilters({ from: r?.from ? toDayKey(r.from) : "", to: r?.to ? toDayKey(r.to) : "" })
          }
        />
        {entries.isFetching && !entries.isPending && <Spinner className="text-muted-foreground" />}
      </div>

      <Card>
        <CardContent>
          <QueryContent
            query={entries}
            skeleton={<EntriesTableSkeleton rows={8} withActions />}
            isEmpty={(res) => res.data.length === 0}
            empty={
              hasFilters ? (
                <EmptyState
                  icon={SearchXIcon}
                  title="Không tìm thấy khoản chi nào"
                  description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ search: "", category: "", from: "", to: "" })}
                  >
                    Xoá bộ lọc
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={ReceiptTextIcon}
                  title="Chưa có khoản chi nào"
                  description="Chụp ảnh món đồ bằng app trên điện thoại để bắt đầu ghi chi tiêu."
                />
              )
            }
          >
            {(res) => (
              <EntriesTable entries={res.data} onDelete={setDeleting} stale={entries.isPlaceholderData} />
            )}
          </QueryContent>
        </CardContent>
      </Card>

      {entries.data && totalPages > 1 && (
        <EntriesPagination
          page={page}
          totalPages={totalPages}
          total={entries.data.meta.total}
          hrefFor={(p) => hrefWith({ page: p })}
          onPageChange={(p) => setFilters({ page: p })}
        />
      )}

      <DeleteEntryDialog entry={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </>
  )
}
