import { MonthGrid, SAMPLE_MONTH_TOTAL } from "@/components/shared/month-grid"

// Shown beside the auth form: what a month in the app looks like.
export function MonthPreview() {
  return (
    <figure className="w-full max-w-md">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-lg font-semibold">Tháng 10</p>
        <p className="text-muted-foreground text-sm tabular-nums">{SAMPLE_MONTH_TOTAL}</p>
      </div>

      <MonthGrid />

      <figcaption className="text-muted-foreground mt-6 max-w-xs text-sm text-pretty">
        Mỗi lần mua là một ô ảnh. Cuối tháng nhìn lại là biết tiền đi đâu.
      </figcaption>
    </figure>
  )
}
