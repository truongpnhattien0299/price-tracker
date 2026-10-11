import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/page-header"
import { AdminStoresView } from "@/components/dashboard/stores/admin-stores-view"

export const metadata: Metadata = { title: "Duyệt cửa hàng" }

export default function AdminStoresPage() {
  return (
    <>
      <PageHeader
        title="Duyệt cửa hàng"
        description="Đề xuất công khai từ người dùng, và các cửa hàng mọi người đều thấy."
      />
      <AdminStoresView />
    </>
  )
}
