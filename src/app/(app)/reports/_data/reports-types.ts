import type { Database } from "@/types/database"
import type { CommunicationBrief } from "@/lib/n8n/types"

export type DocumentListItem = {
  id: string
  title: string
  documentType: Database["public"]["Enums"]["intelligence_document_type"]
  status: Database["public"]["Enums"]["intelligence_document_status"]
  versionNumber: number
  isFavorite: boolean
  tags: string[]
  primaryEntity: { type: string; id: string; label: string } | null
  qualityOk: boolean | null
  ownerName: string
  createdAt: string
  updatedAt: string
}

export type DocumentVersion = {
  id: string
  sourceResultId: string | null
  sourceRunId: string | null
  versionNumber: number
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  contentText: string | null
  contentJson: unknown
  briefJson: unknown | null
  sourceRunInputSnapshot: unknown | null
  sourceRefs: unknown[]
  qaFlags: unknown[]
  changeNote: string | null
  createdByName: string | null
  createdAt: string
}

export type DocumentLink = { entityType: string; entityId: string; label: string }

export type DocumentDetail = DocumentListItem & {
  currentContentText: string | null
  currentContentJson: unknown
  links: DocumentLink[]
  versions: DocumentVersion[]
}

export type ReportsFilterState = {
  search?: string
  documentType?: string
  status?: string
  entityType?: string
  entityId?: string
  ownerId?: string
  favoritesOnly?: boolean
  periodFrom?: string
  periodTo?: string
}

export type ReportsKpis = { total: number; drafts: number; ready: number; usedThisMonth: number }

export type ReportsListData = {
  items: DocumentListItem[]
  totalCount: number
  page: number
  pageSize: number
  kpis: ReportsKpis
}

export type ReportsListResult =
  | { data: ReportsListData; error?: never }
  | { data?: never; error: string }

export type DocumentDetailResult =
  | { data: DocumentDetail; error?: never }
  | { data?: never; error: string }

export type ReportLinkInput = {
  entityType: Database["public"]["Enums"]["intelligence_entity_type"]
  entityId: string
}

export type ReportPrimaryEntityInput = ReportLinkInput

export type SaveAsDocumentInput = {
  title: string
  documentType: Database["public"]["Enums"]["intelligence_document_type"]
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  contentText: string | null
  contentJson: unknown
  scopeJson?: unknown | null
  dataCutoffAt?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  briefJson?: unknown | null
  sourceRefs?: unknown[]
  qaFlags?: unknown[]
  changeNote?: string | null
  tags?: string[]
  isFavorite?: boolean
  sourceResultId?: string | null
  links?: ReportLinkInput[]
  primaryEntity?: ReportPrimaryEntityInput | null
}

export type UpdateDocumentInput = {
  documentId: string
  title: string
  contentText: string | null
  contentJson: unknown
  briefJson?: unknown | null
  sourceRefs?: unknown[]
  qaFlags?: unknown[]
  changeNote?: string | null
  tags?: string[]
  isFavorite?: boolean
  status?: Database["public"]["Enums"]["intelligence_document_status"]
  links?: ReportLinkInput[]
  primaryEntity?: ReportPrimaryEntityInput | null
}

export type DocumentMutationResult =
  | { success: true; documentId: string; error?: never }
  | { success?: never; documentId?: never; error: string }

export type CommunicationReuseMode = "variant" | "adapt_contact" | "reuse_account" | "follow_up"

export type CommunicationAccountContext = {
  company: {
    id: string
    name: string
    lifecycleStatus: string
  }
  contacts: Array<{
    id: string
    fullName: string
    jobTitle: string | null
    relationshipRole: string | null
    email: string | null
  }>
}

export type CommunicationReusePreparation = {
  data: CommunicationAccountContext
  initialBrief: CommunicationBrief
  title: string
  description: string
}

export type CommunicationReusePreparationResult =
  | { data: CommunicationReusePreparation; error?: never }
  | { data?: never; error: string }

export const REPORTS_DEFAULT_PAGE_SIZE = 24

// ============================================================
// REPORT-001 — Lot 0 : contrat transverse des rapports générés
// ============================================================
// Sous-ensemble de intelligence_document_type dédié aux rapports (par
// opposition aux documents de rédaction assistée INTEL-020 : communication,
// commercial_pitch, campaign, internal_note qui restent hors REPORT-001).
// client_summary est partagé : c'était déjà le type de la synthèse client
// INTEL-021, qui devient le premier rapport du moteur transverse (Lot 1).

