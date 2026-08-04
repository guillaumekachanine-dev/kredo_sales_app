// ─── Validateurs runtime des artefacts d'intelligence ───────────────────────
// Lot 0. Ces validateurs sont la seule barrière entre une sortie de moteur
// (LLM ou déterministe) et le stockage : ils s'exécutent sur du `unknown`, pas
// sur du typé. Un `as AccountKnowledgeContentV2` ne prouve rien à l'exécution.
//
// Doctrine appliquée :
//   - une affirmation factuelle sans source est REFUSÉE, pas dégradée ;
//   - aucun défaut de valeur n'est inventé pour « réparer » un artefact ;
//   - les erreurs portent un chemin JSON, pour être localisables.
//
// Aucune dépendance externe (pas de zod) : le projet n'en a pas, et ces
// schémas sont trop imbriqués/versionnés pour qu'un DSL apporte plus que le
// coût d'une dépendance de plus.

import {
  isPlaceholderText,
  type Claim,
  type DeterministicIndicator,
  type QualitySummary,
} from "./intelligence-common-contracts"
import type {
  AccountKnowledgeArtifact,
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
} from "./account-intelligence-contracts"
import type { SectorIntelligenceAnalysisContent } from "./sector-intelligence-contracts"

// ─── Résultat de validation ─────────────────────────────────────────────────

export type ValidationIssue = {
  /** Chemin JSON dans l'artefact, ex. "market_positioning.threats[1].source_refs". */
  path: string
  message: string
}

export type ValidationResult<T> =
  | { valid: true; value: T; issues: [] }
  | { valid: false; value: null; issues: ValidationIssue[] }

function ok<T>(value: T): ValidationResult<T> {
  return { valid: true, value, issues: [] }
}

function fail<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { valid: false, value: null, issues }
}

// ─── Primitives ─────────────────────────────────────────────────────────────

// RFC 4122 — accepte les versions 1-8, majuscules ou minuscules. Volontairement
// strict : `source_refs` doit contenir de vrais `intelligence_sources.id`, une
// chaîne libre trahirait une source inventée par le moteur.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false
  return !Number.isNaN(new Date(value).getTime())
}

// ─── Claim ──────────────────────────────────────────────────────────────────

export function validateClaim(raw: unknown, path: string): ValidationResult<Claim> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path, message: "Claim attendu : objet requis." }])
  }

  if (typeof raw.text !== "string" || raw.text.trim().length === 0) {
    issues.push({ path: `${path}.text`, message: "Texte requis et non vide." })
  } else if (isPlaceholderText(raw.text)) {
    issues.push({
      path: `${path}.text`,
      message: `Marqueur d'absence interdit comme contenu métier ("${raw.text.trim()}").`,
    })
  }

  if (raw.nature !== "fact" && raw.nature !== "analysis") {
    issues.push({ path: `${path}.nature`, message: 'Nature attendue : "fact" ou "analysis".' })
  }

  if (!Array.isArray(raw.source_refs)) {
    issues.push({ path: `${path}.source_refs`, message: "Tableau d'UUID requis." })
  } else {
    // Les DEUX natures exigent au moins une source : un "fact" doit être
    // vérifiable, une "analysis" doit citer les faits qu'elle mobilise.
    if (raw.source_refs.length === 0) {
      issues.push({
        path: `${path}.source_refs`,
        message:
          raw.nature === "analysis"
            ? "Analyse sans chaîne de sources : les faits mobilisés doivent être cités."
            : "Fait non sourcé : au moins une source requise.",
      })
    }
    raw.source_refs.forEach((ref, index) => {
      if (!isUuid(ref)) {
        issues.push({
          path: `${path}.source_refs[${index}]`,
          message: "UUID de source invalide.",
        })
      }
    })
  }

  if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence)) {
    issues.push({ path: `${path}.confidence`, message: "Confiance numérique requise." })
  } else if (raw.confidence < 0 || raw.confidence > 1) {
    issues.push({ path: `${path}.confidence`, message: "Confiance hors bornes [0, 1]." })
  }

  if (raw.verified_at !== null && !isIsoDateString(raw.verified_at)) {
    issues.push({ path: `${path}.verified_at`, message: "Date ISO ou null attendu." })
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as Claim)
}

