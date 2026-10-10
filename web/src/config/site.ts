export const siteConfig = {
  name: "Price Tracker",
  description:
    "Nhật ký chi tiêu bằng hình ảnh — chụp, nhập giá, lưu. Xem lại theo lịch và báo cáo.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
} as const

export const marketingNav = [
  { title: "Cách dùng", href: "/#how" },
  { title: "Tính năng", href: "/#features" },
  { title: "Bảng giá", href: "/#pricing" },
  { title: "Hỏi đáp", href: "/#faq" },
] as const

// Store listings. Unset until the mobile app ships — the buttons then render
// disabled with "Sắp có" (plans/05 L2).
export const storeLinks = {
  appStore: process.env.NEXT_PUBLIC_APP_STORE_URL || null,
  playStore: process.env.NEXT_PUBLIC_PLAY_STORE_URL || null,
}
