import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOffersCatalog } from "@/lib/reference-data/get-offers-catalog"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getAccountScoreSummary, type AccountScoreSummaryView } from "@/lib/account-scoring/get-account-score-summary"
import {
  ACCOUNT_KNOWLEDGE_RESULT_TYPE,
  SECTOR_SNAPSHOT_RESULT_TYPE,
  COMMERCIAL_STRATEGY_RESULT_TYPE,
  type AccountKnowledgeContent,
  type AccountIssueCategory,
  type AccountIssueEvidenceLevel,
  type AccountIssueStatus,
  type IntelligenceProvenance,
  type CommercialStrategyContent,
} from "@/lib/intelligence/account-intelligence-contracts"
import { getSectorSnapshot, type SectorSnapshotView } from "@/lib/intelligence/sector-snapshot-data"
import {
  DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS,
  normalizeAccountWatchSettings,
  type AccountWatchSettingsRow,
  type AccountWatchSettingsState,
} from "@/lib/intelligence/account-watch-settings"
import { getMonitoredSourceLabels } from "@/lib/intelligence/client-intelligence-home"
import {
  normalizeCompanyIdentity,
  normalizeCompanyMarketPositioning,
  normalizeCompanyOperationalSnapshot,
  resolveContactOfferSuggestion,
  sortCompanyContacts,
  type CompanyIdentityProfile,
  type CompanyMarketPositioning,
  type CompanyOperationalSnapshot,
} from "@/lib/intelligence/client-intelligence-company"

// ─────────────────────────────────────────────────────────────────────────────
//  Client Intelligence Hub — couche de lecture (ADR-0008)
//
//  Lit le moteur 0007 (`ai_intelligence_results.content_json` par phase via la
//  vue `v_ai_intelligence_summary`) avec FALLBACK sur `companies.metadata`
//  (analyses FOLIO importées). Aucune écriture, aucune table de résultat nouvelle.
//
//  Provenance explicite (`source: engine | folio | none`) pour honorer la règle
//  « faits vs hypothèses » : on ne présente jamais une donnée legacy comme une
//  vérité moteur. Le contrat `content_json` typé Zod arrive au lot C (K-063).
// ─────────────────────────────────────────────────────────────────────────────

export type IntelligenceSource = "engine" | "folio" | "none"

export type AnalyseClient = {
  synthese: string
  identite: Record<string, string>
  positionnement: Record<string, string>
  signaux: {
    actualitesRecentes: string[]
    tendanceCroissance: string
    recrutementsRecents: string
    maturiteDigitale: string
  }
  contexteSectoriel: {
    secteur: string
    concurrents: string[]
    tendances: string
  }
}

export type AnalyseSector = {
  synthese: string
  volumeMarche?: unknown
  segmentClientele?: unknown
  acteursCles?: unknown
  chaineValeur?: unknown
  environnementNormatif?: unknown
  analyseConcurrentielle?: unknown
}

export type AnalyseDiagnostic = {
  synthese: string
  cartographieActivites?: unknown
  repartitionCharge?: unknown
  cartographieInterlocuteurs?: unknown
  frictions?: {
    systemiques?: unknown
    parFonction?: unknown
    goulots?: unknown
  }
  feuilleDeRoute?: {
    quickWins?: unknown
    projetsStructurants?: unknown
    transformationsProfonde?: unknown
  }
  matriceImpact?: unknown
}

export type LegacyPitch = {
  id: string
  destinataire: string
  objet: string
  corps: string
  ton: string
  format: string
  pointsCles: string[]
  statut: string
}

export type ClientIntelligencePresence = {
  hasClientAnalysis: boolean
  hasSectorAnalysis: boolean
  hasProcessDiagnostic: boolean
  hasRoadmap: boolean
  hasLegacyAnalysis: boolean
  hasLegacySector: boolean
  hasLegacyPitches: boolean
}

export type ClientIntelligenceContact = {
  id: string
  fullName: string
  jobTitle: string | null
  relationshipRole: string | null
  email: string | null
  // ADR-0012 Lot 2 — enrichissement "carte des interlocuteurs" (étape Connaissance
  // compte). Optionnels : ce type est aussi construit ailleurs (panneau global,
  // composeur de communication, rapports) avec un sous-ensemble minimal de champs.
  department?: string | null
  decisionPower?: string | null
  relationshipLevel?: string | null
  isPriority?: boolean
  offerSuggestion?: {
    offerId: string
    offerName: string
  } | null
}

// ADR-0012 Lot 2 — blocs relationnels "Connaissance compte", haute confiance
// (provenance="relational") car lus directement depuis les tables KREDO, pas
// depuis une génération LLM. Disponibles immédiatement, sans run n8n.
export type ClientIntelligenceOpportunity = {
  id: string
  title: string
  stage: string
  opportunityType: string
  estimatedGain: number | null
  weightedGain: number | null
  nextActionLabel: string | null
  nextActionAt: string | null
  targetCloseDate: string | null
  closedAt: string | null
}

export type ClientIntelligenceMission = {
  id: string
  title: string
  roleTitle: string | null
  practice: string | null
  status: string
  startDate: string | null
  endDate: string | null
  grossMarginPct: number | null
}

export type ClientIntelligenceProject = {
  id: string
  title: string
  status: string
  startDate: string | null
  endDate: string | null
  contractAmount: number | null
  engagementType: string | null
  billingModel: string | null
}

export type ClientIntelligenceCommercialTimelineEntry = {
  id: string
  source: "interaction" | "calendar_event"
  nature: string
  title: string
  summary: string | null
  occurredAt: string
  contactName: string | null
  status: string | null
}

export type ClientIntelligenceSignal = {
  id: string
  category: string | null
  type: string | null
  title: string
  summary: string | null
  detectedAt: string
  lastEvidenceAt?: string | null
  expiresAt: string | null
  // Date de parution de la source primaire (intelligence_sources.published_at)
  // — distincte de detectedAt (date à laquelle Kredo a détecté le signal).
  // Null pour les signaux sans source datée (ajout manuel, source sans date).
  publishedAt: string | null
  globalScore: number
  // Intérêt commercial pour Kredo : recoupe pertinence_esn (alignement mission
  // ESN) et fit_practice (correspondance practices Kredo) — délibérément
  // distinct de globalScore, qui mélange aussi fraîcheur et fiabilité de
  // source (qualité de la donnée, pas intérêt commercial).
  interestScore: number
  urgencyScore: number
  confidenceScore: number
  status: string
  primarySourceId: string | null
  recommendedAction: string | null
  recommendedPracticeId: string | null
  primarySource: {
    id: string
    source_name: string
    source_url: string | null
  } | null
}

