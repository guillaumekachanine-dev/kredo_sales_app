// ─── Études de recherche compte — contrat ───────────────────────────────────
//
// Une étude ChatGPT Deep Research (PDF) est stockée INTÉGRALEMENT, puis convertie en
// deux fichiers dérivés :
//   1. `AccountStudyKnowledge` — les briques d'information distribuées dans l'UI ;
//   2. le registre de sources au format Master Study E3 1.1 (`build-study-source-registry`).
//
// Le principe qui garantit l'absence de perte : le TEXTE n'est jamais produit par le
// modèle. Il est découpé en blocs de façon déterministe, et chaque bloc est restitué
// verbatim dans exactement une section. Le modèle ne fait que CLASSER les blocs,
// EXTRAIRE des affirmations qualifiées et QUALIFIER les sources — un bloc qu'il oublie
// de classer atterrit en annexe, une URL qu'il ne qualifie pas garde une qualification
// par défaut signalée. Rien de ce qu'il oublie ne disparaît.

export const STUDY_KNOWLEDGE_FORMAT = "kredo.account-study-knowledge" as const
export const STUDY_KNOWLEDGE_VERSION = 1 as const

export const STUDY_PRODUCER_DEEP_RESEARCH = "chatgpt_deep_research" as const
export const STUDY_PRODUCER_WORK = "chatgpt_work" as const

/** Producteur canonique du pipeline PDF historique */
export const STUDY_PRODUCER = STUDY_PRODUCER_DEEP_RESEARCH

export const STUDY_PRODUCERS = [
  STUDY_PRODUCER_DEEP_RESEARCH,
  STUDY_PRODUCER_WORK,
] as const

export type StudyProducer = (typeof STUDY_PRODUCERS)[number]

/** Modèle d'exécution des passes de conversion (exécuteur `mission-001-run`). */
export const STUDY_CONVERSION_MODEL = "claude-sonnet-5" as const

/** Préfixe `mission:` : la garde M-4 de `v_ai_intelligence_summary` exclut ces runs. */
export const STUDY_CONVERSION_RUN_TYPE = "mission:study-conversion" as const

/** `result_type` des résultats de passe (télémétrie de coût uniquement). */
export const STUDY_CONVERSION_PART_RESULT_TYPE = "study_conversion_part" as const

export const STUDY_STORAGE_BUCKET = "account_research_studies" as const

// ─── Sections ───────────────────────────────────────────────────────────────

export const STUDY_SECTION_KEYS = [
  "synthesis",
  "identity",
  "business_and_offering",
  "customers_and_market",
  "competition_and_positioning",
  "value_chain_and_dependencies",
  "history_ambitions_and_news",
  "implications_for_kredo",
  "appendix",
] as const

export type StudySectionKey = (typeof STUDY_SECTION_KEYS)[number]

export const STUDY_SECTION_TITLES: Record<StudySectionKey, string> = {
  synthesis: "Synthèse",
  identity: "Identité",
  business_and_offering: "Métier et offre",
  customers_and_market: "Clients et marché",
  competition_and_positioning: "Concurrence et positionnement",
  value_chain_and_dependencies: "Chaîne de valeur et dépendances",
  history_ambitions_and_news: "Histoire, ambitions et actualité",
  implications_for_kredo: "Implications pour KREDO",
  appendix: "Annexes de l'étude",
}

/** Définitions données au modèle pour classer un bloc — une seule section par bloc. */
export const STUDY_SECTION_DEFINITIONS: Record<StudySectionKey, string> = {
  synthesis: "résumé exécutif, vue d'ensemble, conclusions générales de l'étude",
  identity: "identité juridique (SIREN, forme, siège, NAF), dirigeants, actionnariat, gouvernance, effectifs, chiffres financiers publiés",
  business_and_offering: "métiers, activités, offres, produits et services, modèle de fonctionnement, implantations opérationnelles",
  customers_and_market: "clients, segments, zones couvertes, marché adressé, cadre tarifaire ou réglementaire du marché",
  competition_and_positioning: "concurrents, comparaisons, parts de marché, positionnement, avantages et faiblesses relatifs",
  value_chain_and_dependencies: "fournisseurs, partenaires, dépendances, réglementation et autorisations d'exercice, risques opérationnels, systèmes d'information",
  history_ambitions_and_news: "historique, dates clés, opérations capitalistiques, actualité, ambitions et projets annoncés",
  implications_for_kredo: "recommandations, angles commerciaux, besoins IT ou conseil, questions à creuser pour une ESN",
  appendix: "titre du document, sommaire, légendes, méthodologie, bibliographie, liste des sources, mentions techniques",
}

// ─── Qualifications ─────────────────────────────────────────────────────────

export const STUDY_QUALIFICATIONS = ["established", "declared", "inferred", "hypothesis"] as const
export type StudyQualification = (typeof STUDY_QUALIFICATIONS)[number]

export const STUDY_QUALIFICATION_LABELS: Record<StudyQualification, string> = {
  established: "Établi",
  declared: "Déclaré",
  inferred: "Déduit",
  hypothesis: "Hypothèse",
}

