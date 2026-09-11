// ─── Assemblage des deux fichiers d'une étude — module pur ──────────────────
//
// Entrées : les blocs (déterministes), les documents et autorités (déterministes), et
// les sorties des passes du modèle. Sorties : les briques (`AccountStudyKnowledge`),
// le registre E3 et le rapport de couverture.
//
// Tout ce qui garantit l'absence de perte est calculé ICI, sans le modèle :
//   - chaque bloc est restitué, classé par le modèle ou, à défaut, en annexe ;
//   - chaque document et chaque autorité figurent, qualifiés par le modèle ou par défaut ;
//   - l'intégrité du texte est recalculée et portée par le rapport de couverture.

import { buildStudySourceRegistry, type QualifiedAuthority } from "./build-study-source-registry"
import {
  STUDY_KNOWLEDGE_FORMAT,
  STUDY_KNOWLEDGE_VERSION,
  STUDY_PRODUCER,
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  type AccountStudyKnowledge,
  type StudyBlock,
  type StudyConversionPartKind,
  type StudyCoverage,
  type StudyEntity,
  type StudyGap,
  type StudyQualification,
  type StudySectionKey,
  type StudySource,
  type StudyStatement,
} from "./study-contracts"
import {
  defaultSourceQualification,
  type E3SourceQualification,
  type ParsedBlocksPart,
  type ParsedSourcesPart,
} from "./study-conversion-output"
import { checkBlocksIntegrity, type SegmentedBlock } from "./study-segmentation"
import type { StudySourceExtraction } from "./study-sources"

export type AssembleStudyInput = {
  study: {
    id: string
    companyId: string
    title: string
    fileName: string
    rawContent: string
    rawSha256: string
    importedAt: string
  }
  company: { name: string; segmentSlug: string | null; segmentName: string | null }
  blocks: readonly SegmentedBlock[]
  extraction: StudySourceExtraction
  parts: { key: string; kind: StudyConversionPartKind; run_id: string }[]
  blocksOutputs: readonly ParsedBlocksPart[]
  sourcesOutputs: readonly ParsedSourcesPart[]
  convertedAt: string
  model: string
}

export type AssembleStudyResult = {
  knowledge: AccountStudyKnowledge
  registry: Record<string, unknown>
}

function emptySectionCounts(): Record<StudySectionKey, number> {
  return Object.fromEntries(STUDY_SECTION_KEYS.map((key) => [key, 0])) as Record<StudySectionKey, number>
}

function statementId(index: number): string {
  return `S${String(index + 1).padStart(4, "0")}`
}

function mergeEntity(outputs: readonly ParsedBlocksPart[]): {
  entity: StudyEntity | null
  conflicts: StudyCoverage["entity_conflicts"]
} {
  const fields: (keyof StudyEntity)[] = ["legal_name", "siren", "naf_code", "headquarters"]
  const values = new Map<keyof StudyEntity, string[]>()
  for (const output of outputs) {
    if (!output.entity) continue
    for (const field of fields) {
      const value = output.entity[field]
      if (!value) continue
      const list = values.get(field) ?? []
      if (!list.some((known) => known.replace(/\s+/g, "").toLowerCase() === value.replace(/\s+/g, "").toLowerCase())) list.push(value)
      values.set(field, list)
    }
  }
  if (values.size === 0) return { entity: null, conflicts: [] }
  const entity = Object.fromEntries(fields.map((field) => [field, values.get(field)?.[0] ?? null])) as StudyEntity
  // Un désaccord entre passes est montré, jamais arbitré en silence (contrat épistémique §5).
  const conflicts = fields
    .filter((field) => (values.get(field)?.length ?? 0) > 1)
    .map((field) => ({ field, values: values.get(field) ?? [] }))
  return { entity, conflicts }
}

