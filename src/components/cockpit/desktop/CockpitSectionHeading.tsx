import type { ReactNode } from "react"

export function CockpitSectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold text-heading">{title}</h2>
      </div>
      {children}
    </div>
  )
}
