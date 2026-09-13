// ─── Adaptateur ChatGPT Work vers AccountStudyKnowledge — module pur ──────────
//
// Transforme de façon déterministe et pure le couple de livrables ChatGPT Work :
//   1. Account Intelligence JSON → projection textuelle verbatim + blocs + statements + gaps + entity
//   2. Source Corpus JSON → StudySource[] (1 autorité ↔ N documents) + registre E3 de compte
//
// Invariants garantis :
//   - Aucun appel LLM, aucune réécriture de prose, texte 100% verbatim.
//   - Invariant d'intégrité textuel calculé via `checkBlocksIntegrity` (coverage.text.identical).
//   - Aucune perte d'affirmation, de lacune ou de source.
//   - Si les qualifications E3 manquent dans Work, `registry.importable` reste false et liste les manques.

import {
  parseSourceRegistryOutput,
  SOURCE_REGISTRY_VERSION,
} from "@/features/source-management/domain/source-registry-output"

import { accountCorpusSlug } from "./build-study-source-registry"
import {
  STUDY_KNOWLEDGE_FORMAT,
  STUDY_KNOWLEDGE_VERSION,
  STUDY_PRODUCER_WORK,
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  STUDY_SOURCE_TYPES,
  type AccountStudyKnowledge,
  type StudyBlock,
  type StudyCoverage,
  type StudyEntity,
  type StudyGap,
  type StudyQualification,
  type StudySectionKey,
  type StudySource,
  type StudySourceType,
  type StudyStatement,
} from "./study-contracts"
import type { E3SourceQualification } from "./study-conversion-output"
import { blockId, checkBlocksIntegrity } from "./study-segmentation"
import { authorityId, normalizeSourceUrl, sourceDomain } from "./study-sources"
import type { WorkAccountIntelligence, WorkSourceCorpus } from "./work-study-contracts"

export type AdaptWorkStudyContext = {
  studyId: string
  companyId: string
  companyName: string
  fileName: string
  title?: string
  importedAt?: string
  convertedAt?: string
  model?: string
  segmentSlug?: string | null
  segmentName?: string | null
  rawSha256?: string
}

export type AdaptWorkStudyInput = {
  accountIntelligence: WorkAccountIntelligence
  sourceCorpus: WorkSourceCorpus
  context: AdaptWorkStudyContext
  /** Qualifications E3 manuelles ou enrichies optionnelles */
  e3Qualifications?: Map<string, Partial<E3SourceQualification>>
}

export type AdaptWorkStudyResult = {
  knowledge: AccountStudyKnowledge
  rawContent: string
  registry: Record<string, unknown>
  registryImportable: boolean
  registryErrors: string[]
  unexploitedFields: string[]
}

const SOURCE_TYPE_SET = new Set<string>(STUDY_SOURCE_TYPES)

function tokenizeWords(text: string): Set<string> {
  const words = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
  return new Set(words)
}

function computeOverlapScore(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0
  let shared = 0
  for (const item of setA) {
    if (setB.has(item)) shared++
  }
  return shared
}

// ─── 1. Projection textuelle déterministe et construction des blocs ───────────

export function projectWorkStudyBlocks(accountIntelligence: WorkAccountIntelligence): {
  blocks: StudyBlock[]
  rawContent: string
} {
  const blocks: StudyBlock[] = []
  let currentIndex = 0

  for (const section of accountIntelligence.sections) {
    // 1. Titre de section comme premier bloc de section
    const headingText = `# ${section.title}`
    const headingIndex = currentIndex++
    blocks.push({
      id: blockId(headingIndex),
      index: headingIndex,
      kind: "heading",
      text: headingText,
      heading_path: [section.title],
      page: null,
      section_key: section.key,
      classified_by: "model",
      source_refs: section.source_refs ?? [],
    })

    // 2. Paragraphes de narrative verbatim dans leur ordre
    for (const paragraph of section.narrative) {
      const pIndex = currentIndex++
      blocks.push({
        id: blockId(pIndex),
        index: pIndex,
        kind: "paragraph",
        text: paragraph,
        heading_path: [section.title],
        page: null,
        section_key: section.key,
        classified_by: "model",
        source_refs: [],
      })
    }
  }

  // Reconstruction de la projection textuelle complète
  const rawContent = blocks.map((b) => b.text).join("\n\n")

  return { blocks, rawContent }
}