/** Claim optionnel : `null` accepté, mais un objet présent doit être valide. */
function validateNullableClaim(raw: unknown, path: string): ValidationIssue[] {
  if (raw === null) return []
  if (raw === undefined) return [{ path, message: "Champ requis (Claim ou null explicite)." }]
  const result = validateClaim(raw, path)
  return result.valid ? [] : result.issues
}

function validateClaimArray(raw: unknown, path: string): ValidationIssue[] {
  if (!Array.isArray(raw)) return [{ path, message: "Tableau de Claim requis." }]
  return raw.flatMap((item, index) => {
    const result = validateClaim(item, `${path}[${index}]`)
    return result.valid ? [] : result.issues
  })
}

// ─── DeterministicIndicator ─────────────────────────────────────────────────

export function validateDeterministicIndicator(
  raw: unknown,
  path: string,
): ValidationResult<DeterministicIndicator> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path, message: "DeterministicIndicator attendu : objet requis." }])
  }

  if (typeof raw.label !== "string" || raw.label.trim().length === 0) {
    issues.push({ path: `${path}.label`, message: "Libellé requis." })
  }

  // `null` est significatif : « non calculable ». Distinct de 0.
  if (raw.score !== null) {
    if (typeof raw.score !== "number" || !Number.isFinite(raw.score)) {
      issues.push({ path: `${path}.score`, message: "Score numérique ou null attendu." })
    }
  }

  if (!isIsoDateString(raw.period_start)) {
    issues.push({ path: `${path}.period_start`, message: "Date ISO requise." })
  }
  if (!isIsoDateString(raw.period_end)) {
    issues.push({ path: `${path}.period_end`, message: "Date ISO requise." })
  }
  if (
    isIsoDateString(raw.period_start) &&
    isIsoDateString(raw.period_end) &&
    new Date(raw.period_end).getTime() < new Date(raw.period_start).getTime()
  ) {
    issues.push({ path: `${path}.period_end`, message: "Fin de période antérieure au début." })
  }

  if (typeof raw.evidence_count !== "number" || !Number.isInteger(raw.evidence_count) || raw.evidence_count < 0) {
    issues.push({ path: `${path}.evidence_count`, message: "Entier positif ou nul requis." })
  }

  if (typeof raw.method_version !== "string" || raw.method_version.trim().length === 0) {
    issues.push({ path: `${path}.method_version`, message: "Version de méthode requise." })
  }

  if (!Array.isArray(raw.source_refs)) {
    issues.push({ path: `${path}.source_refs`, message: "Tableau d'UUID requis." })
  } else {
    raw.source_refs.forEach((ref, index) => {
      if (!isUuid(ref)) {
        issues.push({ path: `${path}.source_refs[${index}]`, message: "UUID de source invalide." })
      }
    })
    // Un score calculé sans aucune preuve observée est incohérent : soit la
    // méthode n'avait rien à mesurer (score null), soit elle cite ses éléments.
    if (raw.score !== null && raw.source_refs.length === 0) {
      issues.push({
        path: `${path}.source_refs`,
        message: "Indicateur chiffré sans source : score non justifiable.",
      })
    }
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as DeterministicIndicator)
}

// ─── QualitySummary ─────────────────────────────────────────────────────────

export function validateQualitySummary(raw: unknown, path: string): ValidationResult<QualitySummary> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path, message: "QualitySummary attendu : objet requis." }])
  }

  const counters: Array<keyof QualitySummary> = ["displayed_claims", "sourced_claims"]
  for (const key of counters) {
    const value = raw[key]
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      issues.push({ path: `${path}.${key}`, message: "Entier positif ou nul requis." })
    }
  }

  if (
    typeof raw.displayed_claims === "number" &&
    typeof raw.sourced_claims === "number" &&
    raw.sourced_claims > raw.displayed_claims
  ) {
    issues.push({
      path: `${path}.sourced_claims`,
      message: "Plus de claims sourcés que de claims affichés.",
    })
  }

  if (typeof raw.coverage_rate !== "number" || !Number.isFinite(raw.coverage_rate)) {
    issues.push({ path: `${path}.coverage_rate`, message: "Taux numérique requis." })
  } else if (raw.coverage_rate < 0 || raw.coverage_rate > 1) {
    issues.push({ path: `${path}.coverage_rate`, message: "Taux hors bornes [0, 1]." })
  }

  const pathLists: Array<keyof QualitySummary> = [
    "missing_source_paths",
    "stale_source_paths",
    "contradiction_paths",
  ]
  for (const key of pathLists) {
    const value = raw[key]
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      issues.push({ path: `${path}.${key}`, message: "Tableau de chemins (string) requis." })
    }
  }

  if (typeof raw.passed !== "boolean") {
    issues.push({ path: `${path}.passed`, message: "Booléen requis." })
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as QualitySummary)
}

