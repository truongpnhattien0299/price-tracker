import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"
import type { ReportSummary } from "@/types/api"

export function StatCards({ summary }: { summary: ReportSummary }) {
  const stats = [
    { label: "Tổng chi tháng này", value: formatMoney(summary.totalSpent, summary.currency) },
    { label: "Số khoản chi", value: String(summary.entryCount) },
    { label: "Trung bình / khoản", value: formatMoney(summary.avgPerEntry, summary.currency) },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
