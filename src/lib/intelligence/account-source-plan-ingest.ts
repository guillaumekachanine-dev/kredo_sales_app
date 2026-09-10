// ─── Portail d'entrée applicatif d'un plan de sources (INTEL-035, Lot 0) ────
//
// Doctrine ADR-0020 appliquée ici : le métier vit en TypeScript, n8n est un exécuteur.
// Le workflow ne fait qu'UNE chose — découvrir, récupérer, extraire — et transmet ce
// qu'il a lu. C'est ce module qui écrit `account_source_documents`, construit les
// entrées du plan avec leurs identifiants réels et calcule la couverture.
//
// Ce que ce module garantit, et que ni le workflow ni la table ne garantissent seuls :
//   1. Le workspace et le compte écrits sont ceux du RUN, jamais ceux que le payload
//      prétend. Le workflow tourne en service_role : sans ce reparentage, un plan
//      pourrait rattacher des documents au compte d'un autre tenant.
//   2. Un document annoncé `retrieved` sans texte est refusé AVANT l'insert — la
//      contrainte `asd_lu_ou_injoignable` le rejetterait de toute façon, mais avec une
//      erreur Postgres opaque au lieu d'un motif lisible.
//   3. Les modules déclarés sont des identifiants canoniques. Un libellé d'interface
//      est ignoré plutôt que stocké : c'est la régression V3 (`SUBJECT_TO_SEGMENTS`
//      indexé sur des chaînes françaises) qu'on refuse de rejouer.
//   4. La déduplication par `content_hash` est appliquée AVANT l'insert, sinon l'index
//      unique fait échouer tout le lot pour un doublon.
//   5. `coverage` est recalculé depuis ce qui a réellement été écrit, jamais recopié
//      depuis n8n — le producteur ne s'auto-évalue pas.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import {
  isAccountIntelligenceModule,
  type AccountIntelligenceLevel,
  type AccountIntelligenceModule,
} from "./account-intelligence-modules"
import {
  ACCOUNT_SOURCE_PLAN_SCHEMA_VERSION,
  SOURCE_KINDS,
  SOURCE_ORIGINS,
  type AccountSourcePlanContent,
  type AccountSourcePlanCorpus,
  type AccountSourcePlanEntry,
  type SourceKind,
  type SourceOrigin,
} from "./account-source-plan-contracts"

/** Ce que le workflow transmet pour un document tenté. */
export type IncomingSourceDocument = {
  url?: unknown
  canonical_url?: unknown
  domain?: unknown
  title?: unknown
  published_at?: unknown
  kind?: unknown
  serves_modules?: unknown
  reason?: unknown
  origin?: unknown
  status?: unknown
  fetched_at?: unknown
  http_status?: unknown
  collection_method?: unknown
  content_hash?: unknown
  extracted_text?: unknown
  extracted_chars?: unknown
  failure_reason?: unknown
}

export type AccountSourcePlanIngestInput = {
  runId: string
  workspaceId: string
  companyId: string
  targetLevel: AccountIntelligenceLevel
  requestedModules: AccountIntelligenceModule[]
  entityResolution: unknown
  corpora?: AccountSourcePlanCorpus[]
  documents: IncomingSourceDocument[]
}

export type AccountSourcePlanIngestResult =
  | { ok: true; content: AccountSourcePlanContent; rejected: RejectedDocument[] }
  | { ok: false; error: string; rejected: RejectedDocument[] }

export type RejectedDocument = { url: string; reason: string }

const MAX_EXTRACTED_CHARS = 20_000

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

function normalizeModules(value: unknown): AccountIntelligenceModule[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<AccountIntelligenceModule>()
  for (const entry of value) {
    if (typeof entry === "string" && isAccountIntelligenceModule(entry)) seen.add(entry)
  }
  return [...seen]
}

/**
 * Normalise un document entrant. Retourne `null` avec un motif plutôt qu'une exception :
 * un document mal formé ne doit pas faire échouer le plan entier — il doit être VISIBLE
 * comme rejeté, ce qui est la même exigence que pour un document injoignable.
 */
