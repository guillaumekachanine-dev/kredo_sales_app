// Contrat du plan de sources — artefact produit par INTEL-035 (account-source-preflight).
// Spécification : docs/FEATURES/cockpit_intelligence_features/account_intelligence/05-CONTRAT-SOURCE-PLAN-INTEL-035.md
//
// Règle fondatrice : le plan ne contient que du RÉCUPÉRÉ.
// Un preflight qui propose des URL candidates sans les avoir lues ne règle rien — il fait
// valider à l'utilisateur une liste de sources dont aucune ne sera exploitable, et transforme
// un défaut technique silencieux en illusion co-signée. Ce qui a échoué figure dans le plan
// avec son motif, pour être VU, jamais pour être analysé.

import type { EntityResolutionSnapshot } from "./entity-resolution"
import type {
  AccountIntelligenceLevel,
  AccountIntelligenceModule,
} from "./account-intelligence-modules"

export const ACCOUNT_SOURCE_PLAN_RESULT_TYPE = "account_source_plan" as const
export const ACCOUNT_SOURCE_PLAN_SCHEMA_VERSION = 1 as const

/** Aligné sur `account_source_documents.kind` (contrainte CHECK en base). */
export const SOURCE_KINDS = [
  "registry",
  "company_official",
  "press",
  "specialised_study",
  "regulatory",
  "job_board",
  "internal",
] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

/** Aligné sur `account_source_documents.origin`. */
export const SOURCE_ORIGINS = ["discovered", "manual", "corpus", "catalog"] as const
export type SourceOrigin = (typeof SOURCE_ORIGINS)[number]

/**
 * Statut d'une entrée DANS LE PLAN — distinct du statut du document en base.
 *
 * `account_source_documents.status` ne connaît que `retrieved` / `unreachable` : c'est un
 * fait technique, immuable. `recommended` / `approved` / `excluded` sont des décisions
 * humaines, mutables, qui vivent ici et nulle part ailleurs. Confondre les deux ferait du
 * store de preuve une table de curation.
 */
export const SOURCE_PLAN_ENTRY_STATUSES = [
  "recommended",
  "approved",
  "excluded",
  "unreachable",
] as const
export type SourcePlanEntryStatus = (typeof SOURCE_PLAN_ENTRY_STATUSES)[number]

export type AccountSourcePlanEntry = {
  /** `account_source_documents.id` — devient une source_ref citable par INTEL-030. */
  id: string
  url: string
  canonical_url: string | null
  domain: string
  kind: SourceKind
  title: string | null
  published_at: string | null
  /** Pourquoi cette source est proposée, en une phrase lisible par un commercial. */
  reason: string
  serves_modules: AccountIntelligenceModule[]
  status: SourcePlanEntryStatus
  origin: SourceOrigin

  /** Renseignés si et seulement si le document a été récupéré. */
  fetched_at: string | null
  content_hash: string | null
  extracted_chars: number | null
  /** Renseigné si et seulement si `status === "unreachable"`. */
  failure_reason: string | null
}

export type AccountSourcePlanCorpus = {
  id: string
  label: string
  item_count: number
}

export interface AccountSourcePlanContent {
  schema_version: 1
  company_id: string
  entity_resolution: EntityResolutionSnapshot
  scope: {
    target_level: AccountIntelligenceLevel
    modules: AccountIntelligenceModule[]
  }
  entries: AccountSourcePlanEntry[]
  corpora: AccountSourcePlanCorpus[]
  coverage: {
    modules_with_material: AccountIntelligenceModule[]
    modules_without_material: AccountIntelligenceModule[]
  }
  generated_at: string
}

/** Politique de collecte du run d'analyse consommateur. */
export const SOURCE_POLICIES = ["approved_only", "allow_gap_discovery"] as const
export type SourcePolicy = (typeof SOURCE_POLICIES)[number]

// ─── Prédicats de lecture ───────────────────────────────────────────────────
// Utilisés par l'UI et par le dispatcher. Ils encodent une seule idée : une entrée
// n'est exploitable que si elle a été lue ET retenue.

export function isRetrieved(entry: AccountSourcePlanEntry): boolean {
  return entry.status !== "unreachable" && entry.content_hash !== null
}

export function isUsable(entry: AccountSourcePlanEntry): boolean {
  return isRetrieved(entry) && entry.status !== "excluded"
}

/** Entrées que le run d'analyse recevra effectivement. */
export function selectUsableEntries(
  plan: AccountSourcePlanContent
): AccountSourcePlanEntry[] {
  return plan.entries.filter(isUsable)
}

export function countUnreachable(plan: AccountSourcePlanContent): number {
  return plan.entries.filter((entry) => entry.status === "unreachable").length
}

/**
 * A2 appliqué au lancement : un run qui exige de la recherche externe ne démarre pas
 * sur un plan sans matière. Retourne les modules demandés qu'aucune entrée exploitable
 * ne sert — c'est ce que l'utilisateur doit voir AVANT de dépenser un token.
 */
export function modulesLeftWithoutMaterial(
  plan: AccountSourcePlanContent,
  requestedModules: AccountIntelligenceModule[]
): AccountIntelligenceModule[] {
  const served = new Set<AccountIntelligenceModule>()
  for (const entry of selectUsableEntries(plan)) {
    for (const moduleId of entry.serves_modules) served.add(moduleId)
  }
  return requestedModules.filter((moduleId) => !served.has(moduleId))
}
