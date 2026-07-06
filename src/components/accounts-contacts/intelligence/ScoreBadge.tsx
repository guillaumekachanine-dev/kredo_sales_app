"use client"

import { cn } from "@/lib/utils"
import type { AccountScoreSummaryView } from "@/lib/account-scoring/get-account-score-summary"

const BAND_LABELS: Record<string, string> = {
  A: "Priorité immédiate",
  B: "À travailler",
  C: "À surveiller",
  D: "Non prioritaire",
  U: "Confiance faible",
}

// ADR-0011 §4.2 — règle UX non négociable : sous confidence 40, le chiffre ne
// s'affiche jamais dans le badge (seule la modale de détail le révèle, dans
// un cadre atténué). Évite qu'un compte pauvre en données affiche une note
// faussement précise dans le header.
function isUnqualified(summary: AccountScoreSummaryView): boolean {
  return summary.scoreBand === "U" || summary.confidenceScore < 40
}

// Purement présentationnel — l'état (summary courant, ouverture de la modale)
// vit dans le composant parent (Desktop/MobileView) car la vue mobile monte
// ce badge à deux endroits (header + onglet Scoring) qui doivent rester
// synchronisés après un recalcul.
export function ScoreBadge({
  summary,
  onClick,
  className,
}: {
  summary: AccountScoreSummaryView | null
  onClick: () => void
  className?: string
}) {
  const hidden = summary === null || isUnqualified(summary)
  const displayValue = hidden ? "—" : Math.round(summary.scoreValue).toString()
  const displayLabel = summary === null ? "Score à calculer" : BAND_LABELS[summary.scoreBand]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border px-4 py-2 transition-colors",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        summary === null ? "border-dashed border-border bg-surface" : "border-border bg-surface",
        className,
      )}
      aria-haspopup="dialog"
    >
      <span className={cn("font-heading text-2xl font-bold leading-none", hidden ? "text-muted" : "text-heading")}>
        {displayValue}
      </span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">{displayLabel}</span>
    </button>
  )
}