function normalizeDocument(
  raw: IncomingSourceDocument
): { row: NormalizedDocument } | { reject: RejectedDocument } {
  const url = asString(raw.url)
  if (!url) return { reject: { url: "(sans url)", reason: "URL absente" } }

  const domain = asString(raw.domain) ?? safeDomain(url)
  if (!domain) return { reject: { url, reason: "Domaine indéterminable" } }

  const kind = asString(raw.kind)
  if (!kind || !(SOURCE_KINDS as readonly string[]).includes(kind)) {
    return { reject: { url, reason: `Type de source inconnu : ${kind ?? "absent"}` } }
  }

  const origin = asString(raw.origin)
  if (!origin || !(SOURCE_ORIGINS as readonly string[]).includes(origin)) {
    return { reject: { url, reason: `Origine inconnue : ${origin ?? "absente"}` } }
  }

  const status = asString(raw.status)
  if (status !== "retrieved" && status !== "unreachable") {
    return { reject: { url, reason: `Statut hors contrat : ${status ?? "absent"}` } }
  }

  const base = {
    url,
    canonical_url: asString(raw.canonical_url),
    domain,
    title: asString(raw.title),
    published_at: asString(raw.published_at),
    kind: kind as SourceKind,
    serves_modules: normalizeModules(raw.serves_modules),
    reason: asString(raw.reason),
    origin: origin as SourceOrigin,
    http_status: asInteger(raw.http_status),
    collection_method: asString(raw.collection_method),
  }

  if (status === "unreachable") {
    const failureReason = asString(raw.failure_reason)
    if (!failureReason) {
      return { reject: { url, reason: "Document injoignable sans motif — un échec s'explique" } }
    }
    return {
      row: {
        ...base,
        status: "unreachable",
        fetched_at: null,
        content_hash: null,
        extracted_text: null,
        extracted_chars: null,
        failure_reason: failureReason,
      },
    }
  }

  // A2 — « retrieved » signifie lu. On refuse ici plutôt que de laisser la contrainte
  // CHECK produire une erreur Postgres illisible dans les logs du callback.
  const extractedText = asString(raw.extracted_text)
  const contentHash = asString(raw.content_hash)
  const fetchedAt = asString(raw.fetched_at)
  if (!extractedText || !contentHash || !fetchedAt) {
    return { reject: { url, reason: "Annoncé récupéré sans texte, hash ou date de lecture" } }
  }

  const truncated = extractedText.slice(0, MAX_EXTRACTED_CHARS)
  return {
    row: {
      ...base,
      status: "retrieved",
      fetched_at: fetchedAt,
      content_hash: contentHash,
      extracted_text: truncated,
      extracted_chars: truncated.length,
      failure_reason: null,
    },
  }
}

type NormalizedDocument = {
  url: string
  canonical_url: string | null
  domain: string
  title: string | null
  published_at: string | null
  kind: SourceKind
  serves_modules: AccountIntelligenceModule[]
  reason: string | null
  origin: SourceOrigin
  status: "retrieved" | "unreachable"
  fetched_at: string | null
  http_status: number | null
  collection_method: string | null
  content_hash: string | null
  extracted_text: string | null
  extracted_chars: number | null
  failure_reason: string | null
}

