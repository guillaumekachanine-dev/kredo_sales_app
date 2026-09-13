// ─── Modèle de lecture d'une étude publiée — module pur ─────────────────────
// Consommé par les vues Desktop / Mobile et le lecteur « Rapport complet ». Toute
// règle de restitution vit ici ; les composants ne font que du rendu.
//
// Deux lectures du même contenu, sans perte ni l'une ni l'autre :
//   - « Étude »        : le texte intégral, verbatim, rangé par section ;
//   - « Affirmations » : la couche qualifiée (badges, sources), filtrable par mode.

import {
  STUDY_QUALIFICATION_LABELS,
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  STUDY_SECTION_TITLES,
  type AccountStudyKnowledge,
  type StudyBlockKind,
  type StudyEntity,
  type StudyProducer,
  type StudyQualification,
  type StudySectionKey,
  type StudySourceType,
} from "./study-contracts"

// ─── Modes de lecture des affirmations ──────────────────────────────────────

export type StudyEpistemicMode = "strict" | "balanced" | "exploratory"

export const STUDY_EPISTEMIC_MODES: readonly { mode: StudyEpistemicMode; label: string; hint: string }[] = [
  { mode: "strict", label: "Strict", hint: "Établi et déclaré seulement" },
  { mode: "balanced", label: "Équilibré", hint: "+ déductions" },
  { mode: "exploratory", label: "Tout", hint: "Toutes les affirmations, hypothèses comprises" },
]

/** Tout par défaut : rien n'est masqué tant que l'utilisateur ne filtre pas. */
export const DEFAULT_STUDY_EPISTEMIC_MODE: StudyEpistemicMode = "exploratory"

const QUALIFICATIONS_BY_MODE: Record<StudyEpistemicMode, ReadonlySet<StudyQualification>> = {
  strict: new Set(["established", "declared"]),
  balanced: new Set(["established", "declared", "inferred"]),
  exploratory: new Set(STUDY_QUALIFICATIONS),
}

// ─── Vues ───────────────────────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<StudySourceType, string> = {
  regulatory_filing: "Registre ou texte officiel",
  press: "Presse",
  company_official: "Site de l'entreprise",
  specialised_study: "Étude spécialisée",
  other: "Autre source",
}

export type StudyDocumentView = {
  id: string
  label: string
  domain: string
  url: string
  publisher: string | null
  sourceTypeLabel: string
  citationNumbers: number[]
  citedInBlocks: number
  defaultQualified: boolean
}

export type StudyBlockView = {
  id: string
  index: number
  kind: StudyBlockKind
  text: string
  page: number | null
}

export type StudyStatementView = {
  id: string
  text: string
  qualification: StudyQualification
  qualificationLabel: string
  confidence: number
  documents: StudyDocumentView[]
  qualifiedByFallback: boolean
}

export type StudySectionView = {
  key: StudySectionKey
  number: number
  title: string
  blocks: StudyBlockView[]
  statements: StudyStatementView[]
  gaps: string[]
  documents: StudyDocumentView[]
}