export const STUDY_QUALIFICATION_HINTS: Record<StudyQualification, string> = {
  established: "Fait attesté par une source citée par l'étude",
  declared: "Ce que l'entreprise affirme d'elle-même — jamais une vérité indépendante",
  inferred: "Déduction présentée par l'étude comme une analyse",
  hypothesis: "Piste ou supposition présentée comme telle",
}

// ─── Briques ────────────────────────────────────────────────────────────────

export type StudyBlockKind = "heading" | "paragraph" | "list" | "table" | "quote"

export type StudyBlock = {
  /** `B0001`… — stable pour une même étude, dérivé de l'ordre. */
  id: string
  /** Position dans l'étude, 0…n-1, contiguë. */
  index: number
  kind: StudyBlockKind
  /** Texte VERBATIM (Markdown léger : titres, listes, liens `[texte](url)`). */
  text: string
  heading_path: string[]
  page: number | null
  section_key: StudySectionKey
  classified_by: "model" | "fallback"
  /** Sources liées DANS le bloc, résolues de façon déterministe (liens du PDF). */
  source_refs: string[]
}

export type StudyStatementEntity = { kind: string; name: string }

export type StudyStatement = {
  id: string
  section_key: StudySectionKey
  text: string
  qualification: StudyQualification
  confidence: number
  source_refs: string[]
  block_ids: string[]
  entity: StudyStatementEntity | null
  qualified_by: "model" | "fallback"
}

export type StudySourceType =
  | "regulatory_filing"
  | "press"
  | "company_official"
  | "specialised_study"
  | "other"

export const STUDY_SOURCE_TYPES: readonly StudySourceType[] = [
  "regulatory_filing",
  "press",
  "company_official",
  "specialised_study",
  "other",
]

/** Un document cité par l'étude. */
export type StudySource = {
  /** `DOC-001`… — ce que citent les blocs et les affirmations. */
  id: string
  /** Autorité (domaine) du document : `SRC-001`…, identique dans le registre E3. */
  authority_id: string
  /** URL telle que citée par l'étude (paramètres de suivi compris). */
  url: string
  normalized_url: string
  domain: string
  label: string
  publisher: string | null
  source_type: StudySourceType
  /** Numéros des pastilles de citation de l'étude qui pointent vers ce document. */
  citation_numbers: number[]
  cited_in_block_ids: string[]
  /** Qualification de l'autorité : rendue par le modèle, ou par défaut (signalée). */
  qualified_by: "model" | "default"
}

export type StudyGap = { section_key: StudySectionKey; reason: string }

export type StudyEntity = {
  legal_name: string | null
  siren: string | null
  naf_code: string | null
  headquarters: string | null
}

export type StudyAnchoring = {
  sources_cited: number
  statements_total: number
  statements_sourced: number
  ratio: number
  status: "sourced" | "unsourced"
}

export type StudyConversionPartKind = "blocks" | "sources"

export type StudyCoverage = {
  text: {
    raw_chars: number
    raw_non_ws_chars: number
    blocks_non_ws_chars: number
    /** Invariant zéro perte : chaque caractère non blanc de l'étude est dans un bloc, dans l'ordre. */
    identical: boolean
  }
  blocks: {
    total: number
    classified_by_model: number
    fallback: number
    by_section: Record<StudySectionKey, number>
    without_statement: number
  }
  urls: {
    detected: number
    in_sources: number
    excluded: { url: string; reason: string }[]
  }
  statements: {
    total: number
    by_qualification: Record<StudyQualification, number>
    fallback_qualification: number
    unresolved_block_refs: number
    unresolved_source_refs: number
  }
  sources: {
    documents: number
    authorities: number
    authorities_model_qualified: number
    authorities_default_qualified: number
    /** Numéros de citation distincts rencontrés dans l'étude, tous rattachés à un document. */
    citation_numbers: number
  }
  registry: { importable: boolean; errors: string[] }
  entity_conflicts: { field: keyof StudyEntity; values: string[] }[]
  parts: { key: string; kind: StudyConversionPartKind; run_id: string }[]
}

export type AccountStudyKnowledge = {
  format: typeof STUDY_KNOWLEDGE_FORMAT
  version: typeof STUDY_KNOWLEDGE_VERSION
  study: {
    id: string
    company_id: string
    title: string
    producer: StudyProducer
    file_name: string
    raw_sha256: string
    raw_chars: number
    imported_at: string
    converted_at: string
    model: string
  }
  entity: StudyEntity | null
  blocks: StudyBlock[]
  statements: StudyStatement[]
  sources: StudySource[]
  gaps: StudyGap[]
  anchoring: StudyAnchoring
  coverage: StudyCoverage
}

// ─── Conversion ─────────────────────────────────────────────────────────────

export type StudyConversionPartPlan = {
  key: string
  kind: StudyConversionPartKind
  block_ids: string[]
  source_ids: string[]
}

/** Contenu de `account_research_studies.conversion`. */
export type StudyConversionState = {
  attempt: number
  started_at: string
  model: string
  parts: (StudyConversionPartPlan & { run_id: string })[]
}

export type StudyStatus = "extracted" | "converting" | "ready" | "failed"
