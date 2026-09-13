// ─── Contrat de domaine : Corpus de compte ChatGPT Work (Lot 3) ──────────────
//
// Format d'entrée supplémentaire pour la bibliothèque Gestion des sources.
// Permet de projeter un Source Corpus issu de ChatGPT Work en candidats d'autorités,
// de dédoublonner par nom d'hôte contre `source_catalog`, d'arbitrer les nouvelles
// sources (catégorie Kredo, temporalité) et d'assembler le payload pour la RPC
// `public.ingest_source_corpus` (scopeKind = 'account').
//
// Module PUR : aucune dépendance Supabase ni I/O.

import {
  isKredoSourceCategory,
  normalizeHostname,
  KREDO_SOURCE_CATEGORY_LABELS,
  type KredoSourceCategory,
  type SourceContentTemporality,
  type SourceOrigin,
} from "./source-management-contracts"
import {
  type ExistingSourceMatch,
  type IngestSourceCorpusPayload,
  type IngestSourceCorpusSourceItem,
} from "./source-registry-output"

/**
 * Normalise une catégorie Kredo depuis son identifiant ou son libellé humain.
 */
export function normalizeKredoCategory(value: string | null | undefined): KredoSourceCategory | null {
  if (!value) return null
  const trimmed = value.trim()
  if (isKredoSourceCategory(trimmed)) return trimmed
  for (const [key, label] of Object.entries(KREDO_SOURCE_CATEGORY_LABELS)) {
    if (label.toLowerCase() === trimmed.toLowerCase()) {
      return key as KredoSourceCategory
    }
  }
  return null
}

export type WorkCorpusDocumentUsed = {
  sourceRef?: string
  source_ref?: string
  title?: string
  url: string
  publishedAt?: string | null
  published_at?: string | null
  consultedAt?: string | null
  consulted_at?: string | null
  usedInSections?: string[]
  used_in_sections?: string[]
}

export type WorkCorpusSourceInput = {
  name: string
  domain: string
  publisher?: string | null
  sourceType?: string | null
  source_type?: string | null
  description?: string | null
  informationTypes?: string[]
  information_types?: string[]
  primaryLanguage?: string | null
  primary_language?: string | null
  primaryGeography?: string | null
  primary_geography?: string | null
  confidence?: number | null
  documentsUsed?: WorkCorpusDocumentUsed[]
  documents_used?: WorkCorpusDocumentUsed[]
}

export type WorkSourceCorpusData = {
  schemaVersion?: number
  schema_version?: number
  corpus?: {
    name?: string
    accountName?: string
    account_name?: string
    scope?: string
    geography?: string
    generatedAt?: string
    generated_at?: string
  }
  sources: WorkCorpusSourceInput[]
}

export type CatalogLookupEntry = {
  id: string
  sourceKey: string
  origin: SourceOrigin
  isLocked: boolean
  name: string
  domain: string | null
  searchDomain: string | null
  collectionUrl?: string | null
  homepageUrl?: string | null
  family?: string | null
  kredoCategory?: KredoSourceCategory | null
  contentTemporality?: SourceContentTemporality | null
  usageScopes?: string[] | null
}

export type AccountCorpusAuthorityCandidate = {
  name: string
  publisher: string | null
  domain: string
  searchDomain: string
  sourceType: string
  documentsCount: number
  documentsUsed: WorkCorpusDocumentUsed[]
  confidence: number | null
  existingMatch: ExistingSourceMatch | null
  isNewSource: boolean
  existingCategory: KredoSourceCategory | null
  existingTemporality: SourceContentTemporality | null
  existingUsageScopes: string[]
  existingCollectionUrl: string | null
  existingHomepageUrl: string | null
}

export type AccountSourceArbitration = {
  domain: string
  selected: boolean
  kredoCategory?: KredoSourceCategory
  contentTemporality?: SourceContentTemporality
}

export type AccountSourceCorpusPreparation = {
  studyId: string
  companyId: string
  companyName: string
  studyTitle: string
  snapshotDate: string
  schemaVersion: number
  candidates: AccountCorpusAuthorityCandidate[]
  totalAuthorities: number
  totalDocuments: number
  existingCount: number
  newCount: number
  isAlreadyDistributed: boolean
  existingCorpusId: string | null
}

/**
 * Normalise un fragment pour un slug URL stable.
 */
export function slugifyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

/**
 * Slug canonique du corpus compte — stable pour une même entreprise.
 */
