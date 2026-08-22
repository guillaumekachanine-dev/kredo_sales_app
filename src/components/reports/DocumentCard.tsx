"use client"

import type { DocumentListItem } from "@/app/(app)/reports/_data/reports-types"
import { IconChevron } from "@/components/cockpit/mobile/icons"
import { getDocumentIcon, isMasterStudyDocument, MASTER_STUDY_CATEGORY_LABEL } from "./document-display"
import { cn } from "@/lib/utils"

type DocumentCardProps = {
  document: DocumentListItem
  onClick: (trigger: HTMLButtonElement) => void
  selected?: boolean
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
  activity_recruitment: "Rapport d'activité recrutement",
  weekly_manager: "Brief hebdomadaire",
  manager_summary: "Compte-rendu Manager",
  planning_deadlines: "Planning & échéances",
  financial: "Rapport financier",
  quarterly_review: "Business review trimestrielle",
  staffing_capacity: "Staffing & capacité",
  delivery_profitability: "Delivery & rentabilité",
  account_portfolio: "Revue de portefeuille comptes",
  workspace_diagnostic: "Diagnostic du centre de profit",
  financial_reference: "Référence financière",
  commercial_quote: "Devis commercial",
  strategic_watch_analysis: "Analyse stratégique de la veille",
  master_study: "Master Study sectorielle",
  competitive_map_import: "Import de cartographie",
  mission_report: "Rapport de mission",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function DocumentCard({ document, onClick, selected = false }: DocumentCardProps) {
  const isMasterStudy = isMasterStudyDocument(document.documentType)
  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative grid min-h-[92px] w-full grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-center gap-3 border-b border-border bg-surface px-4 py-3 text-left outline-none transition-colors",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
        selected
          ? isMasterStudy
            ? "bg-master-study-selected-bg before:absolute before:inset-y-0 before:left-0 before:w-[3.5px] before:bg-master-study-selected-border"
            : "bg-primary/[0.07] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass"
          : isMasterStudy
            ? "hover:bg-master-study-selected-bg/50"
            : "hover:bg-surface-hover/60",
      )}
      aria-label={`Ouvrir ${document.title}`}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded transition-colors",
          isMasterStudy ? "bg-master-study-selected-bg text-master-study-accent" : "bg-canvas text-muted",
        )}
        aria-hidden="true"
      >
        {getDocumentIcon(
          document.documentType,
          isMasterStudy ? "size-5 shrink-0 text-master-study-accent" : "size-5 shrink-0 text-muted",
        )}
      </span>

      <span className="min-w-0">
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 flex-1 text-[15px] font-bold leading-5 text-heading">
            {document.title}
          </span>
          {document.isFavorite ? (
            <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-brass">
              Favori
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-muted">
          {isMasterStudy ? (
            <span>{MASTER_STUDY_CATEGORY_LABEL} - créé le {formatDate(document.updatedAt)}</span>
          ) : (
            <>
              <span>{DOCUMENT_TYPE_LABELS[document.documentType]}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(document.updatedAt)}</span>
            </>
          )}
          {document.primaryEntity?.label ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{document.primaryEntity.label}</span>
            </>
          ) : null}
        </span>
      </span>

      <span className="text-heading transition-transform group-hover:translate-x-0.5" aria-hidden="true"><IconChevron /></span>
    </button>
  )
}
