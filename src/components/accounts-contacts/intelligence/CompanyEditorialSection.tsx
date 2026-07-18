import type { ReactNode } from "react"

export function CompanyEditorialSection({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string
  index: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-lg border border-border bg-surface">
      <header className="relative border-b border-border bg-primary px-5 py-4 after:absolute after:right-5 after:top-1/2 after:h-px after:w-10 after:bg-brand-brass">
        <div className="flex items-start gap-3 pr-16">
          <span className="font-mono text-[10px] font-bold tracking-wider text-brand-brass">{index}</span>
          <div>
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-primary-fg">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-primary-fg/75">{description}</p>
          </div>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}
