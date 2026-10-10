import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { PhoneMockup } from "@/components/marketing/phone-mockup"
import { StoreButtons } from "@/components/marketing/store-buttons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TRIAL_DAYS } from "@/config/pricing"

export function Hero() {
  return (
    <section className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
      <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
        <Badge variant="secondary">Dùng thử Pro miễn phí {TRIAL_DAYS} ngày, không cần thẻ</Badge>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
          Chụp một tấm ảnh. Biết mình đã tiêu bao nhiêu.
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-pretty">
          Nhật ký chi tiêu bằng hình ảnh. Mở app là vào camera, chụp món vừa mua, gõ giá, lưu. Cuối
          tháng lướt lại lịch ảnh và xem báo cáo theo danh mục, cửa hàng.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">
              Dùng thử trên web <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="/#how">Xem cách dùng</Link>
          </Button>
        </div>
        <StoreButtons className="justify-center lg:justify-start" />
      </div>

      <PhoneMockup />
    </section>
  )
}
