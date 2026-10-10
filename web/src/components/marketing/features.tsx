import { CalendarDaysIcon, CameraIcon, ChartPieIcon, MapPinIcon } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: CameraIcon,
    title: "Camera-first",
    description: "Mở app là vào camera. Chụp, nhập giá, lưu — dưới 5 giây.",
  },
  {
    icon: CalendarDaysIcon,
    title: "Lịch ảnh",
    description: "Mỗi ngày một ô ảnh. Lướt lại cả tháng mình đã mua gì.",
  },
  {
    icon: ChartPieIcon,
    title: "Báo cáo",
    description: "Tổng chi, theo danh mục, theo thời gian, top cửa hàng.",
  },
  {
    icon: MapPinIcon,
    title: "Vị trí",
    description: "Tự ghi GPS lúc chụp — biết chỗ nào bán rẻ hơn.",
  },
]

export function Features() {
  return (
    <section id="features" className="container mx-auto scroll-mt-16 px-4 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Tính năng</h2>
        <p className="text-muted-foreground mt-2">Ít thao tác, nhiều thông tin.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="text-primary mb-2 size-6" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
