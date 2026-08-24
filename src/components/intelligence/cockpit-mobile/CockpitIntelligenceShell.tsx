import type { ReactNode } from "react"

export function CockpitIntelligenceHeader({ pageLabel }: { pageLabel: string }) {
  return (
    <div className="min-w-0 text-white">
      <p className="text-[7.5px] font-semibold uppercase leading-none tracking-[0.24em] text-white/60">
        Espace intelligence
      </p>
      <h2 className="mt-1.5 truncate font-heading text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-white">
        Cockpit Intelligence
      </h2>
      <p className="mt-2.5 flex min-h-4 items-center gap-2 truncate text-[11px] font-semibold leading-none text-white/75">
        <span className="h-3 w-0.5 shrink-0 rounded-full bg-brand-brass" aria-hidden="true" />
        {pageLabel}
      </p>
    </div>
  )
}

export function CockpitIntelligenceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] min-h-full bg-gradient-to-b from-cockpit-cobalt-soft to-surface-raised px-7 pb-[2.125rem] pt-4 text-heading">
      <div className="space-y-[1.125rem]">{children}</div>
    </div>
  )
}

export function CockpitSectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="size-[5px] shrink-0 rounded-full bg-brand-brass" aria-hidden="true" />
      <h3 className="shrink-0 text-[9.5px] font-bold uppercase leading-none tracking-[0.18em] text-domain-intelligence">
        {label}
      </h3>
      <span className="h-px min-w-0 flex-1 bg-cockpit-action-border/80" aria-hidden="true" />
    </div>
  )
}