// ─── AccountKnowledge V1 ────────────────────────────────────────────────────
// V1 est du LEGACY GÉNÉRÉ : il existe déjà des lignes en base. Le validateur
// vérifie donc la forme, sans exiger le sourcing introduit en V2 — appliquer
// rétroactivement la règle de sourcing invaliderait des artefacts réels qu'on
// n'a aucun moyen de re-sourcer.

const V1_FACT_SECTIONS = [
  "identity_positioning",
  "commercial_relationship",
  "organisation_observed",
  "frictions_and_signals",
  "open_questions",
] as const

export function validateAccountKnowledgeV1(raw: unknown): ValidationResult<AccountKnowledgeContent> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path: "$", message: "Objet requis." }])
  }
  if (raw.schema_version !== 1) {
    return fail([{ path: "$.schema_version", message: "schema_version attendu : 1." }])
  }

  for (const section of V1_FACT_SECTIONS) {
    const value = raw[section]
    if (!Array.isArray(value)) {
      issues.push({ path: `$.${section}`, message: "Section obligatoire absente ou non tableau." })
      continue
    }
    value.forEach((fact, index) => {
      const factPath = `$.${section}[${index}]`
      if (!isRecord(fact)) {
        issues.push({ path: factPath, message: "Objet fait attendu." })
        return
      }
      if (typeof fact.text !== "string" || fact.text.trim().length === 0) {
        issues.push({ path: `${factPath}.text`, message: "Texte requis." })
      }
      if (typeof fact.provenance !== "string" || fact.provenance.trim().length === 0) {
        issues.push({ path: `${factPath}.provenance`, message: "Provenance requise." })
      }
    })
  }

  if (!Array.isArray(raw.key_contacts)) {
    issues.push({ path: "$.key_contacts", message: "Section obligatoire absente ou non tableau." })
  } else {
    raw.key_contacts.forEach((contact, index) => {
      const contactPath = `$.key_contacts[${index}]`
      if (!isRecord(contact)) {
        issues.push({ path: contactPath, message: "Objet contact attendu." })
        return
      }
      if (!isUuid(contact.contact_id)) {
        issues.push({ path: `${contactPath}.contact_id`, message: "UUID de contact invalide." })
      }
    })
  }

  if (!isIsoDateString(raw.generated_at)) {
    issues.push({ path: "$.generated_at", message: "Date ISO requise." })
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as AccountKnowledgeContent)
}

// ─── AccountKnowledge V2 ────────────────────────────────────────────────────

