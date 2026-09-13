import "server-only"

// ─── Couche Data : Distribution contrôlée du Source Corpus Work (Lot 3) ───────
//
// 1. `prepareWorkSourceDistribution` : lecture seule défensive depuis Storage + DB,
//    re-vérification d'empreinte SHA-256 du fichier original, extraction des
//    autorités candidates et dédoublonnage par hostname contre le catalogue existant.
// 2. `distributeWorkStudySources` : confirmation d'arbitrage utilisateur, validation
//    stricte serveur sans faire confiance au navigateur, assemblage du payload
//    et appel à `ingestSourceCorpusAction(..., scopeKind='account')`.

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"

import {
  ingestSourceCorpusAction,
  type IngestSourceCorpusResult,
} from "@/features/source-management/actions/ingest-source-corpus"
import {
  buildAccountIngestCorpusPayload,
  extractWorkAuthorityCandidates,
  type AccountSourceArbitration,
  type AccountSourceCorpusPreparation,
  type CatalogLookupEntry,
} from "@/features/source-management/domain/account-source-corpus"
import {
  normalizeHostname,
  type KredoSourceCategory,
  type SourceContentTemporality,
  type SourceOrigin,
} from "@/features/source-management/domain/source-management-contracts"

import { STUDY_STORAGE_BUCKET } from "../domain/study-contracts"
import { parseWorkSourceCorpus } from "../domain/work-study-parser"
import { getStudyServiceClient, loadStudyCompany, requireStudyActor } from "./study-server"

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

type StudyExtractionSourceCorpus = {
  path: string
  file_name: string
  bytes: number
  sha256: string
}

function parseSourceCorpusExtraction(raw: unknown): StudyExtractionSourceCorpus | null {
  if (typeof raw !== "object" || raw === null) return null
  const obj = raw as Record<string, unknown>
  const sc = obj.source_corpus
  if (typeof sc !== "object" || sc === null) return null
  const scObj = sc as Record<string, unknown>
  if (
    typeof scObj.path !== "string" ||
    typeof scObj.file_name !== "string" ||
    typeof scObj.bytes !== "number" ||
    typeof scObj.sha256 !== "string"
  ) {
    return null
  }
  return {
    path: scObj.path,
    file_name: scObj.file_name,
    bytes: scObj.bytes,
    sha256: scObj.sha256,
  }
}

/**
 * Charge l'index hostname -> catalogue existant pour le workspace de l'acteur.
 */
async function loadCatalogLookupByHostname(
  supabase: ReturnType<typeof getStudyServiceClient>,
  workspaceId: string,
): Promise<Map<string, CatalogLookupEntry>> {
  const { data: rows, error } = await supabase
    .from("source_catalog")
    .select("id, source_key, origin, is_locked, name, domain, search_domain, collection_url, homepage_url, family, kredo_category, content_temporality, usage_scopes")
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(`Impossible de lire le catalogue de sources : ${error.message}`)
  }

  const lookup = new Map<string, CatalogLookupEntry>()
  for (const row of rows ?? []) {
    const entry: CatalogLookupEntry = {
      id: row.id,
      sourceKey: row.source_key,
      origin: row.origin as SourceOrigin,
      isLocked: row.is_locked,
      name: row.name,
      domain: row.domain,
      searchDomain: row.search_domain,
      collectionUrl: row.collection_url,
      homepageUrl: row.homepage_url,
      family: row.family,
      kredoCategory: row.kredo_category as KredoSourceCategory | null,
      contentTemporality: row.content_temporality as SourceContentTemporality | null,
      usageScopes: row.usage_scopes,
    }

    for (const raw of [row.domain, row.search_domain]) {
      if (!raw) continue
      const normalized = normalizeHostname(raw) ?? raw.trim().toLowerCase()
      if (!lookup.has(normalized)) {
        lookup.set(normalized, entry)
      }
    }
  }

  return lookup
}

/**
 * Télécharge et valide l'empreinte SHA-256 du fichier original `source-corpus.json`.
 */
async function downloadAndVerifyOriginalSourceCorpus(params: {
  service: ReturnType<typeof getStudyServiceClient>
  storagePath: string
  expectedSha256: string
}) {
  const { service, storagePath, expectedSha256 } = params
  const downloadRes = await service.storage.from(STUDY_STORAGE_BUCKET).download(storagePath)
  if (downloadRes.error || !downloadRes.data) {
    throw new Error(`Fichier source-corpus.json introuvable dans Storage : ${downloadRes.error?.message ?? "données vides"}`)
  }

  const bytes = new Uint8Array(await downloadRes.data.arrayBuffer())
  const calculatedSha = sha256(bytes)
  if (calculatedSha !== expectedSha256) {
    throw new Error(
      `Altération détectée : le SHA-256 du fichier téléchargé (${calculatedSha}) ne correspond pas à l'empreinte originale certifiée (${expectedSha256}).`,
    )
  }

  const text = new TextDecoder("utf-8").decode(bytes)
  const parsed = parseWorkSourceCorpus(text)
  if (!parsed.ok) {
    const reasons = parsed.issues.map((i) => i.message).join(" · ")
    throw new Error(`Parsing du Source Corpus Work impossible : ${reasons}`)
  }

  return {
    sourceCorpusData: parsed.data,
    bytes,
    text,
  }
}

/**
 * Prépare la distribution en bibliothèque (lecture seule).
 * Ne fait confiance à aucune donnée transmise par le client.
 */
