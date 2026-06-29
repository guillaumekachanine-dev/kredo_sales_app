"use client"

import type { CasePerspective } from "@/hooks/use-staffing-drawer-store"

interface AssistanceCasePerspectiveSwitcherProps {
  perspective: CasePerspective
  opportunityTitle: string
  companyName: string | null
  candidateName: string | null
  canOpenCandidate: boolean
  onChange: (perspective: CasePerspective) => void
}

function SwapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h11l-3-3" />
      <path d="m18 7-3 3" />
      <path d="M17 17H6l3 3" />
      <path d="m6 17 3-3" />
    </svg>
  )
}

export function AssistanceCasePerspectiveSwitcher({
  perspective,
  opportunityTitle,
  companyName,
  candidateName,
  canOpenCandidate,
  onChange,
}: AssistanceCasePerspectiveSwitcherProps) {
  return (
    <div className="mb-4 rounded-[var(--radius-large)] border border-border bg-canvas p-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => onChange("opportunity")}
          aria-pressed={perspective === "opportunity"}
          className={`min-h-12 rounded-[var(--radius-medium)] px-3 py-2 text-left transition-colors ${
            perspective === "opportunity"
              ? "border border-primary/20 bg-surface text-heading"
              : "border border-transparent text-muted hover:bg-surface/70"
          }`}
        >
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
            Besoin
          </span>
          <span className="mt-0.5 block truncate text-xs font-bold">
            {opportunityTitle}
          </span>
          <span className="block truncate text-[10px] text-muted">
            {companyName || "Compte non renseigné"}
          </span>
        </button>

        <div className="flex items-center justify-center px-1 text-muted">
          <span className="size-4">
            <SwapIcon />
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (canOpenCandidate) onChange("candidate")
          }}
          disabled={!canOpenCandidate}
          aria-pressed={perspective === "candidate"}
          className={`min-h-12 rounded-[var(--radius-medium)] px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
            perspective === "candidate"
              ? "border border-primary/20 bg-surface text-heading"
              : "border border-transparent text-muted hover:bg-surface/70"
          }`}
        >
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-brand-brass">
            Candidat
          </span>
          <span className="mt-0.5 block truncate text-xs font-bold">
            {candidateName || "Choisir dans Staffing"}
          </span>
          <span className="block truncate text-[10px] text-muted">
            {candidateName ? "Profil positionné" : "Aucun profil sélectionné"}
          </span>
        </button>
      </div>
    </div>
  )
}