export type AccountRecentDocument = {
  id: string
  title: string
  documentType: string
  status: string
  createdAt: string
  updatedAt: string
}

export type AccountCommercialActivity = {
  id: string
  type: string
  occurredAt: string
  summary: string | null
  nextAction: string | null
  contactName: string | null
}

export type AccountWatchOverview = {
  capturedSignalsCount: number
  monitoredSourceLabels: string[]
  averageCostPerRun: number | null
}

// ADR-0012 Lot 5 — référentiel offres allégé (résolution id→libellé pour la
// matrice enjeu↔offre affichée dans l'onglet Stratégie). Distinct de
// `SuggestedOffer` (get-suggested-offers.ts, ADR-0009) : celui-ci sert
// uniquement d'index de libellés, pas de sélection dans un formulaire.
export type ClientIntelligenceOfferRef = {
  id: string
  name: string
  practiceName: string
}

// ADR-0012 Lot 4 — enjeux matérialisés (table account_issues, spine D-5).
export type ClientIntelligenceIssue = {
  id: string
  title: string
  category: AccountIssueCategory
  problemStatement: string
  evidenceLevel: AccountIssueEvidenceLevel
  provenance: IntelligenceProvenance
  importance: number
  urgency: number
  criticality: number
  businessImpact: number
  accessibility: number
  kredoFit: number
  contactIds: string[]
  recommendedNextProbe: string | null
  status: AccountIssueStatus
  createdAt: string
}

export type ClientIntelligenceData = {
  company: {
    id: string
    name: string
    sector: string
    segment: string
    priority: string
    lifecycleStatus: string
    legacyFolioScore: number | null
    website: string | null
    hqLocation: string
    logoPath: string | null
  }
  companyProfile: CompanyIdentityProfile
  companyPositioning: CompanyMarketPositioning
  operationalSnapshot: CompanyOperationalSnapshot
  diagnosticPdfUrl: string | null
  freshness: {
    latestRunAt: string | null
    latestRunStatus: string | null
    countRuns: number
    countResults: number
  }
  presence: ClientIntelligencePresence
  client: { data: AnalyseClient; source: IntelligenceSource } | null
  // ADR-0012 Lot 2 — contrat riche "Connaissance compte" (schema_version 1),
  // distinct de `client` (forme FOLIO historique). null tant qu'aucun run
  // account_knowledge n'a réussi (workflow intel-030 pas encore importé sur le
  // VPS) — l'UI retombe alors sur `client` (FOLIO) exactement comme avant.
  accountKnowledge: { data: AccountKnowledgeContent; resultId: string } | null
  // ADR-0012 Lot 3 — snapshot sectoriel déterministe (D-6, 0 token), lu live
  // depuis sector_intelligence + tables sector_* mutualisées. null tant que le
  // compte n'a pas de sector_id (majorité du parc — cf. ADR §backfill honnête,
  // pas de rattachement forcé). L'UI retombe sur `sector` (FOLIO) sinon.
  sectorSnapshot: SectorSnapshotView | null
  sector: { data: AnalyseSector; source: IntelligenceSource } | null
  diagnostic: { data: AnalyseDiagnostic; source: IntelligenceSource } | null
  signals: string[]
  contacts: ClientIntelligenceContact[]
  pitches: LegacyPitch[]
  pitchDocuments: PitchDocumentSummary[]
  // ADR-0011 Lot 4 — Score de Priorité Commerciale. null si aucun run n'a
  // encore été calculé pour ce compte (état initial, avant le premier clic
  // sur "Actualiser").
  scoreSummary: AccountScoreSummaryView | null
  // ADR-0012 Lot 2 — blocs relationnels "Connaissance compte" (relational, sans LLM)
  opportunities: ClientIntelligenceOpportunity[]
  missions: ClientIntelligenceMission[]
  projects: ClientIntelligenceProject[]
  commercialTimeline: ClientIntelligenceCommercialTimelineEntry[]
  accountSignals: ClientIntelligenceSignal[]
  accountWatch: AccountWatchSettingsState
  recentDocuments: AccountRecentDocument[]
  latestCommercialActivity: AccountCommercialActivity | null
  accountWatchOverview: AccountWatchOverview
  // ADR-0012 Lot 4 — enjeux ouverts (table account_issues, spine matérialisée)
  accountIssues: ClientIntelligenceIssue[]
  // ADR-0012 Lot 5 — mapping enjeu↔offre + angles/messages/objections
  // (result_type=commercial_strategy, content_json pur — D-5, pas de
  // matérialisation table). null tant qu'aucun run n'a réussi.
  commercialStrategy: { data: CommercialStrategyContent; resultId: string } | null
  // Référentiel offres actives, pour résoudre les offer_id de la matrice.
  offersCatalog: ClientIntelligenceOfferRef[]
  // id du dernier résultat account_knowledge réussi — cible des Server Actions
  // de curation (confirmer/écarter/épingler un fait). null tant qu'aucun run
  // n'a produit de account_knowledge (Lot 2 : workflow pas encore importé sur le VPS).
  accountKnowledgeResultId: string | null
}

// ADR-0009 — historique des générations de pitch moteur (onglet Stratégie).
// Distinct de `pitches` (LegacyPitch, import FOLIO en lecture seule) : ce sont
// les vrais résultats `commercial_pitch` déjà auto-sauvegardés en bibliothèque
// (intelligence_documents) par api/n8n/callback/route.ts.
export type PitchDocumentSummary = {
  id: string
  title: string
  status: string
  kind: "spoken_pitch" | "meeting_briefing" | null
  createdAt: string
}

// ─── Loose client (cohérent avec accounts-contacts-data.ts : évite la friction
//     de types générés sur la vue + les tables ai_intelligence_*) ──────────────

