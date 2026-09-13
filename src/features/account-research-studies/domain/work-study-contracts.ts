// ─── Contrats d'entrée ChatGPT Work — module pur ──────────────────────────────
//
// ChatGPT Work produit deux livrables JSON structurés :
//   1. Account Intelligence (`WorkAccountIntelligence`) : l'étude structurée avec
//      sections, prose verbatim (`narrative`), affirmations qualifiées (`statements`),
//      sources citées et lacunes (`knowledge_gaps`).
//   2. Source Corpus (`WorkSourceCorpus`) : le corpus de sources regroupé par
//      autorité/domaine, contenant chaque document/URL réellement utilisé (`documents_used`).
//
// Ces types sont des contrats d'ENTRÉE. Ils ne remplacent pas `AccountStudyKnowledge`
// qui demeure le contrat canonique pivot de Kredo.

import type {
  StudyQualification,
  StudySectionKey,
  StudySourceType,
} from "./study-contracts"

export const WORK_ACCOUNT_INTELLIGENCE_SCHEMA_VERSION = 4 as const
export const WORK_SOURCE_CORPUS_SCHEMA_VERSION = 1 as const

// ─── Account Intelligence ───────────────────────────────────────────────────

export type WorkEntityResolution = {
  decision: string
  method: string
  legal_name: string
  siren: string | null
  naf_code: string | null
  hq_location: string | null
  reasons?: string[]
}

export type WorkStatement = {
  text: string
  qualification: StudyQualification
  source_refs: string[]
  confidence: number
}

export type WorkSection = {
  key: StudySectionKey
  title: string
  narrative: string[]
  statements: WorkStatement[]
  source_refs?: string[]
}

export type WorkSourceReference = {
  id: string
  label: string
  source_type: StudySourceType | string
  url: string
  consulted_at?: string | null
}

export type WorkKnowledgeGap = {
  section_key: StudySectionKey
  gap: string
}

export type WorkAccountIntelligence = {
  schema_version: number
  entity_resolution: WorkEntityResolution
  sections: WorkSection[]
  sources: WorkSourceReference[]
  knowledge_gaps: WorkKnowledgeGap[]
  generated_at?: string
  /** Conservation non destructive des champs additionnels pour traçabilité */
  extra_fields?: Record<string, unknown>
}

// ─── Source Corpus ──────────────────────────────────────────────────────────

export type WorkCorpusMeta = {
  name: string
  account_name: string
  scope: string
  geography: string
  generated_at?: string
}

export type WorkDocumentUsed = {
  source_ref: string
  title: string
  url: string
  published_at?: string | null
  consulted_at?: string | null
  used_in_sections?: string[]
}

export type WorkSourceAuthority = {
  name: string
  domain: string
  publisher?: string | null
  source_type?: StudySourceType | string | null
  description?: string | null
  information_types?: string[]
  primary_language?: string | null
  primary_geography?: string | null
  confidence?: number | null
  documents_used: WorkDocumentUsed[]
}

export type WorkSourceCorpus = {
  schema_version: number
  corpus: WorkCorpusMeta
  sources: WorkSourceAuthority[]
  /** Conservation non destructive des champs additionnels pour traçabilité */
  extra_fields?: Record<string, unknown>
}

// ─── Résultats de parsing et validation ──────────────────────────────────────

export type WorkStudyParseIssue = {
  path: string
  message: string
}

export type WorkStudyParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: WorkStudyParseIssue[] }

export type WorkBundleValidationIssue = {
  path: string
  message: string
  severity: "error" | "warning"
}

export type WorkBundleValidationResult = {
  ok: boolean
  issues: WorkBundleValidationIssue[]
}
