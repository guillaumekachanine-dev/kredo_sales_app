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

type CommunicationDocumentType =
  | "communication"
  | "commercial_pitch"
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
])

export const DOCUMENT_OBJECT_LABELS: Record<DocumentType, string> = {
  communication: "Communication",
  client_summary: "Synthèse client",
  commercial_strategy: "Stratégie commerciale",
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

const DOCUMENT_TYPE_LABELS: Record<CommunicationDocumentType | ReportDocumentType, string> = {
  communication: "mail",
  commercial_pitch: "pitch",
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
}

export function getDocumentCategory(documentType: DocumentType): DocumentCategory {
  return REPORT_DOCUMENT_TYPES.has(documentType as ReportDocumentType) ? "report" : "communication"
}

export function getDocumentTypeLabel(documentType: DocumentType) {
  return DOCUMENT_TYPE_LABELS[documentType]
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
