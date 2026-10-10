import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="container mx-auto flex flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
      <Badge variant="secondary">Dùng thử Pro miễn phí 30 ngày</Badge>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
        Chụp một tấm ảnh. Biết mình đã tiêu bao nhiêu.
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg text-pretty">
        Nhật ký chi tiêu bằng hình ảnh: mở app, chụp, nhập giá, lưu. Xem lại theo lịch tháng và báo
        cáo theo danh mục, cửa hàng.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" asChild>
          <Link href="/register">
            Bắt đầu miễn phí <ArrowRightIcon />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/#features">Xem tính năng</Link>
        </Button>
      </div>
    </section>
  )
}
