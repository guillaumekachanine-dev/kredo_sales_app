import { createClient } from "@/lib/supabase/server"

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
}

export type ClientIntelligenceData = {
  company: {
    id: string
    name: string
    sector: string
    segment: string
    priority: string
    lifecycleStatus: string
    aiScore: number | null
    website: string | null
    hqLocation: string
    logoPath: string | null
  }
  freshness: {
    latestRunAt: string | null
    latestRunStatus: string | null
    countRuns: number
    countResults: number
  }
  presence: ClientIntelligencePresence
  client: { data: AnalyseClient; source: IntelligenceSource } | null
  sector: { data: AnalyseSector; source: IntelligenceSource } | null
  signals: string[]
  contacts: ClientIntelligenceContact[]
  pitches: LegacyPitch[]
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
  segment: string | null
  priority: string
  lifecycle_status: string
  ai_score: number | string | null
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
  phase: number
  result_type: string
  content_json: unknown
  created_at: string
}

type ContactRow = {
  id: string
  job_title: string | null
  relationship_role: string | null
  persons: { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }
    | { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }[]
    | null
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

  const supabase = (await createClient()) as unknown as LooseClient

  const [companyResult, summaryResult, resultsResult, contactsResult] = await Promise.all([
    supabase
      .from("companies")
      .select<CompanyRow>(
        "id,name,sector,segment,priority,lifecycle_status,ai_score,website,hq_location,description,metadata",
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
      .select<ResultRow>("phase,result_type,content_json,created_at")
      .eq("company_id", companyId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select<ContactRow>("id,job_title,relationship_role,persons(full_name,first_name,last_name,primary_email)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  if (companyResult.error) return { error: companyResult.error.message, data: null }
  if (!companyResult.data) return { error: "Compte introuvable", data: null }

  const company = companyResult.data
  const summary = summaryResult.data ?? null
  const results = resultsResult.data ?? []
  const metadata = asRecord(company.metadata)

  // Source de vérité : moteur d'abord (phase succeeded), sinon fallback FOLIO.
  const enginePhase1 = results.find((r) => r.phase === 1)?.content_json
  const enginePhase2 = results.find((r) => r.phase === 2)?.content_json

  let client: ClientIntelligenceData["client"] = null
  const clientFromEngine = parseAnalyseClient(enginePhase1)
  if (clientFromEngine) client = { data: clientFromEngine, source: "engine" }
  else {
    const clientFromFolio = parseAnalyseClient(metadata.analysis_data)
    if (clientFromFolio) client = { data: clientFromFolio, source: "folio" }
  }

  let sector: ClientIntelligenceData["sector"] = null
  const sectorFromEngine = parseAnalyseSector(enginePhase2)
  if (sectorFromEngine) sector = { data: sectorFromEngine, source: "engine" }
  else {
    const sectorFromFolio = parseAnalyseSector(metadata.sector_analysis)
    if (sectorFromFolio) sector = { data: sectorFromFolio, source: "folio" }
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
    }
  })

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
        aiScore: toNumber(company.ai_score),
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
      sector,
      signals: client?.data.signaux.actualitesRecentes ?? [],
      contacts,
      pitches: parsePitches(metadata.pitches),
    },
  }
}