export type ReportType =
  | "client_summary"
  | "activity_commercial"
  | "activity_recruitment"
  | "weekly_manager"
  | "planning_deadlines"
  | "financial"
  | "quarterly_review"
  | "staffing_capacity"
  | "delivery_profitability"
  | "account_portfolio"

export type ReportPeriodPreset = "week" | "month" | "quarter" | "year" | "custom"

export type ReportAudience = "self" | "management" | "executive" | "account_team"

export type ReportDetailLevel = "executive" | "standard" | "detailed"

export type ReportOutputFormat = "web" | "pdf" | "docx" | "pptx" | "csv"

// Brief de génération transmis dans ai_intelligence_runs.input_snapshot (même
// pattern que CommunicationBrief pour INTEL-020 — pas de colonne dédiée).
export interface ReportBrief {
  reportType: ReportType
  period: {
    preset?: ReportPeriodPreset
    startDate: string
    endDate: string
    asOfDate: string
  }
  scope: {
    companyIds?: string[]
    sectorIds?: string[]
    // Pas de table `practices` référentielle dans KREDO — collaborators.practice
    // est un champ texte libre, donc ce filtre porte sur des valeurs texte,
    // pas des UUID (contrairement à companyIds/sectorIds).
    practices?: string[]
    ownerIds?: string[]
    recruiterIds?: string[]
  }
  audience: ReportAudience
  detailLevel: ReportDetailLevel
  outputFormats: ReportOutputFormat[]
  options: {
    includeForecast?: boolean
    includeRecommendations?: boolean
    includeSources?: boolean
  }
  additionalInstructions?: string
}

// Un fait déterministe calculé par Supabase/lib métier — jamais par le LLM.
// L'IA reçoit un tableau de ReportFact et ne peut citer que des valeurs qui y
// figurent (contrôle qualité côté n8n : "chiffres non autorisés").
export type ReportFact = {
  key: string
  label: string
  value: number | string | boolean | null
  unit?: string
  periodStart?: string | null
  periodEnd?: string | null
  asOfDate: string
  sourceRef?: { entityType: string; entityId: string; label: string }
}

export type ReportDataCoverage = {
  // Fraîcheur globale des données sources utilisées pour le rapport.
  dataCutoffAt: string
  // Signale les zones où la donnée source est absente ou partielle (ex.
  // "14/96 comptes avec sector_id renseigné") — affiché à l'utilisateur,
  // jamais masqué.
  caveats: string[]
}

// ============================================================
// REPORT-001 — Lot 1 : Fiche de synthèse compte
// ============================================================
// Miroir exact du JSONB retourné par la RPC get_account_summary_facts
// (supabase/migrations/20260703150000_report_account_summary_rpc.sql),
// hydratée par n8n (nœud "Hydrate Facts") puis renvoyée telle quelle dans
// callback.contentJson.facts. Aucun champ ici n'est calculé par le LLM.

export type AccountSummaryFacts = {
  identity: {
    id: string
    name: string
    lifecycleStatus: string
    sector: string | null
    sectorId: string | null
    segment: string | null
    aiScore: number | null
    priority: string
  }
  potential: {
    openPipeWeighted: number
    openOpportunitiesCount: number
    wonOpportunitiesCount: number
    totalOpportunitiesCount: number
  }
  relation: {
    activeMissionsCount: number
    avgTheoreticalMarginPct: number | null
    totalRevenueProduced: number
    ytdRevenueProduced: number
    contactsCount: number
  }
  activity: {
    needsTreatedCount: number
    meetingsRealizedLast12m: number
    nextActions: Array<{
      opportunityId: string
      label: string | null
      at: string | null
      isOverdue: boolean
    }>
  }
  signals: {
    news: { title: string; summary: string | null; publishedAt: string; isTriggerEvent: boolean } | null
    regulatoryDeadline: {
      name: string
      description: string | null
      deadlineDate: string | null
      urgency: string
      isCommercialWindow: boolean
    } | null
  }
  scores: {
    conviction: number
    investment: number
  }
  dataCutoffAt: string
  caveats: string[]
}

// Section rédigée par le LLM — n'a le droit de citer que des valeurs
// présentes dans `facts` (contrôle qualité côté n8n : "chiffres non autorisés").
export type AccountSummaryNarrative = {
  analysis: string // 3-5 lignes, synthèse de l'activité et de la santé du compte
  recommendedApproach: {
    practice: string | null
    offer: string | null
    argument: string
  }
  nextBestAction: string
  warnings?: string[]
}

