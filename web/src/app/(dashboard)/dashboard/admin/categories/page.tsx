import type { Metadata } from "next"

import { AdminCategoriesView } from "@/components/dashboard/categories/admin-categories-view"
import { PageHeader } from "@/components/dashboard/page-header"

export const metadata: Metadata = { title: "Danh mục" }

export default function AdminCategoriesPage() {
  return (
    <>
      <PageHeader title="Danh mục" description="Danh mục dùng chung cho mọi người dùng, trên web và ứng dụng." />
      <AdminCategoriesView />
    </>
  )
}
