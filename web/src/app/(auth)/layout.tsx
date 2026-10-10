import { MonthPreview } from "@/components/auth/month-preview"
import { Logo } from "@/components/shared/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="flex flex-1 items-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="hidden items-center justify-center bg-auth-panel p-12 lg:flex">
        <MonthPreview />
      </aside>
    </div>
  )
}
