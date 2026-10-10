import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm">404</p>
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  )
}
