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
  commercial_pitch: "Pitch commercial",
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
      className="min-h-14 rounded-[var(--radius-medium)] border border-border/50 bg-surface p-4 transition-all active:scale-[0.99]"
      aria-label={`Ouvrir ${document.title}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-sm font-semibold text-heading">
            {document.title}
          </h3>
          {document.isFavorite ? (
            <span className="shrink-0 text-primary" aria-hidden="true">
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5L11.91 7.38L16.19 8L13.09 11.02L13.82 15.28L10 13.27L6.18 15.28L6.91 11.02L3.81 8L8.09 7.38L10 3.5Z" />
              </svg>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <StatusPill
            label={STATUS_LABELS[document.status]}
            variant={
              document.status === "draft"
                ? "draft"
                : document.status === "ready"
                  ? "inProgress"
                  : document.status === "used"
                    ? "success"
                    : "neutral"
            }
          />
          <span className="text-[11px] text-muted">
            {DOCUMENT_TYPE_LABELS[document.documentType]}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="min-w-0 flex-1 truncate">
            {document.primaryEntity?.label ?? "—"}
          </span>
          <span className="shrink-0">{formatDate(document.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
