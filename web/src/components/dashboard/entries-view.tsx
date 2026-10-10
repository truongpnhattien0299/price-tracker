"use client"

import { PlusIcon, ReceiptTextIcon, SearchXIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { DeleteEntryDialog } from "@/components/dashboard/delete-entry-dialog"
import { EntriesPagination } from "@/components/dashboard/entries-pagination"
import { EntriesTable, EntriesTableSkeleton, type EntryActions } from "@/components/dashboard/entries-table"
import { EntryDetailDialog } from "@/components/dashboard/entry-detail-dialog"
import { EntryFormDialog } from "@/components/dashboard/entry-form-dialog"
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // `?entry=<id>` opens the detail dialog; not a filter, so it keeps the page.
  const rawEntry = params.get("entry") ?? ""
  const entryId = UUID.test(rawEntry) ? rawEntry : null
  const setEntryId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params)
      if (id) next.set("entry", id)
      else next.delete("entry")
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { filters, setFilters, hrefWith, entryId, setEntryId }
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
  const { filters, setFilters, hrefWith, entryId, setEntryId } = useEntryFilters()
  const { search, category, from, to, page } = filters
  const categories = useCategories()
  const [deleting, setDeleting] = useState<Entry | null>(null)
  // `null` = closed, `"new"` = create, an Entry = edit that row.
  const [form, setForm] = useState<Entry | "new" | null>(null)
  // The clicked row seeds the detail dialog so it opens without a fetch.
  const [opened, setOpened] = useState<Entry>()

  const actions = useMemo<EntryActions>(
    () => ({
      onOpen: (e) => {
        setOpened(e)
        setEntryId(e.id)
      },
      onEdit: setForm,
      onDelete: setDeleting,
    }),
    [setEntryId],
  )
  const onEntryNotFound = useCallback(() => {
    // Fixed id: the URL update lags a render, so the effect may call this twice.
    toast.error("Không tìm thấy khoản chi này.", { id: "entry-not-found" })
    setEntryId(null)
  }, [setEntryId])

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
        <Button className="sm:ml-auto" onClick={() => setForm("new")}>
          <PlusIcon data-icon="inline-start" />
          Thêm khoản chi
        </Button>
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
              <EntriesTable entries={res.data} actions={actions} stale={entries.isPlaceholderData} />
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
      <EntryFormDialog
        open={form !== null}
        entry={form === "new" ? null : form}
        onOpenChange={(open) => !open && setForm(null)}
      />
      <EntryDetailDialog
        entryId={entryId}
        initial={opened}
        onOpenChange={(open) => !open && setEntryId(null)}
        onNotFound={onEntryNotFound}
      />
    </>
  )
}
