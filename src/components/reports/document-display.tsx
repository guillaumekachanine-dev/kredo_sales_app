import type { DocumentDetail, DocumentListItem } from "@/app/(app)/reports/_data/reports-types"
import { CHANNEL_OPTIONS, OBJECTIVE_OPTIONS } from "@/components/accounts-contacts/intelligence/communication-brief-options"

type ReportDocumentType =
  | "client_summary"
  | "commercial_strategy"
  | "activity_commercial"
  | "activity_recruitment"
  | "weekly_manager"
  | "planning_deadlines"
  | "financial"
  | "quarterly_review"
  | "staffing_capacity"
  | "delivery_profitability"
  | "account_portfolio"
  | "workspace_diagnostic"
  | "financial_reference"
  | "commercial_quote"
  | "strategic_watch_analysis"

type CommunicationDocumentType =
  | "communication"
  | "commercial_pitch"
  | "prise_de_parole"
  | "campaign"
  | "internal_note"

type DocumentType = DocumentListItem["documentType"] | DocumentDetail["documentType"]

export type DocumentCategory = "report" | "communication"

const REPORT_DOCUMENT_TYPES = new Set<ReportDocumentType>([
  "client_summary",
  "commercial_strategy",
  "activity_commercial",
  "activity_recruitment",
  "weekly_manager",
  "planning_deadlines",
  "financial",
  "quarterly_review",
  "staffing_capacity",
  "delivery_profitability",
  "account_portfolio",
  "workspace_diagnostic",
  "financial_reference",
  "commercial_quote",
  "strategic_watch_analysis",
])

export const DOCUMENT_OBJECT_LABELS: Record<DocumentType, string> = {
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
  commercial_quote: "Devis commercial",
  strategic_watch_analysis: "Analyse stratégique de la veille",
}

const DOCUMENT_TYPE_LABELS: Record<CommunicationDocumentType | ReportDocumentType, string> = {
  communication: "mail",
  commercial_pitch: "pitch",
  prise_de_parole: "prise de parole",
  campaign: "pitch",
  internal_note: "mail",
  client_summary: "rapport",
  commercial_strategy: "rapport",
  activity_commercial: "rapport",
  activity_recruitment: "rapport",
  weekly_manager: "rapport",
  planning_deadlines: "rapport",
  financial: "rapport",
  quarterly_review: "rapport",
  staffing_capacity: "rapport",
  delivery_profitability: "rapport",
  account_portfolio: "rapport",
  workspace_diagnostic: "rapport",
  financial_reference: "rapport",
  commercial_quote: "rapport",
  strategic_watch_analysis: "rapport",
}

export function getDocumentCategory(documentType: DocumentType): DocumentCategory {
  return REPORT_DOCUMENT_TYPES.has(documentType as ReportDocumentType) ? "report" : "communication"
}

export function getDocumentTypeLabel(documentType: DocumentType) {
  return DOCUMENT_TYPE_LABELS[documentType]
}

export function getFinancialReferenceDocumentSummary(content: unknown) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return null
  const value = content as Record<string, unknown>
  const resource = typeof value.resource_label === "string" ? value.resource_label : null
  const profile = typeof value.profile_name === "string" ? value.profile_name : null
  const startDate = typeof value.start_date === "string" ? value.start_date : null
  const endDate = typeof value.end_date === "string" ? value.end_date : null
  const saleDailyRate = typeof value.sale_daily_rate === "number" ? value.sale_daily_rate : null
  const revenue = typeof value.revenue_total === "number" ? value.revenue_total : null
  const margin = typeof value.gross_margin_pct === "number" ? value.gross_margin_pct : null

  if (!resource && !profile && saleDailyRate === null && revenue === null && margin === null) return null
  return { resource, profile, startDate, endDate, saleDailyRate, revenue, margin }
}

export function getDocumentIcon(documentType: string, className = "size-4 shrink-0 text-muted") {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  switch (documentType) {
    case "communication":
    case "internal_note":
      return (
        <svg {...commonProps}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )
    case "commercial_pitch":
    case "campaign":
      return (
        <svg {...commonProps}>
          <path d="m3 11 18-5v12L3 13v-2Z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      )
    case "prise_de_parole":
      return (
        <svg {...commonProps}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case "client_summary":
    case "account_portfolio":
      return (
        <svg {...commonProps}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case "commercial_strategy":
    case "strategic_watch_analysis":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )
    case "activity_commercial":
    case "activity_recruitment":
    case "workspace_diagnostic":
      return (
        <svg {...commonProps}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case "financial":
    case "delivery_profitability":
    case "financial_reference":
    case "commercial_quote":
      return (
        <svg {...commonProps}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case "staffing_capacity":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 1 0 7.75" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "planning_deadlines":
    case "weekly_manager":
    case "quarterly_review":
    default:
      return (
        <svg {...commonProps}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
  }
}

// ADR-0009 — le titre stocké d'un pitch (`n10-prepare-callback`) part de l'accroche
// générée, ce qui donne une phrase entière en guise de titre. Ce libellé concis,
// dérivé du brief plutôt que du contenu, remplace l'affichage partout où un
// document commercial_pitch est montré (dialog, panneau, drawer mobile).
export function getPitchBriefLabel(briefJson: unknown): string | null {
  if (!briefJson || typeof briefJson !== "object") return null
  const brief = briefJson as { what?: { channel?: string }; who?: { objective?: string } }
  const channel = brief.what?.channel
  if (!channel) return null
  const channelLabel = CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel
  const objective = brief.who?.objective
  const objectiveLabel = objective ? OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label : null
  return objectiveLabel ? `${channelLabel} · ${objectiveLabel}` : channelLabel
}
