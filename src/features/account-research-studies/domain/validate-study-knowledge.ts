// ─── Relecture des briques stockées — module pur ────────────────────────────
// `knowledge_json` revient de la base en `jsonb` : on vérifie sa structure avant de le
// typer. Une brique illisible n'est jamais réparée ni masquée : elle est refusée, et
// l'appelant le signale.

import {
  STUDY_KNOWLEDGE_FORMAT,
  STUDY_KNOWLEDGE_VERSION,
  STUDY_PRODUCERS,
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  type AccountStudyKnowledge,
} from "./study-contracts"

export type StudyKnowledgeValidation =
  | { ok: true; value: AccountStudyKnowledge }
  | { ok: false; issues: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const SECTION_SET = new Set<string>(STUDY_SECTION_KEYS)
const QUALIFICATION_SET = new Set<string>(STUDY_QUALIFICATIONS)
const PRODUCER_SET = new Set<string>(STUDY_PRODUCERS)

export function validateStudyKnowledge(raw: unknown): StudyKnowledgeValidation {
  const issues: string[] = []
  if (!isRecord(raw)) return { ok: false, issues: ["Objet attendu."] }
  if (raw.format !== STUDY_KNOWLEDGE_FORMAT) issues.push(`format attendu : ${STUDY_KNOWLEDGE_FORMAT}.`)
  if (raw.version !== STUDY_KNOWLEDGE_VERSION) issues.push(`version attendue : ${STUDY_KNOWLEDGE_VERSION}.`)
  if (!isRecord(raw.study) || typeof raw.study.id !== "string") issues.push("study.id manquant.")
  if (!isRecord(raw.study) || typeof raw.study.producer !== "string" || !PRODUCER_SET.has(raw.study.producer)) {
    issues.push(
      `study.producer invalide ou non supporté (${raw.study && isRecord(raw.study) ? String(raw.study.producer) : "manquant"} — attendu : ${STUDY_PRODUCERS.join(", ")}).`,
    )
  }
  if (!Array.isArray(raw.blocks)) issues.push("blocks doit être un tableau.")
  if (!Array.isArray(raw.statements)) issues.push("statements doit être un tableau.")
  if (!Array.isArray(raw.sources)) issues.push("sources doit être un tableau.")
  if (!Array.isArray(raw.gaps)) issues.push("gaps doit être un tableau.")
  if (!isRecord(raw.anchoring) || !isRecord(raw.coverage)) issues.push("anchoring/coverage manquants.")
  if (issues.length) return { ok: false, issues }

  const blocks = raw.blocks as unknown[]
  const blockIds = new Set<string>()
  blocks.forEach((block, index) => {
    if (!isRecord(block) || typeof block.id !== "string" || typeof block.text !== "string") {
      issues.push(`blocks[${index}] invalide.`)
      return
    }
    if (block.index !== index) issues.push(`blocks[${index}].index non contigu.`)
    if (!SECTION_SET.has(String(block.section_key))) issues.push(`blocks[${index}].section_key inconnue.`)
    if (blockIds.has(block.id)) issues.push(`blocks[${index}].id dupliqué.`)
    blockIds.add(block.id)
  })

  const sourceIds = new Set<string>()
  ;(raw.sources as unknown[]).forEach((source, index) => {
    if (!isRecord(source) || typeof source.id !== "string" || typeof source.url !== "string") {
      issues.push(`sources[${index}] invalide.`)
      return
    }
    sourceIds.add(source.id)
  })

  ;(raw.statements as unknown[]).forEach((statement, index) => {
    if (!isRecord(statement) || typeof statement.text !== "string") {
      issues.push(`statements[${index}] invalide.`)
      return
    }
    if (!QUALIFICATION_SET.has(String(statement.qualification))) issues.push(`statements[${index}].qualification inconnue.`)
    if (!SECTION_SET.has(String(statement.section_key))) issues.push(`statements[${index}].section_key inconnue.`)
    for (const ref of Array.isArray(statement.block_ids) ? statement.block_ids : []) {
      if (!blockIds.has(String(ref))) issues.push(`statements[${index}] cite un bloc inconnu (${String(ref)}).`)
    }
    for (const ref of Array.isArray(statement.source_refs) ? statement.source_refs : []) {
      if (!sourceIds.has(String(ref))) issues.push(`statements[${index}] cite une source inconnue (${String(ref)}).`)
    }
  })

  return issues.length ? { ok: false, issues } : { ok: true, value: raw as unknown as AccountStudyKnowledge }
}
