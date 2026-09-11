// ─── Restitution V4 — modèle de lecture (Account Intelligence, Lot 1) ───────
// Module pur : aucun accès base, pas de `server-only`. Il est consommé par les
// deux vues client (Desktop / Mobile) et par le lecteur « Rapport complet », qui
// ne font plus que du rendu. Toute règle de restitution vit ici, testée une fois.
//
// Doctrine appliquée (corpus `account_intelligence/`) :
//   - `04` §2.3 / §8 — le bandeau d'ancrage n'est pas décoratif : `research_status`
//     est lu via `resolveAccountKnowledgeAnchoring()`, jamais directement ;
//   - `04` §2.2 INV-2 — un agrégat interne (`internal:*`) n'est pas une preuve.
//     Il reste affiché quand un statement le cite, mais marqué comme tel ;
//   - `04` §4 — le mode (strict / équilibré / exploratoire) est un filtre de
//     lecture. Il ne change jamais la qualification d'un statement ;
//   - `02` §4 — le rapport complet est une visualisation du MÊME artefact.
//     `content_text` (quand n8n le remplit) n'est que la concaténation des
//     `narrative[]` ; le canal externe ne le remplit pas. Le lecteur repart donc
//     de `content_json`, identique pour les deux producteurs.

import {
  ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER,
  isInternalAggregateSourceId,
  resolveAccountKnowledgeAnchoring,
  type AccountKnowledgeAnchoringV4,
  type AccountKnowledgeContentV4,
  type AccountKnowledgeQualificationV4,
  type AccountKnowledgeResearchStatusV4,
  type AccountKnowledgeSourceV4,
  type AccountKnowledgeStatementEntityV4,
  type AccountKnowledgeV4SectionKey,
} from "./account-intelligence-contracts"

// ─── Qualifications et modes de lecture ─────────────────────────────────────

export const ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_ORDER = [
  "established",
  "declared",
  "inferred",
  "hypothesis",
] as const satisfies readonly AccountKnowledgeQualificationV4[]

export const ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_LABELS: Record<AccountKnowledgeQualificationV4, string> = {
  established: "Établi",
  declared: "Déclaré",
  inferred: "Déduit",
  hypothesis: "Hypothèse",
}

/** Sens court, affiché en infobulle et en légende — `04` §1. */
export const ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_HINTS: Record<AccountKnowledgeQualificationV4, string> = {
  established: "Établi par au moins une source externe consultée",
  declared: "Ce que l'organisation affirme d'elle-même — jamais une vérité indépendante",
  inferred: "Déduction raisonnable à partir de faits observables",
  hypothesis: "Piste à explorer, jamais promue en fait",
}

export type AccountKnowledgeEpistemicMode = "strict" | "balanced" | "exploratory"

export const ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES: readonly {
  mode: AccountKnowledgeEpistemicMode
  label: string
  hint: string
}[] = [
  { mode: "strict", label: "Strict", hint: "Établi et déclaré seulement" },
  { mode: "balanced", label: "Équilibré", hint: "+ déductions — lecture courante" },
  { mode: "exploratory", label: "Exploratoire", hint: "+ hypothèses — recherche d'angles" },
]

/** Défaut du contrat épistémique (`04` §4). */
export const DEFAULT_ACCOUNT_KNOWLEDGE_EPISTEMIC_MODE: AccountKnowledgeEpistemicMode = "balanced"

const QUALIFICATIONS_BY_MODE: Record<AccountKnowledgeEpistemicMode, ReadonlySet<AccountKnowledgeQualificationV4>> = {
  strict: new Set(["established", "declared"]),
  balanced: new Set(["established", "declared", "inferred"]),
  exploratory: new Set(["established", "declared", "inferred", "hypothesis"]),
}

export function isQualificationVisibleInMode(
  qualification: AccountKnowledgeQualificationV4,
  mode: AccountKnowledgeEpistemicMode,
): boolean {
  return QUALIFICATIONS_BY_MODE[mode].has(qualification)
}

