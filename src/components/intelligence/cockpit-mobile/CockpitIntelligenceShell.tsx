import type { ReactNode } from "react"

export function CockpitIntelligenceHeader({
  pageLabel,
}: {
  pageLabel: string
  onBack?: () => void
}) {
  return (
    <div className="min-w-0 text-white">
      {/* Ligne 1 — eyebrow */}
      <p className="text-[8px] font-bold uppercase leading-none tracking-[0.22em] text-cockpit-amber">
        Cockpit Intelligence
      </p>
      {/* Ligne 2 — titre page */}
      <h2 className="mt-1 truncate font-heading text-[20px] font-bold leading-tight tracking-[-0.02em] text-white">
        {pageLabel}
      </h2>
    </div>
  )
}

export function CockpitIntelligenceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] min-h-full bg-cockpit-light-grey px-5 pb-5 pt-3 text-heading">
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function CockpitSectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <span className="size-[5px] shrink-0 rounded-full bg-cockpit-amber" aria-hidden="true" />
      <h3 className="shrink-0 text-[9.5px] font-bold uppercase leading-none tracking-[0.18em] text-domain-intelligence">
        {label}
      </h3>
      <span className="h-px min-w-0 flex-1 bg-cockpit-action-border/80" aria-hidden="true" />
    </div>
  )
}