type LooseResult<T> = { data: T | null; error: { message: string } | null }
type LooseQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }> & {
  eq(column: string, value: string | boolean): LooseQuery<T>
  in(column: string, values: readonly string[]): LooseQuery<T>
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): LooseQuery<T>
  limit(count: number): LooseQuery<T>
  maybeSingle(): PromiseLike<LooseResult<T>>
}
type LooseTable = { select<T>(columns: string): LooseQuery<T> }
type LooseClient = { from(table: string): LooseTable }

// ─── Helpers JSONB ────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function str(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : ""
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

function flattenStrings(record: JsonRecord): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.trim().length > 0) out[key] = value.trim()
    else if (Array.isArray(value)) {
      const arr = value.filter((v): v is string => typeof v === "string")
      if (arr.length) out[key] = arr.join(", ")
    }
  }
  return out
}

/**
 * Normalise un bloc d'analyse client au format FOLIO (`analysis_data`) OU au
 * format moteur (`content_json` de la phase 1, conçu pour matcher ce contrat).
 */
function parseAnalyseClient(raw: unknown): AnalyseClient | null {
  const root = asRecord(raw)
  if (Object.keys(root).length === 0) return null

  const signaux = asRecord(root.signaux)
  const contexte = asRecord(root.contexte_sectoriel)

  return {
    synthese: str(root.synthese_consultant),
    identite: flattenStrings(asRecord(root.identite)),
    positionnement: flattenStrings(asRecord(root.positionnement)),
    signaux: {
      actualitesRecentes: strArray(signaux.actualites_recentes),
      tendanceCroissance: str(signaux.tendance_croissance),
      recrutementsRecents: str(signaux.recrutements_recents),
      maturiteDigitale: str(signaux.indices_maturite_digitale),
    },
    contexteSectoriel: {
      secteur: str(contexte.secteur),
      concurrents: strArray(contexte.concurrents_identifies),
      tendances: str(contexte.tendances_sectorielles),
    },
  }
}

/**
 * ADR-0012 Lot 2 — parseur du contrat account_knowledge (schema_version 1),
 * distinct de parseAnalyseClient (forme FOLIO). Ne PAS fusionner : les deux
 * schémas n'ont aucun champ en commun, volontairement (la connaissance compte
 * est plus riche que l'ancienne analyse client, cf. ADR-0012 §5 étape 1).
 */
function parseAccountKnowledgeContent(raw: unknown): AccountKnowledgeContent | null {
  const root = asRecord(raw)
  if (root.schema_version !== 1) return null
  return root as unknown as AccountKnowledgeContent
}

/**
 * ADR-0012 Lot 5 — parseur du contrat commercial_strategy (schema_version 1).
 * Même logique que parseAccountKnowledgeContent : discriminé par schema_version,
 * jamais fusionné avec un autre parseur (aucun artefact legacy équivalent —
 * le pitch legacy FOLIO/`pitches` n'a pas de mapping enjeu↔offre).
 */
function parseCommercialStrategyContent(raw: unknown): CommercialStrategyContent | null {
  const root = asRecord(raw)
  if (root.schema_version !== 1) return null
  return root as unknown as CommercialStrategyContent
}

function parseAnalyseDiagnostic(raw: unknown): AnalyseDiagnostic | null {
  const root = asRecord(raw)
  const synthese = str(root.synthese) || str(root.synthese_executive)
  if (!synthese) return null
  const frictions = asRecord(root.frictions)
  const fdr = asRecord(root.feuille_de_route ?? root.feuilleDeRoute)
  return {
    synthese,
    cartographieActivites: root.cartographie_activites ?? root.cartographieActivites ?? null,
    repartitionCharge: root.repartition_charge ?? root.repartitionCharge ?? null,
    cartographieInterlocuteurs: root.cartographie_interlocuteurs ?? root.cartographieInterlocuteurs ?? null,
    frictions: Object.keys(frictions).length > 0 ? {
      systemiques: frictions.systemiques ?? null,
      parFonction: frictions.par_fonction ?? frictions.parFonction ?? null,
      goulots: frictions.goulots ?? null,
    } : undefined,
    feuilleDeRoute: Object.keys(fdr).length > 0 ? {
      quickWins: fdr.quick_wins ?? fdr.quickWins ?? null,
      projetsStructurants: fdr.projets_structurants ?? fdr.projetsStructurants ?? null,
      transformationsProfonde: fdr.transformations_profondes ?? fdr.transformationsProfonde ?? null,
    } : undefined,
    matriceImpact: root.matrice_impact ?? root.matriceImpact ?? null,
  }
}

function parseAnalyseSector(raw: unknown): AnalyseSector | null {
  const root = asRecord(raw)
  const synthese = str(root.synthese_sectorielle) || str(root.synthese)
  if (!synthese) return null
  return {
    synthese,
    volumeMarche: root.volume_marche ?? root.volumeMarche ?? null,
    segmentClientele: root.segment_clientele ?? root.segmentClientele ?? null,
    acteursCles: root.acteurs_cles ?? root.acteursCles ?? null,
    chaineValeur: root.chaine_valeur ?? root.chaineValeur ?? null,
    environnementNormatif: root.environnement_normatif ?? root.environnementNormatif ?? null,
    analyseConcurrentielle: root.analyse_concurrentielle ?? root.analyseConcurrentielle ?? null,
  }
}

/**
 * Pitchs FOLIO importés (`metadata.pitches`) — lecture seule. Les pitchs moteur
 * (result_type='pitch', phase 5) seront branchés au lot H ; même contrat de sortie.
 */
function parsePitches(raw: unknown): LegacyPitch[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i): LegacyPitch => {
      const r = asRecord(item)
      const pts = r.points_cles
      return {
        id: str(r.id) || `pitch-${i}`,
        destinataire: str(r.destinataire),
        objet: str(r.objet_mail),
        corps: str(r.corps_mail),
        ton: str(r.ton),
        format: str(r.format_mail),
        pointsCles: Array.isArray(pts)
          ? pts.filter((p): p is string => typeof p === "string")
          : str(pts)
            ? [str(pts)]
            : [],
        statut: str(r.statut),
      }
    })
    .filter((p) => p.corps || p.objet || p.destinataire)
}