export function validateAccountKnowledgeV2(raw: unknown): ValidationResult<AccountKnowledgeContentV2> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path: "$", message: "Objet requis." }])
  }
  if (raw.schema_version !== 2) {
    return fail([{ path: "$.schema_version", message: "schema_version attendu : 2." }])
  }

  // identity
  if (!isRecord(raw.identity)) {
    issues.push({ path: "$.identity", message: "Section obligatoire absente." })
  } else {
    for (const key of ["primary_activity", "headquarters", "revenue", "employee_count"] as const) {
      issues.push(...validateNullableClaim(raw.identity[key], `$.identity.${key}`))
    }
    // `dynamic` n'est PAS un Claim : c'est un indicateur déterministe calculé
    // hors LLM (account-dynamic-v1) et injecté côté applicatif. `null` est donc
    // l'état légitime d'un artefact tout juste sorti du workflow.
    if (raw.identity.dynamic !== null && raw.identity.dynamic !== undefined) {
      const dynamic = validateDeterministicIndicator(raw.identity.dynamic, "$.identity.dynamic")
      if (!dynamic.valid) issues.push(...dynamic.issues)
    } else if (raw.identity.dynamic === undefined) {
      issues.push({
        path: "$.identity.dynamic",
        message: "Champ requis (DeterministicIndicator ou null explicite).",
      })
    }
  }

  issues.push(...validateNullableClaim(raw.account_summary, "$.account_summary"))

  // market_positioning
  if (!isRecord(raw.market_positioning)) {
    issues.push({ path: "$.market_positioning", message: "Section obligatoire absente." })
  } else {
    const mp = raw.market_positioning
    issues.push(...validateNullableClaim(mp.positioning, "$.market_positioning.positioning"))
    issues.push(...validateNullableClaim(mp.claimed_identity, "$.market_positioning.claimed_identity"))
    for (const key of [
      "direct_competitors",
      "customer_segments",
      "differentiators",
      "uncovered_scope",
      "threats",
      "opportunities",
    ] as const) {
      issues.push(...validateClaimArray(mp[key], `$.market_positioning.${key}`))
    }
  }

  // company_value_chain
  if (!isRecord(raw.company_value_chain)) {
    issues.push({ path: "$.company_value_chain", message: "Section obligatoire absente." })
  } else {
    const vc = raw.company_value_chain
    issues.push(...validateNullableClaim(vc.description, "$.company_value_chain.description"))
    issues.push(...validateNullableClaim(vc.value_proposition, "$.company_value_chain.value_proposition"))
    for (const key of ["key_links", "dependencies", "vulnerabilities", "customer_base"] as const) {
      issues.push(...validateClaimArray(vc[key], `$.company_value_chain.${key}`))
    }
  }

  // organisation
  if (!isRecord(raw.organisation)) {
    issues.push({ path: "$.organisation", message: "Section obligatoire absente." })
  } else {
    const org = raw.organisation
    issues.push(...validateClaimArray(org.departments, "$.organisation.departments"))
    issues.push(...validateClaimArray(org.process_observations, "$.organisation.process_observations"))
    issues.push(...validateNullableClaim(org.strategic_weight, "$.organisation.strategic_weight"))

    if (!Array.isArray(org.key_contacts)) {
      issues.push({ path: "$.organisation.key_contacts", message: "Tableau requis." })
    } else {
      org.key_contacts.forEach((contact, index) => {
        const contactPath = `$.organisation.key_contacts[${index}]`
        if (!isRecord(contact)) {
          issues.push({ path: contactPath, message: "Objet contact attendu." })
          return
        }
        if (!isUuid(contact.contact_id)) {
          issues.push({ path: `${contactPath}.contact_id`, message: "UUID de contact invalide." })
        }
        const roleSummary = validateClaim(contact.role_summary, `${contactPath}.role_summary`)
        if (!roleSummary.valid) issues.push(...roleSummary.issues)
      })
    }
  }

  // open_questions — pas des Claim (on interroge, on n'affirme pas).
  if (!Array.isArray(raw.open_questions)) {
    issues.push({ path: "$.open_questions", message: "Tableau requis." })
  } else {
    raw.open_questions.forEach((question, index) => {
      const questionPath = `$.open_questions[${index}]`
      if (!isRecord(question)) {
        issues.push({ path: questionPath, message: "Objet question attendu." })
        return
      }
      if (typeof question.question !== "string" || question.question.trim().length === 0) {
        issues.push({ path: `${questionPath}.question`, message: "Question requise." })
      }
    })
  }

  const coverage = validateQualitySummary(raw.source_coverage, "$.source_coverage")
  if (!coverage.valid) issues.push(...coverage.issues)

  if (!isIsoDateString(raw.generated_at)) {
    issues.push({ path: "$.generated_at", message: "Date ISO requise." })
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as AccountKnowledgeContentV2)
}

// ─── Parseur versionné ──────────────────────────────────────────────────────

export type AccountKnowledgeParseResult =
  | { version: 1; content: AccountKnowledgeContent }
  | { version: 2; content: AccountKnowledgeContentV2 }
  | { version: null; content: null; issues: ValidationIssue[] }

/**
 * Point d'entrée unique de lecture d'un `content_json` account_knowledge.
 * Discrimine explicitement sur `schema_version` — jamais de détection par
 * présence de champ, qui confondrait un V2 tronqué avec un V1.
 */
export function parseAccountKnowledgeArtifact(raw: unknown): AccountKnowledgeParseResult {
  if (!isRecord(raw)) {
    return { version: null, content: null, issues: [{ path: "$", message: "Objet requis." }] }
  }

  if (raw.schema_version === 2) {
    const result = validateAccountKnowledgeV2(raw)
    return result.valid
      ? { version: 2, content: result.value }
      : { version: null, content: null, issues: result.issues }
  }

  if (raw.schema_version === 1) {
    const result = validateAccountKnowledgeV1(raw)
    return result.valid
      ? { version: 1, content: result.value }
      : { version: null, content: null, issues: result.issues }
  }

  return {
    version: null,
    content: null,
    issues: [
      {
        path: "$.schema_version",
        message: `schema_version non supporté : ${JSON.stringify(raw.schema_version)}.`,
      },
    ],
  }
}