export async function prepareWorkSourceDistribution(
  studyId: string,
): Promise<AccountSourceCorpusPreparation> {
  const actor = await requireStudyActor()
  const { data: study, error: studyError } = await actor.supabase
    .from("account_research_studies")
    .select("id, workspace_id, company_id, title, producer, status, created_at, extraction")
    .eq("id", studyId)
    .maybeSingle()

  if (studyError || !study) {
    throw new Error("Étude de recherche compte introuvable.")
  }
  if (study.workspace_id !== actor.workspaceId) {
    throw new Error("Cette étude n'appartient pas à votre workspace.")
  }
  if (study.producer !== "chatgpt_work") {
    throw new Error("La distribution des sources Work n'est autorisée que pour les études issues de ChatGPT Work.")
  }
  if (study.status !== "ready") {
    throw new Error(`L'étude doit être au statut 'ready' (actuel : ${study.status}).`)
  }

  const extractionMeta = parseSourceCorpusExtraction(study.extraction)
  if (!extractionMeta) {
    throw new Error("Métadonnées d'archivage du source-corpus.json absentes de l'étude.")
  }

  const company = await loadStudyCompany(actor.supabase, study.company_id)
  if (!company) {
    throw new Error("Compte d'entreprise introuvable.")
  }

  const service = getStudyServiceClient()
  const { sourceCorpusData } = await downloadAndVerifyOriginalSourceCorpus({
    service,
    storagePath: extractionMeta.path,
    expectedSha256: extractionMeta.sha256,
  })

  // Vérification de la présence d'un corpus existant lié à cette étude
  const { data: existingCorpus } = await actor.supabase
    .from("source_corpora")
    .select("id")
    .eq("workspace_id", actor.workspaceId)
    .eq("study_id", study.id)
    .eq("scope_kind", "account")
    .maybeSingle()

  const catalogLookup = await loadCatalogLookupByHostname(service, actor.workspaceId)
  const candidates = extractWorkAuthorityCandidates(sourceCorpusData, catalogLookup)

  const totalDocuments = candidates.reduce((sum, c) => sum + c.documentsCount, 0)
  const existingCount = candidates.filter((c) => !c.isNewSource).length
  const newCount = candidates.filter((c) => c.isNewSource).length

  return {
    studyId: study.id,
    companyId: company.id,
    companyName: company.name,
    studyTitle: study.title,
    snapshotDate: study.created_at.slice(0, 10),
    schemaVersion: sourceCorpusData.schema_version ?? 1,
    candidates,
    totalAuthorities: candidates.length,
    totalDocuments,
    existingCount,
    newCount,
    isAlreadyDistributed: Boolean(existingCorpus),
    existingCorpusId: existingCorpus?.id ?? null,
  }
}

export type DistributeWorkStudySourcesInput = {
  studyId: string
  arbitrations: AccountSourceArbitration[]
  reason?: string
}

/**
 * Exécute la distribution confirmée des autorités Work vers la bibliothèque de sources.
 * Re-télécharge et re-valide le fichier original côté serveur avant d'écrire via la RPC.
 */
export async function distributeWorkStudySources(
  input: DistributeWorkStudySourcesInput,
): Promise<IngestSourceCorpusResult> {
  const { studyId, arbitrations, reason = "Distribution des sources ChatGPT Work en bibliothèque" } = input

  const actor = await requireStudyActor()
  const { data: study, error: studyError } = await actor.supabase
    .from("account_research_studies")
    .select("id, workspace_id, company_id, title, producer, status, created_at, extraction")
    .eq("id", studyId)
    .maybeSingle()

  if (studyError || !study) {
    throw new Error("Étude de recherche compte introuvable.")
  }
  if (study.workspace_id !== actor.workspaceId) {
    throw new Error("Cette étude n'appartient pas à votre workspace.")
  }
  if (study.producer !== "chatgpt_work") {
    throw new Error("La distribution des sources Work n'est autorisée que pour les études issues de ChatGPT Work.")
  }
  if (study.status !== "ready") {
    throw new Error(`L'étude doit être au statut 'ready' (actuel : ${study.status}).`)
  }

  const extractionMeta = parseSourceCorpusExtraction(study.extraction)
  if (!extractionMeta) {
    throw new Error("Métadonnées d'archivage du source-corpus.json absentes de l'étude.")
  }

  const company = await loadStudyCompany(actor.supabase, study.company_id)
  if (!company) {
    throw new Error("Compte d'entreprise introuvable.")
  }

  const service = getStudyServiceClient()
  const { sourceCorpusData } = await downloadAndVerifyOriginalSourceCorpus({
    service,
    storagePath: extractionMeta.path,
    expectedSha256: extractionMeta.sha256,
  })

  const catalogLookup = await loadCatalogLookupByHostname(service, actor.workspaceId)
  const candidates = extractWorkAuthorityCandidates(sourceCorpusData, catalogLookup)

  // Construction déterministe et sécurisée du payload d'ingestion
  const payload = buildAccountIngestCorpusPayload({
    studyId: study.id,
    companyId: company.id,
    companyName: company.name,
    studyTitle: study.title,
    snapshotDate: study.created_at.slice(0, 10),
    schemaVersion: sourceCorpusData.schema_version ?? 1,
    candidates,
    arbitrations,
    sourceFileName: extractionMeta.file_name,
    sourceFileHash: extractionMeta.sha256,
    reason,
  })

  // Appel de l'unique chemin d'écriture sécurisé
  const result = await ingestSourceCorpusAction(payload, null, reason, "account")

  if (!result.error) {
    revalidatePath("/veille")
    revalidatePath(`/comptes/${company.id}`)
  }

  return result
}