// ─── Sources ────────────────────────────────────────────────────────────────

/**
 * `external`            document externe consulté (URL présente) — seule catégorie
 *                       recevable comme ancrage d'un `established` (INV-1) ;
 * `internal_record`     référence KREDO sans URL qui désigne une ligne ;
 * `internal_aggregate`  seau de contexte `internal:*` — jamais une preuve (INV-2) ;
 * `unresolved`          identifiant cité par un statement, absent de `sources[]`.
 */
export type AccountKnowledgeV4SourceKind =
  | "external"
  | "internal_record"
  | "internal_aggregate"
  | "unresolved"

export type AccountKnowledgeV4SourceView = {
  id: string
  /** Numéro global, stable dans tout le rapport (sections, statements, lecteur). */
  number: number
  kind: AccountKnowledgeV4SourceKind
  label: string
  sourceType: string | null
  sourceTypeLabel: string
  url: string | null
  domain: string | null
  consultedAt: string | null
  publishedAt: string | null
  excerpt: string | null
  /** Avertissement épistémique à afficher à côté de la source, si elle n'en est pas une. */
  caveat: string | null
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  regulatory_filing: "Registre ou texte officiel",
  company_official: "Site officiel",
  press: "Presse",
  specialised_study: "Étude spécialisée",
  internal_crm: "Donnée KREDO",
  internal_knowledge: "Connaissance KREDO",
  folio_legacy: "Étude FOLIO historique",
  other: "Autre source",
}

function sourceTypeLabel(sourceType: string | null): string {
  if (!sourceType) return "Source"
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType
}

function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function sourceKind(source: AccountKnowledgeSourceV4): AccountKnowledgeV4SourceKind {
  if (isInternalAggregateSourceId(source.id)) return "internal_aggregate"
  return source.url ? "external" : "internal_record"
}

function sourceCaveat(kind: AccountKnowledgeV4SourceKind, sourceType: string | null): string | null {
  if (sourceType === "folio_legacy") {
    return "Étude historique — indice de recherche, pas une preuve."
  }
  if (kind === "internal_aggregate") {
    return "Agrégat de contexte KREDO — ne désigne aucune ligne précise, n'est pas une preuve."
  }
  if (kind === "unresolved") {
    return "Référence citée mais absente de la liste des sources de l'artefact."
  }
  return null
}