/** Garde de type utilitaire pour les consommateurs déjà parsés. */
export function isAccountKnowledgeV2(
  artifact: AccountKnowledgeArtifact,
): artifact is AccountKnowledgeContentV2 {
  return artifact.schema_version === 2
}

// ─── SectorIntelligence V1 ──────────────────────────────────────────────────

const SECTOR_TEMPERATURES = new Set(["cold", "warm", "hot"])
const COMMERCIAL_WINDOW_TABLES = new Set(["sector_regulatory_items", "sector_events"])

function validateCompetitorArray(raw: unknown, path: string): ValidationIssue[] {
  if (!Array.isArray(raw)) return [{ path, message: "Tableau de concurrents requis." }]
  return raw.flatMap((competitor, index) => {
    const competitorPath = `${path}[${index}]`
    if (!isRecord(competitor)) return [{ path: competitorPath, message: "Objet concurrent attendu." }]
    const issues: ValidationIssue[] = []
    if (typeof competitor.name !== "string" || competitor.name.trim().length === 0) {
      issues.push({ path: `${competitorPath}.name`, message: "Nom requis." })
    }
    if (competitor.market_share_estimate !== null && typeof competitor.market_share_estimate !== "string") {
      issues.push({
        path: `${competitorPath}.market_share_estimate`,
        message: "Chaîne ou null attendu.",
      })
    }
    issues.push(...validateNullableClaim(competitor.note, `${competitorPath}.note`))
    return issues
  })
}

