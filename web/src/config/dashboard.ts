import {
  CalendarDaysIcon,
  ChartPieIcon,
  LayoutDashboardIcon,
  MapIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TagsIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const dashboardNav: NavItem[] = [
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Khoản chi", href: "/dashboard/entries", icon: ReceiptTextIcon },
  { title: "Lịch", href: "/dashboard/calendar", icon: CalendarDaysIcon },
  { title: "Bản đồ", href: "/dashboard/map", icon: MapIcon },
  { title: "Cửa hàng", href: "/dashboard/stores", icon: StoreIcon },
  { title: "Báo cáo", href: "/dashboard/reports", icon: ChartPieIcon },
]

export const dashboardSecondaryNav: NavItem[] = [
  { title: "Cài đặt", href: "/dashboard/settings", icon: SettingsIcon },
]

// Shown only when `/auth/me` says role "admin"; the API guards these routes itself.
export const dashboardAdminNav: NavItem[] = [
  { title: "Duyệt cửa hàng", href: "/dashboard/admin/stores", icon: ShieldCheckIcon },
  { title: "Danh mục", href: "/dashboard/admin/categories", icon: TagsIcon },
]
