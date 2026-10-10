import { CheckIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Mirrors the freemium rules in DESIGN.md §14 — keep in sync if limits change.
const plans = [
  {
    name: "Free",
    price: "0đ",
    description: "Đủ cho nhu cầu cơ bản.",
    features: ["~50 khoản chi / tháng", "Xem lại 3 tháng gần nhất", "Báo cáo ngày & tháng"],
    cta: "Bắt đầu",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "TBD",
    description: "Không giới hạn, đầy đủ tính năng.",
    features: ["Không giới hạn khoản chi", "Toàn bộ lịch sử", "Báo cáo theo năm", "OCR đọc giá từ ảnh"],
    cta: "Dùng thử 30 ngày",
    highlighted: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="container mx-auto scroll-mt-16 px-4 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Bảng giá</h2>
        <p className="text-muted-foreground mt-2">Đăng ký là có ngay 30 ngày Pro, không cần thẻ.</p>
      </div>
      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-primary" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlighted && <Badge>Phổ biến</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <p className="pt-2 text-3xl font-bold">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckIcon className="text-primary size-4" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                <Link href="/register">{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
