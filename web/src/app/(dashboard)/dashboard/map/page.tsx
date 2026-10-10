import type { Metadata } from "next"
import { Suspense } from "react"

import { MapView } from "@/components/dashboard/map/map-view"
import { PageHeader } from "@/components/dashboard/page-header"

export const metadata: Metadata = { title: "Bản đồ" }

export default function MapPage() {
  return (
    <>
      <PageHeader title="Bản đồ" description="Nơi bạn đã mua — mỗi ảnh nằm đúng chỗ chụp." />
      {/* useSearchParams() needs a Suspense boundary to keep the page shell static. */}
      <Suspense>
        <MapView />
      </Suspense>
    </>
  )
}
