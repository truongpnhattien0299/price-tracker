import { cn } from "@/lib/utils"

/** A landing section. `scroll-mt` keeps anchored headings clear of the sticky header. */
export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("container mx-auto scroll-mt-16 px-4 py-16 md:py-24", className)}>
      {children}
    </section>
  )
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 text-center md:mb-14">
      <h2 className="text-3xl font-bold tracking-tight text-balance">{title}</h2>
      {description && <p className="text-muted-foreground text-pretty">{description}</p>}
    </div>
  )
}
