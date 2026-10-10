"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

/** 1 … p-1 p p+1 … last, with `null` marking a gap. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, page - 1, page, page + 1, totalPages])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? [null, p] : [p]))
}

export function EntriesPagination({
  page,
  totalPages,
  total,
  hrefFor,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  hrefFor: (page: number) => string
  onPageChange: (page: number) => void
}) {
  // Real hrefs keep middle-click / open-in-new-tab working; plain clicks stay client-side.
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    onPageChange(p)
  }

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        Trang {page} / {totalPages} · {total} khoản chi
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="Trước"
              aria-label="Trang trước"
              href={hrefFor(Math.max(1, page - 1))}
              onClick={go(page - 1)}
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <PaginationItem key={`gap-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href={hrefFor(p)} isActive={p === page} onClick={go(p)}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              text="Sau"
              aria-label="Trang sau"
              href={hrefFor(Math.min(totalPages, page + 1))}
              onClick={go(page + 1)}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