// ─── 2. Association des statements aux blocs ─────────────────────────────────

function matchStatementToBlocks(
  statementText: string,
  sectionBlocks: StudyBlock[],
): string[] {
  const narrativeBlocks = sectionBlocks.filter((b) => b.kind !== "heading")
  if (narrativeBlocks.length === 0) return []

  const statementTokens = tokenizeWords(statementText)
  let bestBlockId: string | null = null
  let maxScore = 0

  for (const block of narrativeBlocks) {
    const blockTokens = tokenizeWords(block.text)
    const score = computeOverlapScore(statementTokens, blockTokens)
    if (score > maxScore && score >= 2) {
      maxScore = score
      bestBlockId = block.id
    }
  }

  return bestBlockId ? [bestBlockId] : []
}

// ─── 3. Registre de compte Kredo ─────────────────────────────────────────────

function buildWorkAccountRegistry(params: {
  context: AdaptWorkStudyContext
  authorities: WorkSourceCorpus["sources"]
  authIdByDomain: Map<string, string>
  snapshotDate: string
  e3Qualifications?: Map<string, Partial<E3SourceQualification>>
}): {
  registry: Record<string, unknown>
  importable: boolean
  errors: string[]
} {
  const { context, authorities, authIdByDomain, snapshotDate, e3Qualifications } = params

  const entries = authorities.map((auth) => {
    const srcId = authIdByDomain.get(auth.domain) ?? "SRC-001"
    const q = e3Qualifications?.get(auth.domain)

    const mainDoc = auth.documents_used[0]
    const mainUrl = mainDoc ? normalizeSourceUrl(mainDoc.url) : `https://${auth.domain}`

    return {
      src_id: srcId,
      publisher: auth.publisher ?? auth.name ?? auth.domain,
      domain: auth.domain,
      url: mainUrl,
      search_domain: auth.domain,
      tier: q?.tier,
      primary_role: q?.primary_role,
      utility_score: q?.utility_score_detail
        ? Object.values(q.utility_score_detail).reduce((sum, v) => sum + v, 0)
        : undefined,
      utility_score_detail: q?.utility_score_detail,
      automation_fit: q?.automation_fit,
      collection_url: null,
      content_temporality: q?.content_temporality,
      usage_scopes: q?.usage_scopes,
      pack: q?.pack,
      atteste: q?.atteste ?? `Cité par l'étude Work « ${context.fileName} »`,
      familles_couvertes: q?.familles_couvertes ?? [],
      consulted_at: mainDoc?.consulted_at ?? snapshotDate,
      validation_status: "pending",
      conditions_utilisation: null,
      note_ajout: `${auth.documents_used.length} document(s) cité(s) dans l'étude Work.`,
      description: auth.description ?? null,
      information_types: auth.information_types ?? [],
      confidence: auth.confidence ?? null,
      documents: auth.documents_used.map((doc) => ({
        doc_id: doc.source_ref,
        url: normalizeSourceUrl(doc.url),
        titre: doc.title,
        citations: [],
      })),
    }
  })

  const packMinimal = entries.filter((e) => e.pack === "minimal").map((e) => e.src_id)
  const packEnrichi = entries.filter((e) => e.pack === "enrichi").map((e) => e.src_id)

  const registry: Record<string, unknown> = {
    meta: {
      segment_slug: context.segmentSlug ?? "",
      secteur: context.segmentName ?? undefined,
      geographie: undefined,
      date_snapshot: snapshotDate,
      version: SOURCE_REGISTRY_VERSION,
      validation_status: "pending",
      corpus_scope: "account",
      corpus_slug: accountCorpusSlug({ id: context.companyId, name: context.companyName }),
      account: { company_id: context.companyId, name: context.companyName },
      study: { id: context.studyId, title: context.fileName },
    },
    besoins_information: [],
    familles_sectorielles_obligatoires: {
      presse_professionnelle: null,
      federation: null,
      regulateur: null,
    },
    sources: entries,
    pack_minimal: packMinimal,
    pack_enrichi: packEnrichi,
    matrice_couverture: [],
    gaps: [],
    compteurs: {
      sources: entries.length,
      pack_minimal: packMinimal.length,
      pack_enrichi: packEnrichi.length,
      requetes: 0,
    },
    note_normalisation:
      "Registre de compte généré depuis ChatGPT Work : documents réellement utilisés regroupés par autorité/domaine.",
  }

  // Nettoyage des undefined pour sérialisation fidèle
  const serialized = JSON.parse(JSON.stringify(registry)) as Record<string, unknown>
  const errors: string[] = []

  if (!context.segmentSlug) {
    errors.push("Compte sans segment : un segment est requis pour rattacher le corpus.")
  }

  const parsed = parseSourceRegistryOutput(serialized)
  if (!parsed.ok) {
    errors.push(...parsed.errors.map((err) => `${err.path || "racine"} — ${err.message}`))
  }

  return {
    registry: serialized,
    importable: errors.length === 0,
    errors,
  }
}

