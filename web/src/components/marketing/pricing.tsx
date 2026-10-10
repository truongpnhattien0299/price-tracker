"use client"

import { CheckIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Section, SectionHeading } from "@/components/marketing/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { freeLimits, proPrice, TRIAL_DAYS } from "@/config/pricing"
import { formatMoney } from "@/lib/format"

type Cycle = "monthly" | "yearly"
type Feature = { label: string; soon?: boolean }

// Mirrors the freemium table in DESIGN.md §14.1 — keep in sync if limits change.
const freeFeatures: Feature[] = [
  { label: "Chụp, nhập giá, ghi vị trí" },
  { label: `Tối đa ${freeLimits.entriesPerMonth} khoản chi / tháng` },
  { label: `Xem rõ ${freeLimits.historyMonths} tháng gần nhất, cũ hơn làm mờ (không xoá)` },
  { label: "Báo cáo tháng hiện tại theo danh mục" },
  { label: "Dùng trên điện thoại và web" },
]

const proFeatures: Feature[] = [
  { label: "Không giới hạn khoản chi" },
  { label: "Toàn bộ lịch sử, mở khoá ngay khi nâng cấp" },
  { label: "Báo cáo theo năm, so sánh nhiều tháng" },
  { label: "Tự đọc giá và tên từ ảnh", soon: true },
  { label: "Ngân sách và cảnh báo vượt mức", soon: true },
  { label: "Xuất CSV / PDF", soon: true },
]

function FeatureList({ features }: { features: Feature[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-sm">
      {features.map((f) => (
        <li key={f.label} className="flex items-start gap-2">
          <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
          <span>
            {f.label}
            {f.soon && (
              <Badge variant="secondary" className="ml-2 align-middle">
                Sắp có
              </Badge>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ProPrice({ cycle }: { cycle: Cycle }) {
  const { monthly, yearly } = proPrice
  const amount = cycle === "monthly" ? monthly : yearly

  if (amount == null) {
    return (
      <>
        <p className="text-3xl font-bold">Sắp công bố</p>
        <p className="text-muted-foreground text-sm">Gói tháng và gói năm (rẻ hơn ~2 tháng).</p>
      </>
    )
  }

  const saving = cycle === "yearly" && monthly ? Math.round((1 - amount / (monthly * 12)) * 100) : 0
  return (
    <>
      <p className="text-3xl font-bold tabular-nums">
        {formatMoney(amount)}
        <span className="text-muted-foreground text-base font-normal">/{cycle === "monthly" ? "tháng" : "năm"}</span>
      </p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {cycle === "yearly"
          ? `≈ ${formatMoney(Math.round(amount / 12))}/tháng${saving > 0 ? `, tiết kiệm ${saving}%` : ""}`
          : "Huỷ bất cứ lúc nào."}
      </p>
    </>
  )
}

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("yearly")
  // A cycle switch is only meaningful once both prices are decided.
  const showCycle = proPrice.monthly != null && proPrice.yearly != null

  return (
    <Section id="pricing">
      <SectionHeading
        title="Bảng giá"
        description={`Đăng ký là có ngay ${TRIAL_DAYS} ngày Pro, không cần thẻ. Hết hạn tự về Free, không tự trừ tiền.`}
      />

      {showCycle && (
        <ToggleGroup
          type="single"
          variant="outline"
          value={cycle}
          onValueChange={(v) => v && setCycle(v as Cycle)}
          className="mx-auto mb-8"
          aria-label="Chu kỳ thanh toán"
        >
          <ToggleGroupItem value="monthly">Theo tháng</ToggleGroupItem>
          <ToggleGroupItem value="yearly">Theo năm</ToggleGroupItem>
        </ToggleGroup>
      )}

      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Đủ để tập thói quen ghi chép.</CardDescription>
            <div className="flex flex-col gap-1 pt-2">
              <p className="text-3xl font-bold">0 ₫</p>
              <p className="text-muted-foreground text-sm">Mãi mãi.</p>
            </div>
          </CardHeader>
          <CardContent>
            <FeatureList features={freeFeatures} />
          </CardContent>
          <CardFooter className="mt-auto">
            <Button className="w-full" variant="outline" asChild>
              <Link href="/register">Bắt đầu miễn phí</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pro</CardTitle>
              <Badge>{TRIAL_DAYS} ngày miễn phí</Badge>
            </div>
            <CardDescription>Cho người muốn nhìn lại cả năm chi tiêu.</CardDescription>
            <div className="flex flex-col gap-1 pt-2">
              <ProPrice cycle={showCycle ? cycle : "monthly"} />
            </div>
          </CardHeader>
          <CardContent>
            <FeatureList features={proFeatures} />
          </CardContent>
          <CardFooter className="mt-auto">
            <Button className="w-full" asChild>
              <Link href="/register">Dùng thử {TRIAL_DAYS} ngày</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Section>
  )
}