export function assembleStudyKnowledge(input: AssembleStudyInput): AssembleStudyResult {
  const { study, company, blocks, extraction } = input

  // ── Blocs : chaque bloc restitué, dans exactement une section ────────────
  const classification = new Map<string, StudySectionKey>()
  for (const output of input.blocksOutputs) {
    for (const [blockId, section] of output.classifications) {
      if (!classification.has(blockId)) classification.set(blockId, section)
    }
  }

  const studyBlocks: StudyBlock[] = blocks.map((block) => {
    const section = classification.get(block.id)
    return {
      id: block.id,
      index: block.index,
      kind: block.kind,
      text: block.text,
      heading_path: block.heading_path,
      page: block.page,
      section_key: section ?? "appendix",
      classified_by: section ? "model" : "fallback",
      source_refs: extraction.blockSourceRefs.get(block.id) ?? [],
    }
  })
  const sectionByBlock = new Map(studyBlocks.map((block) => [block.id, block.section_key]))

  // ── Affirmations ──────────────────────────────────────────────────────────
  const byQualification = Object.fromEntries(STUDY_QUALIFICATIONS.map((q) => [q, 0])) as Record<StudyQualification, number>
  let fallbackQualification = 0
  let unresolvedBlockRefs = 0
  let unresolvedSourceRefs = 0

  const statements: StudyStatement[] = input.blocksOutputs
    .flatMap((output) => output.statements)
    .map((statement, index) => {
      byQualification[statement.qualification] += 1
      if (statement.qualificationFallback) fallbackQualification += 1
      unresolvedBlockRefs += statement.unresolvedBlockRefs
      unresolvedSourceRefs += statement.unresolvedSourceRefs
      const firstBlock = statement.block_ids[0]
      return {
        id: statementId(index),
        section_key: (firstBlock && sectionByBlock.get(firstBlock)) || "appendix",
        text: statement.text,
        qualification: statement.qualification,
        confidence: statement.confidence,
        source_refs: statement.source_refs,
        block_ids: statement.block_ids,
        entity: statement.entity,
        qualified_by: statement.qualificationFallback ? "fallback" : "model",
      }
    })

  const blocksWithStatement = new Set(statements.flatMap((statement) => statement.block_ids))

  // ── Lacunes ───────────────────────────────────────────────────────────────
  const seenGaps = new Set<string>()
  const gaps: StudyGap[] = []
  for (const output of input.blocksOutputs) {
    for (const gap of output.gaps) {
      const key = `${gap.section_key}::${gap.reason.toLowerCase()}`
      if (seenGaps.has(key)) continue
      seenGaps.add(key)
      gaps.push(gap)
    }
  }

  // ── Autorités et documents ────────────────────────────────────────────────
  const qualificationByAuthority = new Map<string, E3SourceQualification>()
  for (const output of input.sourcesOutputs) {
    for (const [id, qualification] of output.qualifications) {
      if (!qualificationByAuthority.has(id)) qualificationByAuthority.set(id, qualification)
    }
  }
  const documentsById = new Map(extraction.sources.map((document) => [document.id, document]))

  const qualifiedAuthorities: QualifiedAuthority[] = extraction.authorities.map((authority) => {
    const qualification = qualificationByAuthority.get(authority.id)
    return {
      ...authority,
      qualification: qualification ?? defaultSourceQualification(),
      qualifiedBy: qualification ? "model" : "default",
      documents: authority.document_ids
        .map((id) => documentsById.get(id))
        .filter((document): document is NonNullable<typeof document> => Boolean(document)),
    }
  })
  const authorityById = new Map(qualifiedAuthorities.map((authority) => [authority.id, authority]))

  const sources: StudySource[] = extraction.sources.map((document) => {
    const authority = authorityById.get(document.authority_id)
    return {
      id: document.id,
      authority_id: document.authority_id,
      url: document.url,
      normalized_url: document.normalized_url,
      domain: document.domain,
      label: document.label,
      publisher: authority?.qualification.publisher ?? null,
      source_type: authority?.qualification.source_type ?? "other",
      citation_numbers: document.citation_numbers,
      cited_in_block_ids: document.cited_in_block_ids,
      qualified_by: authority?.qualifiedBy ?? "default",
    }
  })

  // ── Registre E3 ───────────────────────────────────────────────────────────
  const registry = buildStudySourceRegistry({
    company: { id: study.companyId, name: company.name },
    segment: company.segmentSlug ? { slug: company.segmentSlug, name: company.segmentName } : null,
    study: { id: study.id, title: study.title, snapshotDate: study.importedAt.slice(0, 10) },
    authorities: qualifiedAuthorities,
  })

  // ── Couverture ────────────────────────────────────────────────────────────
  const integrity = checkBlocksIntegrity(study.rawContent, blocks)
  const bySection = emptySectionCounts()
  for (const block of studyBlocks) bySection[block.section_key] += 1
  const { entity, conflicts } = mergeEntity(input.blocksOutputs)
  const statementsSourced = statements.filter((statement) => statement.source_refs.length > 0).length
  const citedDocuments = new Set(studyBlocks.flatMap((block) => block.source_refs))

  const coverage: StudyCoverage = {
    text: {
      raw_chars: study.rawContent.length,
      raw_non_ws_chars: integrity.rawNonWsChars,
      blocks_non_ws_chars: integrity.blocksNonWsChars,
      identical: integrity.identical,
    },
    blocks: {
      total: studyBlocks.length,
      classified_by_model: studyBlocks.filter((block) => block.classified_by === "model").length,
      fallback: studyBlocks.filter((block) => block.classified_by === "fallback").length,
      by_section: bySection,
      without_statement: studyBlocks.filter((block) => block.kind !== "heading" && !blocksWithStatement.has(block.id)).length,
    },
    urls: {
      detected: extraction.urlsDetected,
      in_sources: extraction.sources.length,
      excluded: extraction.excluded,
    },
    statements: {
      total: statements.length,
      by_qualification: byQualification,
      fallback_qualification: fallbackQualification,
      unresolved_block_refs: unresolvedBlockRefs,
      unresolved_source_refs: unresolvedSourceRefs,
    },
    sources: {
      documents: sources.length,
      authorities: qualifiedAuthorities.length,
      authorities_model_qualified: qualifiedAuthorities.filter((authority) => authority.qualifiedBy === "model").length,
      authorities_default_qualified: qualifiedAuthorities.filter((authority) => authority.qualifiedBy === "default").length,
      citation_numbers: new Set(sources.flatMap((source) => source.citation_numbers)).size,
    },
    registry: { importable: registry.importable, errors: registry.errors },
    entity_conflicts: conflicts,
    parts: input.parts,
  }

  const knowledge: AccountStudyKnowledge = {
    format: STUDY_KNOWLEDGE_FORMAT,
    version: STUDY_KNOWLEDGE_VERSION,
    study: {
      id: study.id,
      company_id: study.companyId,
      title: study.title,
      producer: STUDY_PRODUCER,
      file_name: study.fileName,
      raw_sha256: study.rawSha256,
      raw_chars: study.rawContent.length,
      imported_at: study.importedAt,
      converted_at: input.convertedAt,
      model: input.model,
    },
    entity,
    blocks: studyBlocks,
    statements,
    sources,
    gaps,
    anchoring: {
      sources_cited: citedDocuments.size,
      statements_total: statements.length,
      statements_sourced: statementsSourced,
      ratio: statements.length === 0 ? 0 : statementsSourced / statements.length,
      status: sources.length > 0 ? "sourced" : "unsourced",
    },
    coverage,
  }

  return { knowledge, registry: registry.registry }
}