export type StudyReportView = {
  title: string
  fileName: string
  producer: StudyProducer
  importedAt: string
  convertedAt: string
  entity: StudyEntity | null
  sections: StudySectionView[]
  /** Blocs dans l'ordre de l'étude : le rapport complet, tel quel. */
  orderedBlocks: StudyBlockView[]
  bibliography: StudyDocumentView[]
  statementCounts: Record<StudyQualification, number>
  banner: { tone: "sourced" | "alert"; title: string; body: string; metrics: string }
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export function buildStudyReportView(knowledge: AccountStudyKnowledge): StudyReportView {
  const documents: StudyDocumentView[] = knowledge.sources.map((source) => ({
    id: source.id,
    label: source.label,
    domain: source.domain,
    url: source.url,
    publisher: source.publisher,
    sourceTypeLabel: SOURCE_TYPE_LABELS[source.source_type] ?? "Source",
    citationNumbers: source.citation_numbers,
    citedInBlocks: source.cited_in_block_ids.length,
    defaultQualified: source.qualified_by === "default",
  }))
  const documentById = new Map(documents.map((document) => [document.id, document]))

  const orderedBlocks: StudyBlockView[] = [...knowledge.blocks]
    .sort((a, b) => a.index - b.index)
    .map((block) => ({ id: block.id, index: block.index, kind: block.kind, text: block.text, page: block.page }))

  const statementCounts = Object.fromEntries(STUDY_QUALIFICATIONS.map((q) => [q, 0])) as Record<StudyQualification, number>
  for (const statement of knowledge.statements) statementCounts[statement.qualification] += 1

  const sections: StudySectionView[] = []
  for (const key of STUDY_SECTION_KEYS) {
    const sectionBlocks = knowledge.blocks.filter((block) => block.section_key === key).sort((a, b) => a.index - b.index)
    const statements = knowledge.statements
      .filter((statement) => statement.section_key === key)
      .map((statement) => ({
        id: statement.id,
        text: statement.text,
        qualification: statement.qualification,
        qualificationLabel: STUDY_QUALIFICATION_LABELS[statement.qualification],
        confidence: statement.confidence,
        documents: statement.source_refs
          .map((ref) => documentById.get(ref))
          .filter((document): document is StudyDocumentView => Boolean(document)),
        qualifiedByFallback: statement.qualified_by === "fallback",
      }))
    const gaps = knowledge.gaps.filter((gap) => gap.section_key === key).map((gap) => gap.reason)
    if (sectionBlocks.length === 0 && statements.length === 0 && gaps.length === 0) continue

    const documentIds = new Set<string>()
    for (const block of sectionBlocks) for (const ref of block.source_refs) documentIds.add(ref)
    for (const statement of statements) for (const document of statement.documents) documentIds.add(document.id)

    sections.push({
      key,
      number: sections.length + 1,
      title: STUDY_SECTION_TITLES[key],
      blocks: sectionBlocks.map((block) => ({ id: block.id, index: block.index, kind: block.kind, text: block.text, page: block.page })),
      statements,
      gaps,
      documents: documents.filter((document) => documentIds.has(document.id)),
    })
  }

  const anchoring = knowledge.anchoring
  const sourced = anchoring.status === "sourced"
  return {
    title: knowledge.study.title,
    fileName: knowledge.study.file_name,
    producer: knowledge.study.producer,
    importedAt: knowledge.study.imported_at,
    convertedAt: knowledge.study.converted_at,
    entity: knowledge.entity,
    sections,
    orderedBlocks,
    bibliography: documents,
    statementCounts,
    banner: {
      tone: sourced ? "sourced" : "alert",
      title: sourced
        ? (knowledge.study.producer === "chatgpt_work"
          ? "Étude sourcée — ChatGPT Work"
          : "Étude sourcée — ChatGPT Deep Research")
        : "Étude sans source citée",
      body: sourced
        ? "Le texte de l'étude est restitué intégralement, section par section. Chaque affirmation qualifiée renvoie aux documents que l'étude cite."
        : "L'étude ne cite aucune URL : aucune affirmation ne peut être rattachée à une source consultable.",
      metrics: [
        plural(knowledge.sources.length, "document cité", "documents cités"),
        plural(knowledge.statements.length, "affirmation", "affirmations"),
        `${anchoring.statements_sourced}/${anchoring.statements_total} sourcées`,
        plural(knowledge.blocks.length, "bloc de texte", "blocs de texte"),
      ].join(" · "),
    },
  }
}

export function selectStatementsForMode(
  statements: readonly StudyStatementView[],
  mode: StudyEpistemicMode,
): { visible: StudyStatementView[]; hiddenCount: number } {
  const allowed = QUALIFICATIONS_BY_MODE[mode]
  const visible = statements.filter((statement) => allowed.has(statement.qualification))
  return { visible, hiddenCount: statements.length - visible.length }
}

export function countStatementsByMode(counts: Record<StudyQualification, number>): Record<StudyEpistemicMode, number> {
  const sum = (mode: StudyEpistemicMode) =>
    STUDY_QUALIFICATIONS.filter((q) => QUALIFICATIONS_BY_MODE[mode].has(q)).reduce((total, q) => total + counts[q], 0)
  return { strict: sum("strict"), balanced: sum("balanced"), exploratory: sum("exploratory") }
}

// ─── Texte verbatim → segments de rendu ─────────────────────────────────────

export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; url: string }
  | { kind: "citation"; label: string; url: string }

const INLINE_LINK = /\[((?:\\.|[^\]\\])*)\]\((https?:\/\/[^)\s]+)\)/g

/** Découpe une ligne verbatim en texte, liens et pastilles de citation — sans HTML. */
export function parseInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let cursor = 0
  for (const match of line.matchAll(INLINE_LINK)) {
    const index = match.index ?? 0
    if (index > cursor) segments.push({ kind: "text", text: line.slice(cursor, index) })
    const text = match[1].replace(/\\(.)/g, "$1")
    const url = match[2]
    if (text === "↗" || /^\d{1,3}$/.test(text)) segments.push({ kind: "citation", label: text, url })
    else segments.push({ kind: "link", text, url })
    cursor = index + match[0].length
  }
  if (cursor < line.length) segments.push({ kind: "text", text: line.slice(cursor) })
  return segments
}

/** Texte d'un bloc de titre, sans les dièses Markdown. */
export function headingText(text: string): string {
  return text.replace(/^#+\s+/, "")
}

/** Lignes d'un bloc de tableau : cellules séparées par ` | `. */
export function tableRows(text: string): string[][] {
  return text.split("\n").filter((line) => line.trim()).map((line) => line.split(" | ").map((cell) => cell.trim()))
}

export function listItems(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.replace(/^\s*(?:[•●▪◦–—*-]|\d{1,3}[.)])\s+/, ""))
}

/** Un paragraphe du PDF garde ses retours de ligne : à l'écran, ils redeviennent des espaces. */
export function paragraphText(text: string): string {
  return text.replace(/\s*\n\s*/g, " ")
}
