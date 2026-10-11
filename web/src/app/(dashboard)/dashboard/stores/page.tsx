import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { StoresView } from "@/components/dashboard/stores/stores-view"

export const metadata: Metadata = { title: "Cửa hàng" }

export default function StoresPage() {
  return (
    <>
      <PageHeader
        title="Cửa hàng"
        description="Chỗ bạn hay mua. Chọn cửa hàng khi ghi khoản chi là có luôn vị trí."
      />
      <StoresView />
    </>
  )
}
