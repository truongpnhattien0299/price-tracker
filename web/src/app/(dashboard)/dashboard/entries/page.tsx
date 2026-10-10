import type { Metadata } from "next"

import { EntriesTable } from "@/components/dashboard/entries-table"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { mockEntries } from "@/lib/mock-data"

export const metadata: Metadata = { title: "Khoản chi" }

// TODO(plan): filters (category, from/to, store) + pagination via GET /entries.
export default function EntriesPage() {
  return (
    <>
      <PageHeader title="Khoản chi" description="Tất cả khoản chi đã ghi lại." />
      <Input placeholder="Tìm sản phẩm…" className="max-w-sm" />
      <Card>
        <CardContent>
          <EntriesTable entries={mockEntries} />
        </CardContent>
      </Card>
    </>
  )
}
