"use client"

import type { KeyboardEvent } from "react"
import { StatusPill } from "@/components/ui/StatusPill"
import type { DocumentListItem } from "@/app/(app)/reports/_data/reports-types"

type DocumentCardProps = {
  document: DocumentListItem
  onClick: () => void
}

const DOCUMENT_TYPE_LABELS: Record<DocumentListItem["documentType"], string> = {
  communication: "Communication",
  client_summary: "Synthèse client",
  commercial_strategy: "Stratégie commerciale",
  commercial_pitch: "Pitch commercial",
  prise_de_parole: "Prise de parole",
  campaign: "Campagne",
  internal_note: "Note interne",
  activity_commercial: "Activité commerciale",
  activity_recruitment: "Activité recrutement",
  weekly_manager: "Rapport hebdo manager",
  planning_deadlines: "Planning & échéances",
  financial: "Rapport financier",
  quarterly_review: "Business review trimestrielle",
  staffing_capacity: "Staffing & capacité",
  delivery_profitability: "Delivery & rentabilité",
  account_portfolio: "Revue de portefeuille comptes",
  workspace_diagnostic: "Diagnostic du centre de profit",
  financial_reference: "Référence financière",
  commercial_quote: "Devis client",
}

const STATUS_LABELS: Record<DocumentListItem["status"], string> = {
  draft: "Brouillon",
  ready: "Prêt",
  used: "Utilisé",
  archived: "Archivé",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR")
}

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onClick: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    onClick()
  }
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => handleCardKeyDown(event, onClick)}
      className="min-h-14 rounded-[var(--radius-medium)] border border-border/40 bg-surface/30 backdrop-blur-sm p-4 transition-all hover:bg-surface-hover/30 hover:border-primary/50 cursor-pointer group active:scale-[0.99] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      aria-label={`Ouvrir ${document.title}`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-sm font-bold text-body group-hover:text-heading transition-colors line-clamp-2 leading-snug">
            {document.title}
          </h3>
          {document.isFavorite ? (
            <span className="shrink-0 text-primary animate-pulse" aria-hidden="true">
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5L11.91 7.38L16.19 8L13.09 11.02L13.82 15.28L10 13.27L6.18 15.28L6.91 11.02L3.81 8L8.09 7.38L10 3.5Z" />
              </svg>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[6px] border border-border/40 bg-surface-hover/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted group-hover:text-body transition-colors">
            {STATUS_LABELS[document.status]}
          </span>
          <span className="text-[10px] font-medium text-muted group-hover:text-body/80 transition-colors">
            {DOCUMENT_TYPE_LABELS[document.documentType]}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xxs text-muted group-hover:text-body/60 transition-colors pt-1 border-t border-border/20">
          <span className="min-w-0 truncate font-medium">
            {document.primaryEntity?.label ?? "—"}
          </span>
          <span className="shrink-0 whitespace-nowrap">{formatDate(document.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