export function buildAccountCorpusSlug(company: { id: string; name: string }): string {
  const base = slugifyPart(company.name) || "compte"
  return `sources-compte-${base}-${company.id.slice(0, 8).toLowerCase()}`
}

/**
 * Version déterministe reliant l'étude précise.
 */
export function buildAccountCorpusVersion(studyId: string, snapshotDate: string): string {
  const dateStr = snapshotDate.replace(/[^0-9]/g, "").slice(0, 8) || "20260913"
  return `work-${dateStr}-${studyId.slice(0, 8).toLowerCase()}`
}

/**
 * Extrait et regroupe les autorités candidates à partir du Source Corpus Work,
 * en dédoublonnant strictement par nom d'hôte normalisé et en résolvant
 * les correspondances du catalogue.
 */
export function extractWorkAuthorityCandidates(
  sourceCorpus: WorkSourceCorpusData,
  catalogByHostname: Map<string, CatalogLookupEntry>,
): AccountCorpusAuthorityCandidate[] {
  const candidatesByDomain = new Map<string, AccountCorpusAuthorityCandidate>()

  for (const src of sourceCorpus.sources ?? []) {
    const rawDomain = src.domain ?? ""
    const normalizedDomain = normalizeHostname(rawDomain) ?? rawDomain.trim().toLowerCase()
    if (!normalizedDomain) continue

    const existingMatchRow = catalogByHostname.get(normalizedDomain) ?? null
    const isNew = existingMatchRow === null

    const existingMatch: ExistingSourceMatch | null = existingMatchRow
      ? {
          id: existingMatchRow.id,
          sourceKey: existingMatchRow.sourceKey,
          origin: existingMatchRow.origin,
          isLocked: existingMatchRow.isLocked,
          name: existingMatchRow.name,
        }
      : null

    const docs = src.documents_used ?? src.documentsUsed ?? []

    const currentCandidate = candidatesByDomain.get(normalizedDomain)
    if (currentCandidate) {
      // Fusion des documents si deux entrées pointaient sur le même nom d'hôte
      currentCandidate.documentsCount += docs.length
      currentCandidate.documentsUsed.push(...docs)
      if (!currentCandidate.publisher && src.publisher) {
        currentCandidate.publisher = src.publisher
      }
    } else {
      candidatesByDomain.set(normalizedDomain, {
        name: existingMatchRow?.name ?? src.name,
        publisher: src.publisher ?? null,
        domain: normalizedDomain,
        searchDomain: normalizedDomain,
        sourceType: src.source_type ?? src.sourceType ?? "other",
        documentsCount: docs.length,
        documentsUsed: [...docs],
        confidence: typeof src.confidence === "number" ? src.confidence : null,
        existingMatch,
        isNewSource: isNew,
        existingCategory: existingMatchRow?.kredoCategory ?? null,
        existingTemporality: existingMatchRow?.contentTemporality ?? null,
        existingUsageScopes: existingMatchRow?.usageScopes ?? [],
        existingCollectionUrl: existingMatchRow?.collectionUrl ?? null,
        existingHomepageUrl: existingMatchRow?.homepageUrl ?? null,
      })
    }
  }

  return Array.from(candidatesByDomain.values())
}

/**
 * Valide les arbitrages utilisateur pour une nouvelle source.
 */
export function validateNewSourceArbitration(
  candidate: AccountCorpusAuthorityCandidate,
  arbitration: AccountSourceArbitration | undefined,
): { ok: true } | { ok: false; error: string } {
  if (arbitration && !arbitration.selected) return { ok: true }
  if (!candidate.isNewSource) return { ok: true }

  if (!arbitration) {
    return { ok: false, error: `Arbitrage manquant pour la nouvelle source « ${candidate.name} » (${candidate.searchDomain}).` }
  }

  const category = normalizeKredoCategory(arbitration.kredoCategory)
  if (!category) {
    return { ok: false, error: `Catégorie KREDO obligatoire pour la nouvelle source « ${candidate.name} » (${candidate.searchDomain}).` }
  }

  const temporality = arbitration.contentTemporality
  if (!temporality || (temporality !== "static" && temporality !== "periodic" && temporality !== "continuous")) {
    return { ok: false, error: `Temporalité de contenu obligatoire pour la nouvelle source « ${candidate.name} » (${candidate.searchDomain}).` }
  }

  return { ok: true }
}

/**
 * Assemble le payload pour `ingestSourceCorpusAction` (scopeKind = 'account').
 */
