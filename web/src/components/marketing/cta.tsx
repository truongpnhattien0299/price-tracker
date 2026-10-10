import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { Section } from "@/components/marketing/section"
import { StoreButtons } from "@/components/marketing/store-buttons"
import { Button } from "@/components/ui/button"
import { TRIAL_DAYS } from "@/config/pricing"

export function Cta() {
  return (
    <Section>
      <div className="bg-auth-panel flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center">
        <h2 className="max-w-xl text-3xl font-bold tracking-tight text-balance">
          Bắt đầu từ món tiếp theo bạn mua.
        </h2>
        <p className="text-muted-foreground max-w-md text-pretty">
          {TRIAL_DAYS} ngày Pro miễn phí. Không cần thẻ, không tự gia hạn.
        </p>
        <Button size="lg" asChild>
          <Link href="/register">
            Tạo tài khoản <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
        <StoreButtons className="justify-center" />
      </div>
    </Section>
  )
}
