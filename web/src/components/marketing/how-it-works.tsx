import { CameraIcon, CheckIcon, KeyboardIcon, type LucideIcon } from "lucide-react"

import { Section, SectionHeading } from "@/components/marketing/section"

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CameraIcon,
    title: "Chụp",
    description: "Mở app là vào thẳng camera. Chụp món hàng, hoá đơn hay bảng giá.",
  },
  {
    icon: KeyboardIcon,
    title: "Gõ giá",
    description: "Bàn phím số bật sẵn. Danh mục nhớ lần trước, vị trí và giờ tự điền.",
  },
  {
    icon: CheckIcon,
    title: "Lưu",
    description: "Một chạm là xong, quay lại camera. Tên, ghi chú thêm sau cũng được.",
  },
]

export function HowItWorks() {
  return (
    <Section id="how">
      <SectionHeading title="Ba chạm là xong" description="Ghi chi tiêu nhanh hơn mở ví ra cất tiền thối." />
      <ol className="grid gap-8 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, description }, i) => (
          <li key={title} className="flex flex-col items-center gap-3 text-center">
            <span className="bg-primary text-primary-foreground relative flex size-12 items-center justify-center rounded-full">
              <Icon className="size-5" />
              <span className="bg-background text-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border text-xs font-semibold">
                {i + 1}
              </span>
            </span>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-muted-foreground max-w-xs text-sm text-pretty">{description}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