/** Complément lu en base pour une source V4 désignant une ligne `intelligence_sources`. */
export type AccountKnowledgeV4SourceEvidence = {
  id: string
  excerpt: string | null
  publishedAt: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Identifiants de `sources[]` qui peuvent désigner une ligne `intelligence_sources`
 * (artefacts INTEL-030). Le canal externe porte des ids libres (`s1`, `src-01`…),
 * self-contained, qu'il ne faut surtout pas envoyer à un `IN (…)` sur une colonne
 * `uuid` : Postgres rejetterait la requête entière.
 */
export function collectAccountKnowledgeV4LookupSourceIds(content: AccountKnowledgeContentV4): string[] {
  return Array.from(
    new Set(
      (content.sources ?? [])
        .map((source) => source.id)
        .filter((id) => !isInternalAggregateSourceId(id) && UUID_PATTERN.test(id)),
    ),
  )
}

// ─── Statements, sections, rapport ──────────────────────────────────────────

export type AccountKnowledgeV4StatementView = {
  key: string
  text: string
  qualification: AccountKnowledgeQualificationV4
  qualificationLabel: string
  confidence: number
  entity: AccountKnowledgeStatementEntityV4 | null
  sources: AccountKnowledgeV4SourceView[]
  externallyAnchored: boolean
  /**
   * `established` ou `declared` sans aucune source externe : l'artefact enfreint le
   * contrat (INV-1 pour le premier, source nommée pour le second). Ne se produit
   * plus après le Lot 0 — mais les artefacts antérieurs restent en base et
   * doivent le dire à l'écran plutôt que d'afficher un badge « Établi » nu.
   */
  unanchoredClaim: boolean
}

export type AccountKnowledgeV4SectionView = {
  key: AccountKnowledgeV4SectionKey
  number: number
  title: string
  narrative: string[]
  statements: AccountKnowledgeV4StatementView[]
  /** Sources de la section (récit + statements), triées par numéro global. */
  sources: AccountKnowledgeV4SourceView[]
  gaps: string[]
}

export type AccountKnowledgeV4Banner = {
  status: AccountKnowledgeResearchStatusV4
  tone: "anchored" | "alert"
  title: string
  body: string
  metrics: string
}

export type AccountKnowledgeV4Producer = {
  kind: "external_research" | "kredo_engine"
  label: string
}

export type AccountKnowledgeV4Entity = {
  legalName: string | null
  siren: string | null
  nafCode: string | null
  headquarters: string | null
}

export type AccountKnowledgeV4ReportView = {
  anchoring: AccountKnowledgeAnchoringV4
  banner: AccountKnowledgeV4Banner
  producer: AccountKnowledgeV4Producer
  entity: AccountKnowledgeV4Entity
  sections: AccountKnowledgeV4SectionView[]
  /** Toutes les sources de l'artefact, numérotées — bibliographie du rapport. */
  bibliography: AccountKnowledgeV4SourceView[]
  statementCounts: Record<AccountKnowledgeQualificationV4, number>
  generatedAt: string | null
}

const FALLBACK_SECTION_TITLES: Record<AccountKnowledgeV4SectionKey, string> = {
  synthesis: "Synthèse",
  identity: "Identité",
  business_and_offering: "Métier et offre",
  customers_and_market: "Clients et marché",
  competition_and_positioning: "Concurrence et positionnement",
  value_chain_and_dependencies: "Chaîne de valeur et dépendances",
  history_ambitions_and_news: "Histoire, ambitions et actualité",
  implications_for_kredo: "Implications pour KREDO",
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular
}

export function buildAccountKnowledgeV4Banner(anchoring: AccountKnowledgeAnchoringV4): AccountKnowledgeV4Banner {
  const docs = anchoring.external_documents_used
  const metrics =
    `${docs} ${plural(docs, "document externe cité", "documents externes cités")} · ` +
    `${anchoring.statements_externally_anchored}/${anchoring.statements_total} ` +
    `${plural(anchoring.statements_total, "affirmation ancrée", "affirmations ancrées")} ` +
    `(${formatPercent(anchoring.anchoring_ratio)})`

  if (anchoring.research_status === "internal_only") {
    return {
      status: "internal_only",
      tone: "alert",
      title: "Analyse sans source externe",
      // Phrase imposée par `04` §8 — traduction à l'écran de l'axiome A2.
      body: "Analyse produite sans consultation de source externe — fondée sur les données KREDO et le registre légal.",
      metrics,
    }
  }

  if (anchoring.research_status === "degraded") {
    return {
      status: "degraded",
      tone: "alert",
      title: "Collecte externe en échec — analyse non ancrée",
      body:
        "Des sources externes étaient attendues, aucune n'a pu être lue. Le rapport repose sur les données KREDO " +
        "et le registre légal : ses affirmations ne sont pas adossées à un document externe consulté.",
      metrics,
    }
  }

  const minorityAnchored = anchoring.statements_total > 0 && anchoring.anchoring_ratio < 0.5
  return {
    status: "nominal",
    tone: minorityAnchored ? "alert" : "anchored",
    title: "Analyse ancrée sur des sources externes consultées",
    body: minorityAnchored
      ? "Des documents externes ont été lus, mais la majorité des affirmations ne s'y adosse pas : lire les badges et les sources avant de s'appuyer sur un point."
      : "Chaque affirmation porte sa qualification et ses sources, consultables au niveau de l'affirmation.",
    metrics,
  }
}

function buildEntity(content: AccountKnowledgeContentV4): AccountKnowledgeV4Entity {
  const resolution = content.entity_resolution
  const headquarters =
    resolution?.hq_location ??
    ([resolution?.hq_commune, resolution?.hq_postal_code ? `(${resolution.hq_postal_code})` : null]
      .filter(Boolean)
      .join(" ") ||
      null)

  return {
    legalName: resolution?.legal_name ?? null,
    siren: resolution?.siren ?? null,
    nafCode: resolution?.naf_code ?? null,
    headquarters,
  }
}

export function formatSiren(siren: string | null): string | null {
  if (!siren) return null
  const digits = siren.replace(/\s+/g, "")
  return /^\d{9}$/.test(digits) ? digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : siren
}

/**
 * Construit le modèle de lecture complet d'un artefact V4, indépendamment de son
 * producteur (INTEL-030 ou canal externe) : un consommateur aval ne doit jamais
 * pouvoir les distinguer, sauf par le libellé de provenance (`10` §5).
 */
export function buildAccountKnowledgeV4View(
  content: AccountKnowledgeContentV4,
  evidence: readonly AccountKnowledgeV4SourceEvidence[] = [],
): AccountKnowledgeV4ReportView {
  const evidenceById = new Map(evidence.map((row) => [row.id, row]))

  // 1. Bibliographie numérotée dans l'ordre de `sources[]` : un même numéro désigne
  //    la même source partout, sections, statements et lecteur « Rapport complet ».
  const byId = new Map<string, AccountKnowledgeV4SourceView>()
  const bibliography: AccountKnowledgeV4SourceView[] = []

  for (const source of content.sources ?? []) {
    if (byId.has(source.id)) continue
    const kind = sourceKind(source)
    const complement = evidenceById.get(source.id)
    const view: AccountKnowledgeV4SourceView = {
      id: source.id,
      number: bibliography.length + 1,
      kind,
      label: source.label || source.url || source.id,
      sourceType: source.source_type ?? null,
      sourceTypeLabel: sourceTypeLabel(source.source_type ?? null),
      url: source.url ?? null,
      domain: extractDomain(source.url ?? null),
      consultedAt: source.consulted_at ?? null,
      publishedAt: complement?.publishedAt ?? null,
      excerpt: complement?.excerpt?.trim() || null,
      caveat: sourceCaveat(kind, source.source_type ?? null),
    }
    byId.set(source.id, view)
    bibliography.push(view)
  }

  const resolveRef = (ref: string): AccountKnowledgeV4SourceView => {
    const known = byId.get(ref)
    if (known) return known
    const kind: AccountKnowledgeV4SourceKind = isInternalAggregateSourceId(ref) ? "internal_aggregate" : "unresolved"
    const view: AccountKnowledgeV4SourceView = {
      id: ref,
      number: bibliography.length + 1,
      kind,
      label: ref,
      sourceType: null,
      sourceTypeLabel: kind === "internal_aggregate" ? "Donnée KREDO" : "Référence non résolue",
      url: null,
      domain: null,
      consultedAt: null,
      publishedAt: null,
      excerpt: null,
      caveat: sourceCaveat(kind, null),
    }
    byId.set(ref, view)
    bibliography.push(view)
    return view
  }

  // 2. Lacunes regroupées par section ; une lacune dont la section n'est pas
  //    rédigée fait quand même apparaître la section — une absence déclarée est
  //    une information, pas un vide à masquer.
  const gapsBySection = new Map<AccountKnowledgeV4SectionKey, string[]>()
  for (const gap of content.knowledge_gaps ?? []) {
    const reason = gap.reason?.trim()
    if (!reason) continue
    const list = gapsBySection.get(gap.section_key) ?? []
    list.push(reason)
    gapsBySection.set(gap.section_key, list)
  }

  const rawSections = new Map((content.sections ?? []).map((section) => [section.key, section]))
  const orderedKeys: AccountKnowledgeV4SectionKey[] = [
    ...ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER.filter((key) => rawSections.has(key) || gapsBySection.has(key)),
  ]

  const statementCounts: Record<AccountKnowledgeQualificationV4, number> = {
    established: 0,
    declared: 0,
    inferred: 0,
    hypothesis: 0,
  }

  const sections: AccountKnowledgeV4SectionView[] = []

  for (const key of orderedKeys) {
    const raw = rawSections.get(key)
    const narrative = (raw?.narrative ?? []).map((paragraph) => paragraph.trim()).filter(Boolean)
    const gaps = gapsBySection.get(key) ?? []

    const statements: AccountKnowledgeV4StatementView[] = (raw?.statements ?? [])
      .filter((statement) => statement.text?.trim())
      .map((statement, index) => {
        const sources = Array.from(new Set(statement.source_refs ?? []))
          .map(resolveRef)
          .sort((a, b) => a.number - b.number)
        const externallyAnchored = sources.some((source) => source.kind === "external")
        statementCounts[statement.qualification] += 1
        return {
          key: `${key}-${index}`,
          text: statement.text.trim(),
          qualification: statement.qualification,
          qualificationLabel: ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_LABELS[statement.qualification],
          confidence: statement.confidence,
          entity: statement.entity ?? null,
          sources,
          externallyAnchored,
          unanchoredClaim:
            (statement.qualification === "established" || statement.qualification === "declared") &&
            !externallyAnchored,
        }
      })

    if (narrative.length === 0 && statements.length === 0 && gaps.length === 0) continue

    const sectionSourceIds = new Set<string>(raw?.source_refs ?? [])
    for (const statement of statements) {
      for (const source of statement.sources) sectionSourceIds.add(source.id)
    }
    const sectionSources = Array.from(sectionSourceIds)
      .map(resolveRef)
      .sort((a, b) => a.number - b.number)

    sections.push({
      key,
      number: sections.length + 1,
      title: raw?.title?.trim() || FALLBACK_SECTION_TITLES[key],
      narrative,
      statements,
      sources: sectionSources,
      gaps,
    })
  }

  const anchoring = resolveAccountKnowledgeAnchoring(content)

  return {
    anchoring,
    banner: buildAccountKnowledgeV4Banner(anchoring),
    producer:
      content.entity_resolution?.method === "external_research"
        ? { kind: "external_research", label: "Recherche externe approfondie, importée" }
        : { kind: "kredo_engine", label: "Moteur KREDO" },
    entity: buildEntity(content),
    sections,
    bibliography,
    statementCounts,
    generatedAt: content.generated_at ?? null,
  }
}

/** Statements visibles dans le mode courant, et combien le mode en masque. */
export function selectStatementsForMode(
  statements: readonly AccountKnowledgeV4StatementView[],
  mode: AccountKnowledgeEpistemicMode,
): { visible: AccountKnowledgeV4StatementView[]; hiddenCount: number } {
  const visible = statements.filter((statement) => isQualificationVisibleInMode(statement.qualification, mode))
  return { visible, hiddenCount: statements.length - visible.length }
}

/** Nombre de statements affichés par mode — alimente le sélecteur. */
export function countStatementsByMode(
  counts: Record<AccountKnowledgeQualificationV4, number>,
): Record<AccountKnowledgeEpistemicMode, number> {
  const sum = (mode: AccountKnowledgeEpistemicMode) =>
    ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_ORDER.filter((q) => isQualificationVisibleInMode(q, mode)).reduce(
      (total, q) => total + counts[q],
      0,
    )
  return { strict: sum("strict"), balanced: sum("balanced"), exploratory: sum("exploratory") }
}

/** Libellé de couverture pour le bandeau de mise à jour (`AccountKnowledgeUpdateControls`). */
export function formatAccountKnowledgeV4Coverage(content: AccountKnowledgeContentV4): string {
  const anchoring = resolveAccountKnowledgeAnchoring(content)
  if (anchoring.statements_total === 0) return "Aucune affirmation publiée"
  return `${anchoring.statements_externally_anchored}/${anchoring.statements_total} affirmations ancrées sur une source externe (${formatPercent(anchoring.anchoring_ratio)})`
}
