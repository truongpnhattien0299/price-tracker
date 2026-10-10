import type { Metadata } from "next"
import { Suspense } from "react"

import { EntriesView } from "@/components/dashboard/entries-view"
import { PageHeader } from "@/components/dashboard/page-header"

export const metadata: Metadata = { title: "Khoản chi" }

export default function EntriesPage() {
  return (
    <>
      <PageHeader title="Khoản chi" description="Tất cả khoản chi đã ghi lại." />
      {/* useSearchParams() needs a Suspense boundary to keep the page shell static. */}
      <Suspense>
        <EntriesView />
      </Suspense>
    </>
  )
}
