import { createClient } from "@/lib/supabase/server"
import { getAccountScoreSummary, type AccountScoreSummaryView } from "@/lib/account-scoring/get-account-score-summary"
import {
  ACCOUNT_KNOWLEDGE_RESULT_TYPE,
  SECTOR_SNAPSHOT_RESULT_TYPE,
  type AccountKnowledgeContent,
  type AccountIssueCategory,
  type AccountIssueEvidenceLevel,
  type AccountIssueStatus,
  type IntelligenceProvenance,
} from "@/lib/intelligence/account-intelligence-contracts"
import { getSectorSnapshot, type SectorSnapshotView } from "@/lib/intelligence/sector-snapshot-data"

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

export type ClientIntelligenceSignal = {
  id: string
  category: string | null
  type: string | null
  title: string
  summary: string | null
  detectedAt: string
  expiresAt: string | null
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
  accountSignals: ClientIntelligenceSignal[]
  // ADR-0012 Lot 4 — enjeux ouverts (table account_issues, spine matérialisée)
  accountIssues: ClientIntelligenceIssue[]
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
  eq(column: string, value: string): LooseQuery<T>
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
  sector: string | null
  sector_id: string | null
  segment: string | null
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

type AccountSignalRow = {
  id: string
  signal_category: string | null
  signal_type: string | null
  title: string
  summary: string | null
  status: string
  detected_at: string
  expires_at: string | null
}

const DISMISSED_SIGNAL_STATUSES = new Set(["dismissed", "false_positive", "expired", "archived"])

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

  const [
    companyResult,
    summaryResult,
    resultsResult,
    contactsResult,
    pitchDocumentsResult,
    scoreSummary,
    opportunitiesResult,
    missionsResult,
    accountSignalsResult,
    accountIssuesResult,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select<CompanyRow>(
        "id,name,sector,sector_id,segment,priority,lifecycle_status,legacy_folio_score,website,hq_location,description,metadata",
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
    supabase
      .from("ai_intelligence_results")
      .select<ResultRow>("id,phase,result_type,content_json,metadata,created_at")
      .eq("company_id", companyId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false }),
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
      .eq("document_type", "commercial_pitch")
      .eq("primary_entity_type", "company")
      .eq("primary_entity_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    getAccountScoreSummary(companyId),
    supabase
      .from("opportunities")
      .select<OpportunityRow>(
        "id,title,stage,opportunity_type,estimated_gain,weighted_gain,next_action_label,next_action_at,closed_at",
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
    supabase
      .from("account_signals")
      .select<AccountSignalRow>("id,signal_category,signal_type,title,summary,status,detected_at,expires_at")
      .eq("company_id", companyId)
      .order("detected_at", { ascending: false })
      .limit(15),
    supabase
      .from("account_issues")
      .select<AccountIssueRow>(
        "id,title,category,problem_statement,evidence_level,provenance,importance,urgency,criticality,business_impact,accessibility,kredo_fit,contact_ids,recommended_next_probe,status,created_at",
      )
      .eq("company_id", companyId)
      .eq("status", "open")
      .order("importance", { ascending: false }),
  ])

  if (companyResult.error) return { error: companyResult.error.message, data: null }
  if (!companyResult.data) return { error: "Compte introuvable", data: null }

  const company = companyResult.data
  const summary = summaryResult.data ?? null
  const results = resultsResult.data ?? []
  const metadata = asRecord(company.metadata)

  // ADR-0012 Lot 3 — snapshot sectoriel déterministe, seulement si le compte a
  // un sector_id (backfill honnête, ~27/95 comptes couverts au 2026-07-07).
  const sectorSnapshot = company.sector_id ? await getSectorSnapshot(company.sector_id) : null

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

  // Signed URL pour le PDF source (bucket privé, valide 1h)
  let diagnosticPdfUrl: string | null = null
  const phase3Meta = asRecord(results.find((r) => r.result_type === "process_diagnostic")?.metadata)
  const pdfStoragePath = str(phase3Meta.pdf_storage_path)
  const pdfBucket = str(phase3Meta.pdf_bucket) || "ai_intelligence_process_diagnostics"
  if (pdfStoragePath) {
    const { data: signedData, error: signedError } = await supabaseReal.storage
      .from(pdfBucket)
      .createSignedUrl(pdfStoragePath, 3600)
    if (signedError) console.error("[intelligence] createSignedUrl failed:", signedError.message, { pdfBucket, pdfStoragePath })
    diagnosticPdfUrl = signedData?.signedUrl ?? null
  }

  // Synthèse fallback : description compte si aucune analyse.
  if (client && !client.data.synthese) {
    client.data.synthese = clean(company.description, "Aucune synthèse disponible.")
  }

  const contacts: ClientIntelligenceContact[] = (contactsResult.data ?? []).map((row) => {
    const person = firstRelation(row.persons)
    const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
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
    }
  })

  const opportunities: ClientIntelligenceOpportunity[] = (opportunitiesResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    stage: row.stage,
    opportunityType: row.opportunity_type,
    estimatedGain: toNumber(row.estimated_gain),
    weightedGain: toNumber(row.weighted_gain),
    nextActionLabel: row.next_action_label,
    nextActionAt: row.next_action_at,
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

  const accountSignals: ClientIntelligenceSignal[] = (accountSignalsResult.data ?? [])
    .filter((row) => {
      if (DISMISSED_SIGNAL_STATUSES.has(row.status)) return false
      if (row.expires_at && new Date(row.expires_at) < new Date()) return false
      return true
    })
    .map((row) => ({
      id: row.id,
      category: row.signal_category,
      type: row.signal_type,
      title: row.title,
      summary: row.summary,
      detectedAt: row.detected_at,
      expiresAt: row.expires_at,
    }))

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
      accountSignals,
      accountIssues,
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
