import { CalendarDaysIcon, ChartPieIcon, LaptopIcon, LockIcon, MapPinIcon, type LucideIcon } from "lucide-react"

import { Section, SectionHeading } from "@/components/marketing/section"
import { MonthGrid, produceTones, SAMPLE_MONTH_TOTAL } from "@/components/shared/month-grid"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Same sample month as the calendar tile, grouped by category.
const breakdown = [
  { icon: "🍖", name: "Thịt cá", amount: 205, tone: produceTones.meat },
  { icon: "🍎", name: "Trái cây", amount: 60, tone: produceTones.fruit },
  { icon: "🥤", name: "Đồ uống", amount: 45, tone: produceTones.drink },
  { icon: "🥬", name: "Rau củ", amount: 37, tone: produceTones.greens },
  { icon: "🍪", name: "Đồ ăn vặt", amount: 30, tone: produceTones.snack },
]
const maxAmount = Math.max(...breakdown.map((b) => b.amount))

const smallFeatures: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MapPinIcon,
    title: "Nhớ chỗ mua",
    description: "Vị trí ghi lại lúc chụp, tên cửa hàng tự điền. Lần sau biết chỗ nào bán rẻ hơn.",
  },
  {
    icon: LaptopIcon,
    title: "Có cả bản web",
    description: "Xem lịch, sửa khoản chi, thêm ảnh từ máy tính. Dữ liệu chung một tài khoản.",
  },
  {
    icon: LockIcon,
    title: "Chỉ mình bạn xem",
    description: "Không có mạng xã hội. Ảnh lưu riêng tư, chỉ mở được bằng link ký có hạn 5 phút.",
  },
]

function FeatureIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="text-primary mb-2 size-6" />
}

export function Features() {
  return (
    <Section id="features">
      <SectionHeading title="Nhìn là nhớ, không cần đọc sổ" description="Mỗi khoản chi là một tấm ảnh, nên xem lại nhanh hơn một bảng số." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <FeatureIcon icon={CalendarDaysIcon} />
            <CardTitle>Lịch ảnh theo tháng</CardTitle>
            <CardDescription>Mỗi ngày một ô, ảnh đầu tiên làm bìa. Bấm vào ngày để xem từng món.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-auth-panel rounded-xl p-4 sm:p-6">
              <div className="mx-auto flex w-full max-w-md flex-col gap-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">Tháng 10</p>
                  <p className="text-muted-foreground text-sm tabular-nums">{SAMPLE_MONTH_TOTAL}</p>
                </div>
                <MonthGrid className="gap-x-1.5 sm:gap-x-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FeatureIcon icon={ChartPieIcon} />
            <CardTitle>Báo cáo</CardTitle>
            <CardDescription>Tổng chi theo ngày, tháng, năm. Chia theo danh mục và cửa hàng.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3" aria-label="Ví dụ chi tiêu theo danh mục">
              {breakdown.map((b) => (
                <li key={b.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span>
                      {b.icon} {b.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{b.amount}.000 ₫</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div className={cn("h-full rounded-full", b.tone)} style={{ width: `${(b.amount / maxAmount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {smallFeatures.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <FeatureIcon icon={f.icon} />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Section>
  )
}