export function buildAccountIngestCorpusPayload(input: {
  studyId: string
  companyId: string
  companyName: string
  studyTitle: string
  snapshotDate: string
  schemaVersion?: number
  candidates: AccountCorpusAuthorityCandidate[]
  arbitrations: AccountSourceArbitration[]
  sourceFileName?: string | null
  sourceFileHash?: string | null
  reason?: string
}): IngestSourceCorpusPayload {
  const {
    studyId,
    companyId,
    companyName,
    studyTitle,
    snapshotDate,
    schemaVersion = 1,
    candidates,
    arbitrations,
    sourceFileName = "source-corpus.json",
    sourceFileHash = null,
  } = input

  const arbitrationMap = new Map(arbitrations.map((a) => [a.domain.toLowerCase(), a]))

  const selectedCandidates: { candidate: AccountCorpusAuthorityCandidate; arbitration: AccountSourceArbitration }[] = []
  for (const candidate of candidates) {
    const arb = arbitrationMap.get(candidate.searchDomain.toLowerCase())
    // Par défaut si non spécifié, considéré comme inclus s'il a été soumis
    if (arb && arb.selected) {
      const validation = validateNewSourceArbitration(candidate, arb)
      if (!validation.ok) {
        throw new Error(validation.error)
      }
      selectedCandidates.push({ candidate, arbitration: arb })
    }
  }

  if (selectedCandidates.length === 0) {
    throw new Error("Au moins une source doit être sélectionnée pour la distribution en bibliothèque.")
  }

  const sources: IngestSourceCorpusSourceItem[] = selectedCandidates.map(({ candidate, arbitration }) => {
    const isExisting = !candidate.isNewSource && candidate.existingMatch !== null

    const finalCategory: KredoSourceCategory = isExisting && candidate.existingCategory
      ? (normalizeKredoCategory(candidate.existingCategory) ?? "vertical")
      : (normalizeKredoCategory(arbitration.kredoCategory) ?? "vertical")

    const finalTemporality: SourceContentTemporality = isExisting && candidate.existingTemporality
      ? candidate.existingTemporality
      : arbitration.contentTemporality!

    const finalUsageScopes = isExisting
      ? Array.from(new Set([...candidate.existingUsageScopes, "study"]))
      : ["study"]

    const finalSourceKey = candidate.existingMatch?.sourceKey ?? `corpus:${candidate.searchDomain}`
    const finalName = candidate.existingMatch?.name ?? candidate.name

    return {
      source_key: finalSourceKey,
      name: finalName,
      publisher: candidate.publisher,
      domain: candidate.domain,
      search_domain: candidate.searchDomain,
      collection_url: candidate.existingCollectionUrl ?? null,
      homepage_url: candidate.existingHomepageUrl ?? `https://${candidate.searchDomain}`,
      family: `Account Intelligence — ${companyName}`,
      kredo_category: finalCategory,
      content_temporality: finalTemporality,
      usage_scopes: finalUsageScopes as ("news" | "account_watch" | "study")[],
      external_src_id: candidate.documentsUsed[0]?.sourceRef ?? candidate.searchDomain,
      pack: "minimal",
      tier: null,
      primary_role: null,
      utility_score: null,
      automation_fit: null,
      familles_couvertes: [],
      atteste: `Utilisée dans l'étude Account Intelligence ${studyTitle}`,
      news_eligible: false,
      account_watch_eligible: false,
      is_enabled: false,
      exclusion_reason: null,
    }
  })

  const totalDocuments = candidates.reduce((sum, c) => sum + c.documentsCount, 0)
  const excludedDomains = arbitrations.filter((a) => !a.selected).map((a) => a.domain)

  return {
    slug: buildAccountCorpusSlug({ id: companyId, name: companyName }),
    version: buildAccountCorpusVersion(studyId, snapshotDate),
    snapshot_date: snapshotDate,
    quality_verdict: "usable_with_caveats",
    activation_state: "draft",
    source_document_path: null,
    source_document_hash: sourceFileHash,
    gaps: [],
    study_id: studyId,
    metadata: {
      origin: "account_intelligence",
      producer: "chatgpt_work",
      study_id: studyId,
      study_title: studyTitle,
      company_name: companyName,
      schema_version: schemaVersion,
      source_authorities_total: candidates.length,
      documents_used_total: totalDocuments,
      source_file_name: sourceFileName,
      source_file_sha256: sourceFileHash,
      imported_at: new Date().toISOString(),
      excluded_domains: excludedDomains,
    },
    sources,
  }
}
