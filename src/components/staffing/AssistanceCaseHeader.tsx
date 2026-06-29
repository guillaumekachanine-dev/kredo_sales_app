"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import type { AssistanceCasePerspective } from "@/hooks/use-staffing-drawer-store"
import { cn } from "@/lib/utils"

interface AssistanceCaseHeaderProps {
  opportunity: AssistanceCaseOpportunity
  positioning: AssistanceCasePositioning | null
  perspective: AssistanceCasePerspective
  onPerspectiveChange: (perspective: AssistanceCasePerspective) => void
}

function getCandidateName(positioning: AssistanceCasePositioning | null) {
  const person = positioning?.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Profil sans nom"
  )
}

export function AssistanceCaseHeader({
  opportunity,
  positioning,
  perspective,
  onPerspectiveChange,
}: AssistanceCaseHeaderProps) {
  const companyName = opportunity.company?.name ?? "Compte non renseigné"
  const candidateName = getCandidateName(positioning)
  const candidateTitle = positioning?.candidate.current_title ?? "Profil candidat"

  return (
    <div className="flex min-w-0 flex-col gap-2.5 select-none">
      <div className="flex items-center gap-2">
        <CompanyLogo
          name={companyName}
          website={opportunity.company?.website}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-[1.02rem] font-bold leading-tight text-heading">
            {opportunity.title}
          </p>
          <p className="truncate text-xs font-medium leading-snug text-muted">
            {companyName}
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 rounded-[var(--radius-large)] border p-1"
        style={{ borderColor: "var(--color-border)", background: "var(--color-canvas)" }}
      >
        <button
          type="button"
          onClick={() => onPerspectiveChange("opportunity")}
          className={cn(
            "min-h-11 min-w-0 rounded-[var(--radius-medium)] px-2.5 py-1.5 text-left transition-colors",
            perspective === "opportunity"
              ? "bg-surface text-heading"
              : "text-muted hover:bg-surface/70 hover:text-heading",
          )}
          aria-pressed={perspective === "opportunity"}
        >
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
            Besoin
          </span>
          <span className="block truncate text-xs font-semibold">
            {opportunity.title}
          </span>
        </button>

        <span className="flex items-center justify-center px-0.5 text-muted" aria-hidden="true">
          ⇄
        </span>

        <button
          type="button"
          disabled={!positioning}
          onClick={() => positioning && onPerspectiveChange("candidate")}
          className={cn(
            "min-h-11 min-w-0 rounded-[var(--radius-medium)] px-2.5 py-1.5 text-left transition-colors",
            perspective === "candidate"
              ? "bg-surface text-heading"
              : "text-muted hover:bg-surface/70 hover:text-heading",
            !positioning && "cursor-not-allowed opacity-55 hover:bg-transparent",
          )}
          aria-pressed={perspective === "candidate"}
          title={positioning ? "Afficher le dossier candidat" : "Sélectionner un profil dans Staffing"}
        >
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
            Candidat
          </span>
          <span className="block truncate text-xs font-semibold">
            {positioning ? candidateName : "Sélectionner un profil"}
          </span>
          {positioning && (
            <span className="block truncate text-[10px] font-medium text-muted">
              {candidateTitle}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
