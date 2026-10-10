import { siteConfig } from "@/config/site"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground container mx-auto flex flex-col gap-2 px-4 py-8 text-sm md:flex-row md:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
        <p>Made with Next.js + shadcn/ui</p>
      </div>
    </footer>
  )
}