export function validateSectorIntelligenceV1(
  raw: unknown,
): ValidationResult<SectorIntelligenceAnalysisContent> {
  const issues: ValidationIssue[] = []

  if (!isRecord(raw)) {
    return fail([{ path: "$", message: "Objet requis." }])
  }
  if (raw.schema_version !== 1) {
    return fail([{ path: "$.schema_version", message: "schema_version attendu : 1." }])
  }

  if (!isUuid(raw.sector_id)) {
    issues.push({ path: "$.sector_id", message: "UUID de secteur requis." })
  }

  issues.push(...validateNullableClaim(raw.sector_summary, "$.sector_summary"))

  // market
  if (!isRecord(raw.market)) {
    issues.push({ path: "$.market", message: "Section obligatoire absente." })
  } else {
    for (const key of ["france_size", "europe_size", "growth"] as const) {
      issues.push(...validateNullableClaim(raw.market[key], `$.market.${key}`))
    }
    for (const key of ["trends", "growth_drivers", "threats"] as const) {
      issues.push(...validateClaimArray(raw.market[key], `$.market.${key}`))
    }
  }

  // structural_signals
  if (!isRecord(raw.structural_signals)) {
    issues.push({ path: "$.structural_signals", message: "Section obligatoire absente." })
  } else {
    const signals = raw.structural_signals
    if (typeof signals.temperature !== "string" || !SECTOR_TEMPERATURES.has(signals.temperature)) {
      issues.push({
        path: "$.structural_signals.temperature",
        message: 'Température attendue : "cold", "warm" ou "hot".',
      })
    }
    issues.push(...validateNullableClaim(signals.summary, "$.structural_signals.summary"))
    issues.push(...validateClaimArray(signals.major_signals, "$.structural_signals.major_signals"))
  }

  // competitive_environment
  if (!isRecord(raw.competitive_environment)) {
    issues.push({ path: "$.competitive_environment", message: "Section obligatoire absente." })
  } else {
    for (const key of ["leaders", "challengers", "emerging", "outsiders"] as const) {
      issues.push(
        ...validateCompetitorArray(raw.competitive_environment[key], `$.competitive_environment.${key}`),
      )
    }
  }

  // value_chain_archetype
  if (!isRecord(raw.value_chain_archetype)) {
    issues.push({ path: "$.value_chain_archetype", message: "Section obligatoire absente." })
  } else {
    issues.push(
      ...validateNullableClaim(raw.value_chain_archetype.description, "$.value_chain_archetype.description"),
    )
    for (const key of ["links", "dependencies", "vulnerabilities"] as const) {
      issues.push(...validateClaimArray(raw.value_chain_archetype[key], `$.value_chain_archetype.${key}`))
    }
  }

  // regulation
  if (!isRecord(raw.regulation)) {
    issues.push({ path: "$.regulation", message: "Section obligatoire absente." })
  } else {
    for (const key of ["current_regulations", "certifications", "compliance_risks"] as const) {
      issues.push(...validateClaimArray(raw.regulation[key], `$.regulation.${key}`))
    }
  }

  // pain_points — références vers sector_pain_points
  if (!Array.isArray(raw.pain_points)) {
    issues.push({ path: "$.pain_points", message: "Tableau de références requis." })
  } else {
    raw.pain_points.forEach((ref, index) => {
      const refPath = `$.pain_points[${index}]`
      if (!isRecord(ref) || !isUuid(ref.pain_point_id)) {
        issues.push({ path: `${refPath}.pain_point_id`, message: "UUID de pain point invalide." })
      }
    })
  }

  // commercial_windows — références discriminées par table source
  if (!Array.isArray(raw.commercial_windows)) {
    issues.push({ path: "$.commercial_windows", message: "Tableau de références requis." })
  } else {
    raw.commercial_windows.forEach((ref, index) => {
      const refPath = `$.commercial_windows[${index}]`
      if (!isRecord(ref)) {
        issues.push({ path: refPath, message: "Objet référence attendu." })
        return
      }
      if (typeof ref.source_table !== "string" || !COMMERCIAL_WINDOW_TABLES.has(ref.source_table)) {
        issues.push({
          path: `${refPath}.source_table`,
          message: 'Table attendue : "sector_regulatory_items" ou "sector_events".',
        })
      }
      if (!isUuid(ref.id)) {
        issues.push({ path: `${refPath}.id`, message: "UUID de fenêtre commerciale invalide." })
      }
    })
  }

  // indicators — optionnel
  if (raw.indicators !== undefined) {
    if (!Array.isArray(raw.indicators)) {
      issues.push({ path: "$.indicators", message: "Tableau d'indicateurs attendu." })
    } else {
      raw.indicators.forEach((indicator, index) => {
        const result = validateDeterministicIndicator(indicator, `$.indicators[${index}]`)
        if (!result.valid) issues.push(...result.issues)
      })
    }
  }

  const coverage = validateQualitySummary(raw.source_coverage, "$.source_coverage")
  if (!coverage.valid) issues.push(...coverage.issues)

  if (!isIsoDateString(raw.generated_at)) {
    issues.push({ path: "$.generated_at", message: "Date ISO requise." })
  }

  return issues.length > 0 ? fail(issues) : ok(raw as unknown as SectorIntelligenceAnalysisContent)
}

// ─── Rattachement de stockage ───────────────────────────────────────────────

/**
 * Vérifie qu'un artefact sectoriel est stocké au bon endroit.
 *
 * Le contenu seul ne suffit pas : `ai_intelligence_results` porte un
 * `company_id`, et un artefact sectoriel enregistré avec un `company_id`
 * deviendrait invisible/faux pour les autres comptes du secteur. Le
 * rattachement passe par `ai_intelligence_runs.primary_entity_type='sector'`
 * + `primary_entity_id = sector_id`, mécanisme déjà en place et utilisé par les
 * rapports transverses.
 */
export function validateSectorArtifactBinding(input: {
  companyId: string | null
  primaryEntityType: string | null
  primaryEntityId: string | null
  content: Pick<SectorIntelligenceAnalysisContent, "sector_id">
}): ValidationResult<true> {
  const issues: ValidationIssue[] = []

  if (input.companyId !== null) {
    issues.push({
      path: "$.company_id",
      message:
        "Artefact sectoriel rattaché à un compte : le rattachement doit se faire au secteur (company_id null).",
    })
  }

  if (input.primaryEntityType !== "sector") {
    issues.push({
      path: "$.primary_entity_type",
      message: 'Rattachement attendu : primary_entity_type = "sector".',
    })
  }

  if (!isUuid(input.primaryEntityId)) {
    issues.push({ path: "$.primary_entity_id", message: "UUID de secteur requis." })
  } else if (input.primaryEntityId !== input.content.sector_id) {
    issues.push({
      path: "$.primary_entity_id",
      message: "Secteur du run différent du sector_id de l'artefact.",
    })
  }

  return issues.length > 0 ? fail(issues) : ok(true)
}