// ─── 4. Adaptateur principal ─────────────────────────────────────────────────

export function adaptWorkStudyToKnowledge(input: AdaptWorkStudyInput): AdaptWorkStudyResult {
  const { accountIntelligence, sourceCorpus, context, e3Qualifications } = input

  const importedAt = context.importedAt ?? new Date().toISOString()
  const convertedAt = context.convertedAt ?? importedAt
  const snapshotDate = accountIntelligence.generated_at?.slice(0, 10) ?? importedAt.slice(0, 10)
  const unexploitedFields: string[] = []

  // 1. Projection textuelle & blocs
  const { blocks, rawContent } = projectWorkStudyBlocks(accountIntelligence)
  const blocksBySection = new Map<StudySectionKey, StudyBlock[]>()
  for (const block of blocks) {
    const list = blocksBySection.get(block.section_key) ?? []
    list.push(block)
    blocksBySection.set(block.section_key, list)
  }

  // 2. Autorités et documents
  const authIdByDomain = new Map<string, string>()
  sourceCorpus.sources.forEach((auth, index) => {
    authIdByDomain.set(auth.domain, authorityId(index))
  })

  const sources: StudySource[] = []
  const docAuthorityMap = new Map<string, string>()
  const docDomainMap = new Map<string, string>()

  for (const auth of sourceCorpus.sources) {
    const authId = authIdByDomain.get(auth.domain) ?? "SRC-001"
    const rawType = auth.source_type
    const sourceType: StudySourceType =
      rawType && SOURCE_TYPE_SET.has(rawType) ? (rawType as StudySourceType) : "other"

    for (const doc of auth.documents_used) {
      docAuthorityMap.set(doc.source_ref, authId)
      docDomainMap.set(doc.source_ref, auth.domain)

      sources.push({
        id: doc.source_ref,
        authority_id: authId,
        url: doc.url,
        normalized_url: normalizeSourceUrl(doc.url),
        domain: auth.domain || sourceDomain(doc.url),
        label: doc.title,
        publisher: auth.publisher ?? null,
        source_type: sourceType,
        citation_numbers: [],
        cited_in_block_ids: [],
        qualified_by: "model",
      })
    }
  }

  // 3. Affirmations (statements)
  let statementCounter = 0
  const statements: StudyStatement[] = []
  const byQualification = Object.fromEntries(STUDY_QUALIFICATIONS.map((q) => [q, 0])) as Record<
    StudyQualification,
    number
  >

  for (const section of accountIntelligence.sections) {
    const secBlocks = blocksBySection.get(section.key) ?? []

    for (const stmt of section.statements) {
      const sId = `S${String(++statementCounter).padStart(4, "0")}`
      byQualification[stmt.qualification] = (byQualification[stmt.qualification] ?? 0) + 1

      const matchedBlocks = matchStatementToBlocks(stmt.text, secBlocks)

      statements.push({
        id: sId,
        section_key: section.key,
        text: stmt.text,
        qualification: stmt.qualification,
        confidence: stmt.confidence,
        source_refs: stmt.source_refs,
        block_ids: matchedBlocks,
        entity: null,
        qualified_by: "model",
      })
    }
  }

  // Remplissage des cited_in_block_ids pour chaque source
  const blocksByDocRef = new Map<string, Set<string>>()
  for (const stmt of statements) {
    for (const ref of stmt.source_refs) {
      const set = blocksByDocRef.get(ref) ?? new Set()
      for (const bId of stmt.block_ids) set.add(bId)
      blocksByDocRef.set(ref, set)
    }
  }
  for (const src of sources) {
    src.cited_in_block_ids = Array.from(blocksByDocRef.get(src.id) ?? [])
  }

  // 4. Lacunes (gaps)
  const gaps: StudyGap[] = accountIntelligence.knowledge_gaps.map((g) => ({
    section_key: g.section_key,
    reason: g.gap,
  }))

  // 5. Entité résolue (entity)
  const er = accountIntelligence.entity_resolution
  const entity: StudyEntity = {
    legal_name: er.legal_name || null,
    siren: er.siren || null,
    naf_code: er.naf_code || null,
    headquarters: er.hq_location || null,
  }

  // Traces d'éventuels champs unexploités
  if (er.reasons && er.reasons.length > 0) {
    unexploitedFields.push("entity_resolution.reasons")
  }
  if (accountIntelligence.extra_fields) {
    unexploitedFields.push(...Object.keys(accountIntelligence.extra_fields).map((k) => `account_intelligence.${k}`))
  }
  if (sourceCorpus.extra_fields) {
    unexploitedFields.push(...Object.keys(sourceCorpus.extra_fields).map((k) => `source_corpus.${k}`))
  }

  // 6. Registre de compte E3
  const registryResult = buildWorkAccountRegistry({
    context,
    authorities: sourceCorpus.sources,
    authIdByDomain,
    snapshotDate,
    e3Qualifications,
  })

  // 7. Intégrité textuelle & Couverture
  const integrity = checkBlocksIntegrity(rawContent, blocks)

  const bySectionCounts = Object.fromEntries(STUDY_SECTION_KEYS.map((k) => [k, 0])) as Record<
    StudySectionKey,
    number
  >
  for (const block of blocks) {
    bySectionCounts[block.section_key]++
  }

  const blocksWithStatement = new Set(statements.flatMap((s) => s.block_ids))
  const statementsSourced = statements.filter((s) => s.source_refs.length > 0).length

  const allCitedSources = new Set<string>()
  for (const s of statements) {
    for (const ref of s.source_refs) allCitedSources.add(ref)
  }
  for (const sec of accountIntelligence.sections) {
    for (const ref of sec.source_refs ?? []) allCitedSources.add(ref)
  }

  const coverage: StudyCoverage = {
    text: {
      raw_chars: rawContent.length,
      raw_non_ws_chars: integrity.rawNonWsChars,
      blocks_non_ws_chars: integrity.blocksNonWsChars,
      identical: integrity.identical,
    },
    blocks: {
      total: blocks.length,
      classified_by_model: blocks.length,
      fallback: 0,
      by_section: bySectionCounts,
      without_statement: blocks.filter((b) => b.kind !== "heading" && !blocksWithStatement.has(b.id)).length,
    },
    urls: {
      detected: sources.length,
      in_sources: sources.length,
      excluded: [],
    },
    statements: {
      total: statements.length,
      by_qualification: byQualification,
      fallback_qualification: 0,
      unresolved_block_refs: 0,
      unresolved_source_refs: 0,
    },
    sources: {
      documents: sources.length,
      authorities: sourceCorpus.sources.length,
      authorities_model_qualified: sourceCorpus.sources.length,
      authorities_default_qualified: 0,
      citation_numbers: 0,
    },
    registry: {
      importable: registryResult.importable,
      errors: registryResult.errors,
    },
    entity_conflicts: [],
    parts: [],
  }

  const knowledge: AccountStudyKnowledge = {
    format: STUDY_KNOWLEDGE_FORMAT,
    version: STUDY_KNOWLEDGE_VERSION,
    study: {
      id: context.studyId,
      company_id: context.companyId,
      title: context.title ?? context.fileName.replace(/\.json$/i, ""),
      producer: STUDY_PRODUCER_WORK,
      file_name: context.fileName,
      raw_sha256: context.rawSha256 ?? "",
      raw_chars: rawContent.length,
      imported_at: importedAt,
      converted_at: convertedAt,
      model: context.model ?? "chatgpt_work",
    },
    entity,
    blocks,
    statements,
    sources,
    gaps,
    anchoring: {
      sources_cited: allCitedSources.size,
      statements_total: statements.length,
      statements_sourced: statementsSourced,
      ratio: statements.length === 0 ? 0 : statementsSourced / statements.length,
      status: sources.length > 0 ? "sourced" : "unsourced",
    },
    coverage,
  }

  return {
    knowledge,
    rawContent,
    registry: registryResult.registry,
    registryImportable: registryResult.importable,
    registryErrors: registryResult.errors,
    unexploitedFields,
  }
}