function safeDomain(url: string): string | null {
  const match = url.match(/^https?:\/\/([^/?#:]+)/i)
  return match ? match[1].toLowerCase().replace(/^www\./, "") : null
}

/**
 * Déduplication avant insert. L'index unique `(run_id, content_hash)` ferait échouer
 * l'insert entier pour un seul doublon — or deux URL distinctes rendant le même contenu
 * est un cas NORMAL (page canonique et sa variante imprimable, par exemple).
 * On garde la première occurrence et on signale les suivantes.
 */
export function dedupeByContentHash(
  rows: NormalizedDocument[]
): { kept: NormalizedDocument[]; duplicates: RejectedDocument[] } {
  const seenHashes = new Set<string>()
  const seenUrls = new Set<string>()
  const kept: NormalizedDocument[] = []
  const duplicates: RejectedDocument[] = []

  for (const row of rows) {
    if (seenUrls.has(row.url)) {
      duplicates.push({ url: row.url, reason: "URL déjà présente dans ce plan" })
      continue
    }
    if (row.content_hash && seenHashes.has(row.content_hash)) {
      duplicates.push({ url: row.url, reason: "Contenu identique à une source déjà retenue" })
      continue
    }
    seenUrls.add(row.url)
    if (row.content_hash) seenHashes.add(row.content_hash)
    kept.push(row)
  }
  return { kept, duplicates }
}

/** Construit les entrées du plan à partir des lignes réellement écrites. */
export function buildPlanEntries(
  written: Array<NormalizedDocument & { id: string }>
): AccountSourcePlanEntry[] {
  return written.map((row) => ({
    id: row.id,
    url: row.url,
    canonical_url: row.canonical_url,
    domain: row.domain,
    kind: row.kind,
    title: row.title,
    published_at: row.published_at,
    reason: row.reason ?? "",
    serves_modules: row.serves_modules,
    // Un document lu arrive `recommended` : l'utilisateur décide ensuite.
    // Un document injoignable ne peut jamais devenir approuvé.
    status: row.status === "unreachable" ? "unreachable" : "recommended",
    origin: row.origin,
    fetched_at: row.fetched_at,
    content_hash: row.content_hash,
    extracted_chars: row.extracted_chars,
    failure_reason: row.failure_reason,
  }))
}

/** Couverture recalculée depuis ce qui a été écrit — jamais recopiée du producteur. */
export function computeCoverage(
  entries: AccountSourcePlanEntry[],
  requestedModules: AccountIntelligenceModule[]
): { modules_with_material: AccountIntelligenceModule[]; modules_without_material: AccountIntelligenceModule[] } {
  const served = new Set<AccountIntelligenceModule>()
  for (const entry of entries) {
    if (entry.status === "unreachable") continue
    for (const moduleId of entry.serves_modules) served.add(moduleId)
  }
  return {
    modules_with_material: requestedModules.filter((moduleId) => served.has(moduleId)),
    modules_without_material: requestedModules.filter((moduleId) => !served.has(moduleId)),
  }
}

export async function ingestAccountSourcePlan(
  supabase: SupabaseClient<Database>,
  input: AccountSourcePlanIngestInput
): Promise<AccountSourcePlanIngestResult> {
  const rejected: RejectedDocument[] = []
  const normalized: NormalizedDocument[] = []

  for (const raw of input.documents ?? []) {
    const outcome = normalizeDocument(raw)
    if ("reject" in outcome) rejected.push(outcome.reject)
    else normalized.push(outcome.row)
  }

  const { kept, duplicates } = dedupeByContentHash(normalized)
  rejected.push(...duplicates)

  if (kept.length === 0) {
    return {
      ok: false,
      error: "Aucun document exploitable : le plan de sources n'est pas publiable.",
      rejected,
    }
  }

  // Reparentage systématique — le workspace et le compte viennent du RUN.
  const rows = kept.map((row) => ({
    ...row,
    workspace_id: input.workspaceId,
    run_id: input.runId,
    company_id: input.companyId,
  }))

  const { data, error } = await supabase
    .from("account_source_documents")
    .insert(rows)
    .select("id, url")

  if (error) {
    return { ok: false, error: `Écriture des documents refusée : ${error.message}`, rejected }
  }

  const idByUrl = new Map((data ?? []).map((row) => [row.url, row.id]))
  const written = kept
    .map((row) => {
      const id = idByUrl.get(row.url)
      return id ? { ...row, id } : null
    })
    .filter((row): row is NormalizedDocument & { id: string } => row !== null)

  const entries = buildPlanEntries(written)

  return {
    ok: true,
    rejected,
    content: {
      schema_version: ACCOUNT_SOURCE_PLAN_SCHEMA_VERSION,
      company_id: input.companyId,
      entity_resolution: input.entityResolution as never,
      scope: {
        target_level: input.targetLevel,
        modules: input.requestedModules,
      },
      entries,
      corpora: input.corpora ?? [],
      coverage: computeCoverage(entries, input.requestedModules),
      generated_at: new Date().toISOString(),
    },
  }
}