function clean(value: string | null | undefined, fallback = "Non renseigné"): string {
  return value && value.trim().length > 0 ? value.trim() : fallback
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

type CompanyRow = {
  id: string
  name: string
  legal_name: string | null
  sector: string | null
  sector_id: string | null
  segment: string | null
  revenue: string | null
  employee_count: number | null
  size_band: string | null
  priority: string
  lifecycle_status: string
  legacy_folio_score: number | string | null
  website: string | null
  hq_location: string | null
  description: string | null
  metadata: unknown
}

type SummaryRow = {
  has_client_analysis: boolean | null
  has_sector_analysis: boolean | null
  has_process_diagnostic: boolean | null
  has_roadmap: boolean | null
  has_legacy_analysis: boolean | null
  has_legacy_sector: boolean | null
  has_legacy_pitches: boolean | null
  latest_run_at: string | null
  latest_run_status: string | null
  count_runs: number | null
  count_results: number | null
}

type ResultRow = {
  id: string
  phase: number
  result_type: string
  content_json: unknown
  metadata: unknown
  created_at: string
}

type ContactRow = {
  id: string
  job_title: string | null
  department: string | null
  relationship_role: string | null
  decision_power: string | null
  relationship_level: string | null
  is_priority: boolean | null
  persons: { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }
    | { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }[]
    | null
}

type OpportunityRow = {
  id: string
  title: string
  stage: string
  opportunity_type: string
  estimated_gain: number | string | null
  weighted_gain: number | string | null
  next_action_label: string | null
  next_action_at: string | null
  target_close_date: string | null
  closed_at: string | null
}

type MissionRow = {
  id: string
  title: string
  role_title: string | null
  practice: string | null
  status: string
  start_date: string | null
  end_date: string | null
  gross_margin_pct: number | string | null
}

type ProjectRow = {
  id: string
  title: string
  status: string
  start_date_planned: string | null
  end_date_planned: string | null
  start_date_actual: string | null
  end_date_actual: string | null
  contract_amount: number | string | null
  offer_engagement_types: {
    name: string
    billing_model: string
  } | {
    name: string
    billing_model: string
  }[] | null
}

type CommercialInteractionTimelineRow = {
  id: string
  type: string
  occurred_at: string
  summary: string | null
  next_action: string | null
  calendar_event_id: string | null
  contacts: {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  } | {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  }[] | null
}

type CommercialCalendarTimelineRow = {
  id: string
  event_type: string
  status: string
  title: string
  description: string | null
  starts_at: string
  contacts: {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  } | {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  }[] | null
}

type AccountSignalRow = {
  id: string
  signal_category: string | null
  signal_type: string | null
  title: string
  summary: string | null
  status: string
  detected_at: string
  last_evidence_at: string
  expires_at: string | null
  global_score: number
  urgency_score: number
  confidence_score: number
  primary_source_id: string | null
  recommended_action: string | null
  recommended_practice_id: string | null
  // Sous-ensemble du détail de scoring persisté par intel-033 (cf. workflow
  // `Compute Scores & Apply Rules`) — pertinence_esn/fit_practice sont les deux
  // seules composantes réellement "intérêt commercial pour Kredo" (alignement
  // mission ESN + practices) ; freshness/reliability/urgence sont d'autres axes,
  // déjà représentés ailleurs (urgencyScore a sa propre colonne). Absent sur les
  // signaux ajoutés manuellement (create-manual-signal.ts n'écrit pas ce champ).
  score_details: { pertinence_esn?: number | null; fit_practice?: number | null } | null
  intelligence_sources?: {
    id: string
    source_name: string
    source_url: string | null
    published_at: string | null
  } | {
    id: string
    source_name: string
    source_url: string | null
    published_at: string | null
  }[] | null
}

const DISMISSED_SIGNAL_STATUSES = new Set(["dismissed", "false_positive", "expired", "archived"])

// Un run de veille produit une trentaine de signaux (cf. intel-033). Les deux
// plafonds sont distincts à dessein : on récupère large pour que le tri par
// fraîcheur porte sur un vrai vivier, puis on n'expose que les plus récents —
// la carte replie à 5 et laisse déplier le reste.
const ACCOUNT_SIGNALS_FETCH_LIMIT = 60
const ACCOUNT_SIGNALS_DISPLAY_LIMIT = 30

type AccountWatchSettingsSelectRow = AccountWatchSettingsRow & {
  include_official_site: boolean
  include_news: boolean
  include_public_records: boolean
  include_tenders: boolean
  include_social_manual: boolean
}

type RecentDocumentRow = {
  id: string
  title: string
  document_type: string
  status: string
  created_at: string
  updated_at: string
}

type CommercialActivityRow = {
  id: string
  type: string
  occurred_at: string
  summary: string | null
  next_action: string | null
  contacts: {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  } | {
    persons: { full_name: string | null } | { full_name: string | null }[] | null
  }[] | null
}

type WorkflowCostStatsRow = {
  avg_cost_all_time: number | string | null
}

type AccountIssueRow = {
  id: string
  title: string
  category: AccountIssueCategory
  problem_statement: string
  evidence_level: AccountIssueEvidenceLevel
  provenance: IntelligenceProvenance
  importance: number
  urgency: number
  criticality: number
  business_impact: number
  accessibility: number
  kredo_fit: number
  contact_ids: string[] | null
  recommended_next_probe: string | null
  status: AccountIssueStatus
  created_at: string
}

type PitchDocumentRow = {
  id: string
  title: string
  status: string
  current_content_json: unknown
  created_at: string
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// ─── Entrée publique ────────────────────────────────────────────────────────

export async function getClientIntelligence(
  companyId: string,
): Promise<{ error: string | null; data: ClientIntelligenceData | null }> {
  if (!companyId) return { error: "Identifiant manquant", data: null }

  const supabaseReal = await createClient()
  const supabase = supabaseReal as unknown as LooseClient
  const workspaceId = await resolveCurrentWorkspaceId()

  const [
    companyResult,
    summaryResult,
    resultsResult,
    contactsResult,
    pitchDocumentsResult,
    scoreSummary,
    opportunitiesResult,
    missionsResult,
    projectsResult,
    commercialInteractionsResult,
    commercialCalendarResult,
    accountSignalsResult,
    accountWatchResult,
    recentDocumentsResult,
    latestCommercialActivityResult,
    capturedSignalsCountResult,
    watchCostStatsResult,
    accountIssuesResult,
    offersCatalogRows,
    offerPracticesCatalogRows,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select<CompanyRow>(
        "id,name,legal_name,sector,sector_id,segment,revenue,employee_count,size_band,priority,lifecycle_status,legacy_folio_score,website,hq_location,description,metadata",
      )
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("v_ai_intelligence_summary")
      .select<SummaryRow>(
        "has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_legacy_pitches,latest_run_at,latest_run_status,count_runs,count_results",
      )
      .eq("company_id", companyId)
      .maybeSingle(),
    // Seuls 4 result_type sont jamais lus plus bas (account_knowledge,
    // sector_snapshot, commercial_strategy, process_diagnostic) — filtrer ici
    // évite de transporter le content_json (LLM, jusqu'à ~15 Ko/ligne) des
    // rapports/pitchs/etc. qui s'accumulent sur ce compte pour rien.
    supabase
      .from("ai_intelligence_results")
      .select<ResultRow>("id,phase,result_type,content_json,metadata,created_at")
      .eq("company_id", companyId)
      .eq("status", "succeeded")
      .in("result_type", [
        ACCOUNT_KNOWLEDGE_RESULT_TYPE,
        SECTOR_SNAPSHOT_RESULT_TYPE,
        COMMERCIAL_STRATEGY_RESULT_TYPE,
        "process_diagnostic",
      ])
      .order("created_at", { ascending: false })
      .limit(20),
    // ADR-0012 Lot 2 : enrichi (department/decision_power/relationship_level/
    // is_priority) et remonté de 6 à 50 — sert désormais la "carte des
    // interlocuteurs" de Connaissance compte, pas seulement un aperçu.
    supabase
      .from("contacts")
      .select<ContactRow>(
        "id,job_title,department,relationship_role,decision_power,relationship_level,is_priority,persons(full_name,first_name,last_name,primary_email)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("intelligence_documents")
      .select<PitchDocumentRow>("id,title,status,current_content_json,created_at")
      .in("document_type", ["commercial_pitch", "prise_de_parole"])
      .eq("primary_entity_type", "company")
      .eq("primary_entity_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    getAccountScoreSummary(companyId),
    supabase
      .from("opportunities")
      .select<OpportunityRow>(
        "id,title,stage,opportunity_type,estimated_gain,weighted_gain,next_action_label,next_action_at,target_close_date,closed_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("missions")
      .select<MissionRow>("id,title,role_title,practice,status,start_date,end_date,gross_margin_pct")
      .eq("company_id", companyId)
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(20),
    supabaseReal
      .from("projects")
      .select("id,title,status,start_date_planned,end_date_planned,start_date_actual,end_date_actual,contract_amount,offer_engagement_types(name,billing_model)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<ProjectRow[]>(),
    supabaseReal
      .from("interactions")
      .select("id,type,occurred_at,summary,next_action,calendar_event_id,contacts(persons(full_name))")
      .eq("company_id", companyId)
      .order("occurred_at", { ascending: false })
      .limit(24)
      .returns<CommercialInteractionTimelineRow[]>(),
    supabaseReal
      .from("calendar_events")
      .select("id,event_type,status,title,description,starts_at,contacts(persons(full_name))")
      .eq("company_id", companyId)
      .order("starts_at", { ascending: false })
      .limit(24)
      .returns<CommercialCalendarTimelineRow[]>(),
    supabase
      .from("account_signals")
      .select<AccountSignalRow>(`
        id,
        signal_category,
        signal_type,
        title,
        summary,
        status,
        detected_at,
        last_evidence_at,
        expires_at,
        global_score,
        urgency_score,
        confidence_score,
        primary_source_id,
        recommended_action,
        recommended_practice_id,
        score_details,
        intelligence_sources(id, source_name, source_url, published_at)
      `)
      .eq("company_id", companyId)
      .order("detected_at", { ascending: false })
      .limit(ACCOUNT_SIGNALS_FETCH_LIMIT),
    supabase
      .from("account_watch_settings")
      .select<AccountWatchSettingsSelectRow>(
        "is_enabled,watch_level,cadence,include_official_site,include_news,include_public_records,include_tenders,include_social_manual,last_run_at,next_run_at,last_status,last_error,updated_at",
      )
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseReal
      .from("intelligence_documents")
      .select("id,title,document_type,status,created_at,updated_at,intelligence_document_links!inner(entity_type,entity_id)")
      .eq("intelligence_document_links.entity_type", "company")
      .eq("intelligence_document_links.entity_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<RecentDocumentRow[]>(),
    supabaseReal
      .from("interactions")
      .select("id,type,occurred_at,summary,next_action,contacts(persons(full_name))")
      .eq("company_id", companyId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle<CommercialActivityRow>(),
    supabaseReal
      .from("account_signals")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    workspaceId
      ? supabaseReal
          .from("v_workflow_cost_stats")
          .select("avg_cost_all_time")
          .eq("workspace_id", workspaceId)
          .eq("run_type", "account_watch_refresh")
          .maybeSingle<WorkflowCostStatsRow>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("account_issues")
      .select<AccountIssueRow>(
        "id,title,category,problem_statement,evidence_level,provenance,importance,urgency,criticality,business_impact,accessibility,kredo_fit,contact_ids,recommended_next_probe,status,created_at",
      )
      .eq("company_id", companyId)
      .eq("status", "open")
      .order("importance", { ascending: false }),
    // ADR-0012 Lot 5 — référentiel offres actives, pour résoudre les offer_id
    // de la matrice enjeu↔offre (l'onglet Stratégie n'a pas besoin de la fiche
    // complète, juste du libellé — cf. get-suggested-offers.ts pour le
    // sélecteur riche utilisé côté génération de pitch).
    // Référentiels quasi-statiques mis en cache 1h par workspace (audit perf
    // Session 28) plutôt qu'un embed PostgREST offer_practices(name) —
    // le join se fait en JS via practice_id (cf. get-offers-catalog.ts).
    workspaceId ? getOffersCatalog(workspaceId) : Promise.resolve([]),
    workspaceId ? getOfferPracticesCatalog(workspaceId) : Promise.resolve([]),
  ])

  if (companyResult.error) return { error: companyResult.error.message, data: null }
  if (!companyResult.data) return { error: "Compte introuvable", data: null }
  if (accountWatchResult.error) {
    console.error("[intelligence] account watch settings query failed:", accountWatchResult.error.message, { companyId })
  }
  if (recentDocumentsResult.error) {
    console.error("[intelligence] recent documents query failed:", recentDocumentsResult.error.message, { companyId })
  }
  if (latestCommercialActivityResult.error) {
    console.error("[intelligence] latest commercial activity query failed:", latestCommercialActivityResult.error.message, { companyId })
  }
  if (capturedSignalsCountResult.error) {
    console.error("[intelligence] captured signals count query failed:", capturedSignalsCountResult.error.message, { companyId })
  }
  if (watchCostStatsResult.error) {
    console.error("[intelligence] watch cost stats query failed:", watchCostStatsResult.error.message, { companyId })
  }
  if (projectsResult.error) {
    console.error("[intelligence] projects query failed:", projectsResult.error.message, { companyId })
  }
  if (commercialInteractionsResult.error) {
    console.error("[intelligence] commercial interactions query failed:", commercialInteractionsResult.error.message, { companyId })
  }
  if (commercialCalendarResult.error) {
    console.error("[intelligence] commercial calendar query failed:", commercialCalendarResult.error.message, { companyId })
  }

  const company = companyResult.data
  const summary = summaryResult.data ?? null
  const results = resultsResult.data ?? []
  const metadata = asRecord(company.metadata)
  const accountWatch = normalizeAccountWatchSettings(accountWatchResult.data)

  // Le snapshot sectoriel (ADR-0012 Lot 3) et l'URL signée du PDF diagnostic
  // sont deux appels indépendants l'un de l'autre — ils étaient auparavant
  // enchaînés en deux `await` séquentiels après le Promise.all principal,
  // ajoutant deux allers-retours réseau pleins au temps de réponse de la page
  // au lieu d'un seul. Parallélisés ici (perf).
  const phase3MetaForPdf = asRecord(results.find((r) => r.result_type === "process_diagnostic")?.metadata)
  const pdfStoragePath = str(phase3MetaForPdf.pdf_storage_path)
  const pdfBucket = str(phase3MetaForPdf.pdf_bucket) || "ai_intelligence_process_diagnostics"

  const [sectorSnapshot, signedUrlOutcome] = await Promise.all([
    company.sector_id
      ? getSectorSnapshot(company.sector_id, {
          currentCompanyId: company.id,
          currentSectorAnalysis: metadata.sector_analysis,
        })
      : Promise.resolve(null),
    pdfStoragePath
      ? supabaseReal.storage.from(pdfBucket).createSignedUrl(pdfStoragePath, 3600)
      : Promise.resolve(null),
  ])

  let diagnosticPdfUrl: string | null = null
  if (signedUrlOutcome) {
    if (signedUrlOutcome.error) {
      console.error("[intelligence] createSignedUrl failed:", signedUrlOutcome.error.message, { pdfBucket, pdfStoragePath })
    }
    diagnosticPdfUrl = signedUrlOutcome.data?.signedUrl ?? null
  }

  // Source de vérité : moteur d'abord (result_type succeeded), sinon fallback
  // FOLIO. ADR-0012 D-5 : `phase` est déprécié comme clé de matching — la
  // phase 1 héberge aussi des rapports (client_summary, activity_commercial,
  // weekly_manager) qui n'ont pas la forme d'une analyse client. Matcher sur
  // `phase === 1` seul faisait passer le rapport le plus récent d'un compte
  // pour son "analyse client moteur" (bug live corrigé ici, cf. ADR-0012 Lot 1).
  //
  // Aucun résultat account_knowledge/sector_snapshot n'existe encore (Lots 2/3
  // à venir) : ces deux lookups renvoient donc undefined aujourd'hui et le
  // fallback FOLIO s'applique correctement — c'est le comportement attendu.
  const engineAccountKnowledge = results.find((r) => r.result_type === ACCOUNT_KNOWLEDGE_RESULT_TYPE)?.content_json
  const engineSectorSnapshot = results.find((r) => r.result_type === SECTOR_SNAPSHOT_RESULT_TYPE)?.content_json
  const engineProcessDiagnostic = results.find((r) => r.result_type === "process_diagnostic")?.content_json

  // FOLIO reste la seule source du contrat `AnalyseClient` (legacy) tant que
  // le workflow intel-030 n'a rien produit — `engineAccountKnowledge` a un
  // schéma différent (AccountKnowledgeContent) et est exposé séparément
  // ci-dessous via `accountKnowledge`, pas fusionné dans `client`.
  let client: ClientIntelligenceData["client"] = null
  const clientFromFolio = parseAnalyseClient(metadata.analysis_data)
  if (clientFromFolio) client = { data: clientFromFolio, source: "folio" }

  // ADR-0012 Lot 5 — result_type=commercial_strategy, content_json pur (D-5,
  // pas de matérialisation table contrairement à account_issues_map/Lot 4).
  const commercialStrategyResultRow = results.find((r) => r.result_type === COMMERCIAL_STRATEGY_RESULT_TYPE)
  let commercialStrategy: ClientIntelligenceData["commercialStrategy"] = null
  const commercialStrategyContent = parseCommercialStrategyContent(commercialStrategyResultRow?.content_json)
  if (commercialStrategyContent && commercialStrategyResultRow) {
    commercialStrategy = { data: commercialStrategyContent, resultId: commercialStrategyResultRow.id }
  }

  const accountKnowledgeResultRow = results.find((r) => r.result_type === ACCOUNT_KNOWLEDGE_RESULT_TYPE)
  let accountKnowledge: ClientIntelligenceData["accountKnowledge"] = null
  const accountKnowledgeContent = parseAccountKnowledgeContent(engineAccountKnowledge)
  if (accountKnowledgeContent && accountKnowledgeResultRow) {
    accountKnowledge = { data: accountKnowledgeContent, resultId: accountKnowledgeResultRow.id }
  }

  // Note Lot 3 : engineSectorSnapshot suivra le contrat SectorSnapshotContent
  // (sector_id/top_pain_points/...), pas la forme FOLIO — parseAnalyseSector
  // ne le parsera pas correctement une fois le Lot 3 livré. Sans effet
  // aujourd'hui : aucun résultat sector_snapshot n'existe encore.
  let sector: ClientIntelligenceData["sector"] = null
  const sectorFromEngine = parseAnalyseSector(engineSectorSnapshot)
  if (sectorFromEngine) sector = { data: sectorFromEngine, source: "engine" }
  else {
    const sectorFromFolio = parseAnalyseSector(metadata.sector_analysis)
    if (sectorFromFolio) sector = { data: sectorFromFolio, source: "folio" }
  }

  let diagnostic: ClientIntelligenceData["diagnostic"] = null
  const diagnosticFromEngine = parseAnalyseDiagnostic(engineProcessDiagnostic)
  if (diagnosticFromEngine) diagnostic = { data: diagnosticFromEngine, source: "engine" }

  const companyProfile = normalizeCompanyIdentity({
    name: company.name,
    legalName: company.legal_name,
    hqLocation: company.hq_location,
    sector: company.sector,
    segment: company.segment,
    revenue: company.revenue,
    employeeCount: company.employee_count,
    sizeBand: company.size_band,
  }, company.metadata)
  const companyPositioning = normalizeCompanyMarketPositioning(company.metadata)
  const operationalSnapshot = normalizeCompanyOperationalSnapshot(engineProcessDiagnostic)

  // Synthèse fallback : description compte si aucune analyse.
  if (client && !client.data.synthese) {
    client.data.synthese = clean(company.description, "Aucune synthèse disponible.")
  }

  const offerPracticeNameById = new Map(
    offerPracticesCatalogRows.map((practice) => [practice.id, practice.name])
  )
  const offerCandidates = offersCatalogRows.map((offer) => ({
    id: offer.id,
    name: offer.name,
    practiceName: (offer.practice_id && offerPracticeNameById.get(offer.practice_id)) ?? "",
    keywords: offer.keywords ?? [],
    typicalProfiles: offer.typical_profiles ?? [],
    shortDescription: offer.short_description,
  }))

  const contacts: ClientIntelligenceContact[] = sortCompanyContacts((contactsResult.data ?? []).map((row) => {
    const person = firstRelation(row.persons)
    const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
    const offerSuggestion = resolveContactOfferSuggestion({
      jobTitle: row.job_title,
      department: row.department,
    }, offerCandidates)
    return {
      id: row.id,
      fullName: clean(person?.full_name, fallbackName || "Contact sans nom"),
      jobTitle: row.job_title,
      relationshipRole: row.relationship_role,
      email: person?.primary_email ?? null,
      department: row.department,
      decisionPower: row.decision_power,
      relationshipLevel: row.relationship_level,
      isPriority: Boolean(row.is_priority),
      offerSuggestion,
    }
  }))

  const opportunities: ClientIntelligenceOpportunity[] = (opportunitiesResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    stage: row.stage,
    opportunityType: row.opportunity_type,
    estimatedGain: toNumber(row.estimated_gain),
    weightedGain: toNumber(row.weighted_gain),
    nextActionLabel: row.next_action_label,
    nextActionAt: row.next_action_at,
    targetCloseDate: row.target_close_date,
    closedAt: row.closed_at,
  }))

  const missions: ClientIntelligenceMission[] = (missionsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    roleTitle: row.role_title,
    practice: row.practice,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    grossMarginPct: toNumber(row.gross_margin_pct),
  }))

  const projects: ClientIntelligenceProject[] = (projectsResult.data ?? []).map((row) => {
    const engagementType = firstRelation(row.offer_engagement_types)
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      startDate: row.start_date_actual ?? row.start_date_planned,
      endDate: row.end_date_actual ?? row.end_date_planned,
      contractAmount: toNumber(row.contract_amount),
      engagementType: engagementType?.name ?? null,
      billingModel: engagementType?.billing_model ?? null,
    }
  })

  const linkedCalendarEventIds = new Set(
    (commercialInteractionsResult.data ?? []).flatMap((row) => row.calendar_event_id ? [row.calendar_event_id] : []),
  )
  const interactionTimeline: ClientIntelligenceCommercialTimelineEntry[] = (commercialInteractionsResult.data ?? []).map((row) => {
    const contact = firstRelation(row.contacts)
    const person = contact ? firstRelation(contact.persons) : null
    return {
      id: `interaction-${row.id}`,
      source: "interaction",
      nature: row.type,
      title: row.summary?.trim() || row.type,
      summary: row.next_action,
      occurredAt: row.occurred_at,
      contactName: person?.full_name ?? null,
      status: null,
    }
  })
  const calendarTimeline: ClientIntelligenceCommercialTimelineEntry[] = (commercialCalendarResult.data ?? [])
    .filter((row) => !linkedCalendarEventIds.has(row.id))
    .map((row) => {
      const contact = firstRelation(row.contacts)
      const person = contact ? firstRelation(contact.persons) : null
      return {
        id: `calendar-${row.id}`,
        source: "calendar_event",
        nature: row.event_type,
        title: row.title,
        summary: row.description,
        occurredAt: row.starts_at,
        contactName: person?.full_name ?? null,
        status: row.status,
      }
    })
  const commercialTimeline = [...interactionTimeline, ...calendarTimeline]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 24)

  const accountSignals: ClientIntelligenceSignal[] = (accountSignalsResult.data ?? [])
    .filter((row) => {
      if (DISMISSED_SIGNAL_STATUSES.has(row.status)) return false
      if (row.expires_at && new Date(row.expires_at) < new Date()) return false
      return true
    })
    // "Signaux récents" : un seul critère de tri, la fraîcheur de PARUTION
    // (published_at de la source primaire), pas la date de détection — deux
    // runs de veille rapprochés détectent le même jour un article vieux d'une
    // semaine et un du matin même, seule la date de parution les distingue.
    // Repli sur detected_at quand la source n'a pas de date (ajout manuel).
    // Trier AVANT de plafonner : un tri après slice coupe sur le mauvais
    // sous-ensemble (bug déjà rencontré sur ce même bloc).
    .sort((a, b) => {
      const freshnessA = new Date(firstRelation(a.intelligence_sources)?.published_at || a.detected_at).getTime()
      const freshnessB = new Date(firstRelation(b.intelligence_sources)?.published_at || b.detected_at).getTime()
      return freshnessB - freshnessA
    })
    .slice(0, ACCOUNT_SIGNALS_DISPLAY_LIMIT)
    .map((row) => {
      const primarySource = firstRelation(row.intelligence_sources)
      const pertinenceEsn = row.score_details?.pertinence_esn
      const fitPractice = row.score_details?.fit_practice
      // Renormalisation des poids LLM d'origine (0.35 pertinence / 0.15 fit,
      // cf. intel-033 "Compute Scores & Apply Rules") sur les deux seuls axes
      // qui définissent l'intérêt commercial. Repli sur globalScore pour les
      // signaux sans score_details (ajout manuel, cf. create-manual-signal.ts).
      const interestScore = typeof pertinenceEsn === "number" || typeof fitPractice === "number"
        ? 0.7 * (pertinenceEsn ?? 0) + 0.3 * (fitPractice ?? 0)
        : row.global_score ?? 0
      return {
        id: row.id,
        category: row.signal_category,
        type: row.signal_type,
        title: row.title,
        summary: row.summary,
        detectedAt: row.detected_at,
        lastEvidenceAt: row.last_evidence_at,
        expiresAt: row.expires_at,
        publishedAt: primarySource?.published_at ?? null,
        globalScore: row.global_score ?? 0,
        interestScore,
        urgencyScore: row.urgency_score ?? 0,
        confidenceScore: row.confidence_score ?? 0,
        status: row.status,
        primarySourceId: row.primary_source_id,
        recommendedAction: row.recommended_action,
        recommendedPracticeId: row.recommended_practice_id,
        primarySource: primarySource
          ? {
              id: primarySource.id,
              source_name: primarySource.source_name,
              source_url: primarySource.source_url,
            }
          : null,
      }
    })

  const accountIssues: ClientIntelligenceIssue[] = (accountIssuesResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    problemStatement: row.problem_statement,
    evidenceLevel: row.evidence_level,
    provenance: row.provenance,
    importance: row.importance,
    urgency: row.urgency,
    criticality: row.criticality,
    businessImpact: row.business_impact,
    accessibility: row.accessibility,
    kredoFit: row.kredo_fit,
    contactIds: row.contact_ids ?? [],
    recommendedNextProbe: row.recommended_next_probe,
    status: row.status,
    createdAt: row.created_at,
  }))

  const accountKnowledgeResultId = results.find((r) => r.result_type === ACCOUNT_KNOWLEDGE_RESULT_TYPE)?.id ?? null

  const recentDocuments: AccountRecentDocument[] = (recentDocumentsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const latestCommercialActivityRow = latestCommercialActivityResult.data
  const activityContact = latestCommercialActivityRow
    ? firstRelation(latestCommercialActivityRow.contacts)
    : null
  const activityPerson = activityContact ? firstRelation(activityContact.persons) : null
  const latestCommercialActivity: AccountCommercialActivity | null = latestCommercialActivityRow
    ? {
        id: latestCommercialActivityRow.id,
        type: latestCommercialActivityRow.type,
        occurredAt: latestCommercialActivityRow.occurred_at,
        summary: latestCommercialActivityRow.summary,
        nextAction: latestCommercialActivityRow.next_action,
        contactName: activityPerson?.full_name ?? null,
      }
    : null

  const watchSourceSettings = accountWatchResult.data
    ? {
        includeOfficialSite: accountWatchResult.data.include_official_site,
        includeNews: accountWatchResult.data.include_news,
        includePublicRecords: accountWatchResult.data.include_public_records,
        includeTenders: accountWatchResult.data.include_tenders,
        includeSocialManual: accountWatchResult.data.include_social_manual,
      }
    : DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS

  const offersCatalog: ClientIntelligenceOfferRef[] = offersCatalogRows.map((row) => ({
    id: row.id,
    name: row.name,
    practiceName: (row.practice_id && offerPracticeNameById.get(row.practice_id)) ?? "",
  }))

  return {
    error: null,
    data: {
      company: {
        id: company.id,
        name: company.name,
        sector: clean(company.sector),
        segment: clean(company.segment, "Segment non renseigné"),
        priority: company.priority,
        lifecycleStatus: company.lifecycle_status,
        legacyFolioScore: toNumber(company.legacy_folio_score),
        website: company.website,
        hqLocation: clean(company.hq_location),
        logoPath: typeof metadata.logo_path === "string" ? metadata.logo_path : null,
      },
      companyProfile,
      companyPositioning,
      operationalSnapshot,
      freshness: {
        latestRunAt: summary?.latest_run_at ?? null,
        latestRunStatus: summary?.latest_run_status ?? null,
        countRuns: summary?.count_runs ?? 0,
        countResults: summary?.count_results ?? 0,
      },
      presence: {
        hasClientAnalysis: Boolean(summary?.has_client_analysis),
        hasSectorAnalysis: Boolean(summary?.has_sector_analysis),
        hasProcessDiagnostic: Boolean(summary?.has_process_diagnostic),
        hasRoadmap: Boolean(summary?.has_roadmap),
        hasLegacyAnalysis: Boolean(summary?.has_legacy_analysis),
        hasLegacySector: Boolean(summary?.has_legacy_sector),
        hasLegacyPitches: Boolean(summary?.has_legacy_pitches),
      },
      client,
      accountKnowledge,
      sectorSnapshot,
      sector,
      diagnostic,
      diagnosticPdfUrl,
      signals: client?.data.signaux.actualitesRecentes ?? [],
      contacts,
      pitches: parsePitches(metadata.pitches),
      scoreSummary,
      opportunities,
      missions,
      projects,
      commercialTimeline,
      accountSignals,
      accountWatch,
      recentDocuments,
      latestCommercialActivity,
      accountWatchOverview: {
        capturedSignalsCount: capturedSignalsCountResult.count ?? 0,
        monitoredSourceLabels: getMonitoredSourceLabels(watchSourceSettings),
        averageCostPerRun: toNumber(watchCostStatsResult.data?.avg_cost_all_time ?? null),
      },
      accountIssues,
      commercialStrategy,
      offersCatalog,
      accountKnowledgeResultId,
      pitchDocuments: ((pitchDocumentsResult.data ?? []) as PitchDocumentRow[]).map((row) => {
        const content = asRecord(row.current_content_json)
        const kind = content.kind === "spoken_pitch" || content.kind === "meeting_briefing" ? content.kind : null
        return {
          id: row.id,
          title: row.title,
          status: row.status,
          kind,
          createdAt: row.created_at,
        }
      }),
    },
  }
}
