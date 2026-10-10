export const siteConfig = {
  name: "Price Tracker",
  description:
    "Nhật ký chi tiêu bằng hình ảnh — chụp, nhập giá, lưu. Xem lại theo lịch và báo cáo.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
} as const

export const marketingNav = [
  { title: "Tính năng", href: "/#features" },
  { title: "Bảng giá", href: "/#pricing" },
] as const