export type AccountSummaryContent = {
  facts: AccountSummaryFacts
  narrative: AccountSummaryNarrative
  sourceRefs: Array<{ entityType: string; entityId?: string; label: string; usedFor?: string }>
  qaFlags: Array<{ check: string; passed: boolean; detail?: string }>
}

// ============================================================
// REPORT-001 — Lot 2 : Rapport d'activité commerciale
// ============================================================
// Miroir exact du JSONB retourné par get_activity_commercial_facts
// (supabase/migrations/20260704120000_report_activity_facts_rpc.sql).
// Anti-double-comptage interactions/calendar_events par construction
// temporelle (réalisé = passé, planifié = futur) — pas de déduplication
// explicite nécessaire sur calendar_event_id.

export type ActivityCommercialFacts = {
  period: { startDate: string; endDate: string; asOfDate: string }
  activity: {
    realizedMeetingsCount: number
    plannedMeetingsCount: number
  }
  pipeMovements: {
    opportunitiesCreatedCount: number
    opportunitiesWonCount: number
    opportunitiesLostCount: number
    wonWeightedValue: number
  }
  pipeSnapshot: {
    openOpportunitiesCount: number
    openPipeWeighted: number
  }
  staleOpportunities: Array<{
    opportunityId: string
    title: string
    companyName: string | null
    stage: string
    daysSinceLastAction: number
  }>
  upcomingNextActions: Array<{
    opportunityId: string
    title: string
    companyName: string | null
    label: string | null
    at: string | null
  }>
  byOwner: Array<{ ownerId: string; ownerName: string | null; openCount: number; openPipeWeighted: number }>
  bySector: Array<{ sectorId: string; sectorName: string | null; openCount: number; openPipeWeighted: number }>
  dataCutoffAt: string
  caveats: string[]
}

// Section rédigée par le LLM — n'a le droit de citer que des valeurs
// présentes dans `facts` (même contrôle qualité que AccountSummaryNarrative).
export type ActivityCommercialNarrative = {
  summary: string // 3-5 lignes de synthèse sur l'activité de la période
  priorities: string[] // sujets prioritaires à traiter
  risks: string[] // opportunités/actions à risque
  warnings?: string[]
}

export type ActivityCommercialContent = {
  facts: ActivityCommercialFacts
  narrative: ActivityCommercialNarrative
  sourceRefs: Array<{ entityType: string; entityId?: string; label: string; usedFor?: string }>
  qaFlags: Array<{ check: string; passed: boolean; detail?: string }>
}

// ============================================================
// REPORT-001 — Lot 2 : Rapport d'activité recrutement
// ============================================================
// Miroir exact du JSONB retourné par get_activity_recruitment_facts.
// Deux funnels distincts : recrutement interne (candidate_hiring_processes)
// et positionnement sur besoin (opportunity_candidates) — jamais fusionnés.

export type ActivityRecruitmentFacts = {
  period: { startDate: string; endDate: string; asOfDate: string }
  hiringFunnel: {
    byStep: Array<{ step: string; count: number }>
    closedThisPeriod: Array<{ closeReason: string | null; count: number }>
    integratedThisPeriod: number
  }
  positioningFunnel: {
    byStatus: Array<{ status: string; count: number }>
    sentToClientThisPeriod: number
    proposedThisPeriod: number
  }
  pendingOffers: Array<{
    candidateId: string
    candidateName: string | null
    offerStatus: string | null
    deadline: string | null
  }>
  availableSoon: Array<{ candidateId: string; candidateName: string | null; availableFrom: string | null }>
  byPractice: Array<{ practiceId: string | null; practiceName: string | null; activeCandidatesCount: number }>
  byOrigin: Array<{ source: string | null; count: number }>
  dataCutoffAt: string
  caveats: string[]
}

export type ActivityRecruitmentNarrative = {
  summary: string
  priorities: string[]
  risks: string[]
  warnings?: string[]
}

export type ActivityRecruitmentContent = {
  facts: ActivityRecruitmentFacts
  narrative: ActivityRecruitmentNarrative
  sourceRefs: Array<{ entityType: string; entityId?: string; label: string; usedFor?: string }>
  qaFlags: Array<{ check: string; passed: boolean; detail?: string }>
}
