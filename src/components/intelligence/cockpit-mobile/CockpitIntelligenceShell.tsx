import type { ReactNode } from "react"

export function CockpitIntelligenceHeader({
  pageLabel,
  onBack,
}: {
  pageLabel: string
  onBack?: () => void
}) {
  return (
    <div className="min-w-0 text-white">
      {/* Ligne 1 — eyebrow */}
      <p className="text-[8px] font-bold uppercase leading-none tracking-[0.22em] text-brand-brass">
        Cockpit Intelligence
      </p>
      {/* Ligne 2 — titre page */}
      <h2 className="mt-1 truncate font-heading text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-white">
        {pageLabel}
      </h2>
      {/* Ligne 3 — bouton Retour conditionnel */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-2 inline-flex min-h-[2rem] items-center gap-1 text-[11px] font-semibold text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
          aria-label="Retour à la liste des actions"
        >
          <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
      )}
    </div>
  )
}

export function CockpitIntelligenceShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[1] min-h-full bg-gradient-to-b from-cockpit-cobalt-soft to-surface-raised px-5 pb-5 pt-3 text-heading">
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function CockpitSectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <span className="size-[5px] shrink-0 rounded-full bg-brand-brass" aria-hidden="true" />
      <h3 className="shrink-0 text-[9.5px] font-bold uppercase leading-none tracking-[0.18em] text-domain-intelligence">
        {label}
      </h3>
      <span className="h-px min-w-0 flex-1 bg-cockpit-action-border/80" aria-hidden="true" />
    </div>
  )
}
