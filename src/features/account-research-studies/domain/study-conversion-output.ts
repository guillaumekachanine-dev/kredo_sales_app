// ─── Lecture des sorties de passe — module pur ──────────────────────────────
//
// Une passe dont la sortie n'est pas un objet JSON échoue : la conversion échoue avec
// elle, explicitement, et se relance. Une sortie lisible mais imparfaite n'est jamais
// « réparée » par invention : une valeur hors domaine est remplacée par un défaut
// NOMMÉ (`fallback`), compté au rapport de couverture. Ce que le modèle omet ou
// déforme reste visible — c'est la condition du zéro perte.

import {
  STUDY_QUALIFICATIONS,
  STUDY_SECTION_KEYS,
  STUDY_SOURCE_TYPES,
  type StudyEntity,
  type StudyQualification,
  type StudySectionKey,
  type StudySourceType,
} from "./study-contracts"
import { E3_FAMILIES } from "./study-conversion-plan"

export type ParsedStatement = {
  text: string
  qualification: StudyQualification
  qualificationFallback: boolean
  confidence: number
  block_ids: string[]
  source_refs: string[]
  entity: { kind: string; name: string } | null
  unresolvedBlockRefs: number
  unresolvedSourceRefs: number
}

export type ParsedBlocksPart = {
  classifications: Map<string, StudySectionKey>
  statements: ParsedStatement[]
  gaps: { section_key: StudySectionKey; reason: string }[]
  entity: StudyEntity | null
}

export type E3SourceQualification = {
  label: string | null
  publisher: string | null
  source_type: StudySourceType
  tier: 1 | 2 | 3 | 4
  primary_role: "proof" | "corroboration" | "discovery" | "watch"
  utility_score_detail: {
    pertinence_sectorielle: number
    couverture_besoins: number
    valeur_commerciale: number
    fraicheur: number
    autorite_editoriale: number
    automation_access: number
  }
  automation_fit: "high" | "medium" | "low" | "manual_only"
  content_temporality: "static" | "periodic" | "continuous"
  usage_scopes: ("study" | "account_watch" | "news")[]
  pack: "minimal" | "enrichi"
  familles_couvertes: string[]
  famille_obligatoire: "presse_professionnelle" | "federation" | "regulateur" | null
  atteste: string | null
  /** Champs remplacés par un défaut parce que la valeur rendue était hors domaine. */
  defaulted_fields: string[]
}

export type ParsedSourcesPart = {
  qualifications: Map<string, E3SourceQualification>
}

export type PartParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Retire une éventuelle clôture ```json … ``` — sans toucher au contenu. */
export function unwrapJsonText(raw: string): string {
  const trimmed = raw.trim()
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/i.exec(trimmed)
  return fenced ? fenced[1] : trimmed
}

function parseRoot(raw: string): PartParseResult<Record<string, unknown>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(unwrapJsonText(raw))
  } catch (cause) {
    return { ok: false, error: `Sortie non JSON (${cause instanceof Error ? cause.message : "parse"}) — sortie tronquée ou hors contrat.` }
  }
  return isRecord(parsed) ? { ok: true, value: parsed } : { ok: false, error: "La sortie n'est pas un objet JSON." }
}

const SECTION_SET = new Set<string>(STUDY_SECTION_KEYS)
const QUALIFICATION_SET = new Set<string>(STUDY_QUALIFICATIONS)

export function parseBlocksPartOutput(
  raw: string,
  expected: { blockIds: readonly string[]; sourceIds: readonly string[] },
): PartParseResult<ParsedBlocksPart> {
  const root = parseRoot(raw)
  if (!root.ok) return root
  const value = root.value
  if (!Array.isArray(value.classifications) || !Array.isArray(value.statements)) {
    return { ok: false, error: "Sortie « blocks » sans tableaux classifications/statements." }
  }

  const blockSet = new Set(expected.blockIds)
  const sourceSet = new Set(expected.sourceIds)
  const classifications = new Map<string, StudySectionKey>()
  for (const entry of value.classifications) {
    if (!isRecord(entry)) continue
    const blockId = asString(entry.block_id)
    const section = asString(entry.section)
    if (!blockId || !blockSet.has(blockId) || !section || !SECTION_SET.has(section)) continue
    if (!classifications.has(blockId)) classifications.set(blockId, section as StudySectionKey)
  }

  const statements: ParsedStatement[] = []
  for (const entry of value.statements) {
    if (!isRecord(entry)) continue
    const text = asString(entry.text)
    if (!text) continue
    const rawQualification = asString(entry.qualification)
    const qualificationValid = rawQualification !== null && QUALIFICATION_SET.has(rawQualification)
    const rawBlocks = Array.isArray(entry.block_ids) ? entry.block_ids.filter((id): id is string => typeof id === "string") : []
    const rawSources = Array.isArray(entry.source_refs) ? entry.source_refs.filter((id): id is string => typeof id === "string") : []
    const blockIds = Array.from(new Set(rawBlocks.filter((id) => blockSet.has(id))))
    const sourceRefs = Array.from(new Set(rawSources.filter((id) => sourceSet.has(id))))
    const confidence = typeof entry.confidence === "number" && Number.isFinite(entry.confidence)
      ? Math.min(1, Math.max(0, entry.confidence))
      : 0.5
    const entity = isRecord(entry.entity) && asString(entry.entity.kind) && asString(entry.entity.name)
      ? { kind: asString(entry.entity.kind) as string, name: asString(entry.entity.name) as string }
      : null
    statements.push({
      text,
      // Une qualification illisible devient « hypothesis » : c'est la seule qui ne
      // prétend rien. Le repli est compté et visible, jamais silencieux.
      qualification: qualificationValid ? (rawQualification as StudyQualification) : "hypothesis",
      qualificationFallback: !qualificationValid,
      confidence,
      block_ids: blockIds,
      source_refs: sourceRefs,
      entity,
      unresolvedBlockRefs: rawBlocks.length - rawBlocks.filter((id) => blockSet.has(id)).length,
      unresolvedSourceRefs: rawSources.length - rawSources.filter((id) => sourceSet.has(id)).length,
    })
  }

  const gaps: ParsedBlocksPart["gaps"] = []
  for (const entry of Array.isArray(value.gaps) ? value.gaps : []) {
    if (!isRecord(entry)) continue
    const reason = asString(entry.reason)
    const section = asString(entry.section)
    if (!reason) continue
    gaps.push({ section_key: section && SECTION_SET.has(section) ? (section as StudySectionKey) : "appendix", reason })
  }

  let entity: StudyEntity | null = null
  if (isRecord(value.entity)) {
    const siren = asString(value.entity.siren)?.replace(/\s+/g, "") ?? null
    const candidate: StudyEntity = {
      legal_name: asString(value.entity.legal_name),
      siren: siren && /^\d{9}$/.test(siren) ? siren : null,
      naf_code: asString(value.entity.naf_code),
      headquarters: asString(value.entity.headquarters),
    }
    if (Object.values(candidate).some((field) => field !== null)) entity = candidate
  }

  return { ok: true, value: { classifications, statements, gaps, entity } }
}

// ─── Sources ────────────────────────────────────────────────────────────────

const SOURCE_TYPE_SET = new Set<string>(STUDY_SOURCE_TYPES)
const ROLES = ["proof", "corroboration", "discovery", "watch"] as const
const FITS = ["high", "medium", "low", "manual_only"] as const
const TEMPORALITIES = ["static", "periodic", "continuous"] as const
const SCOPES = ["study", "account_watch", "news"] as const
const PACKS = ["minimal", "enrichi"] as const
const MANDATORY = ["presse_professionnelle", "federation", "regulateur"] as const
const FAMILY_SET = new Set<string>(E3_FAMILIES)

export const UTILITY_CAPS = {
  pertinence_sectorielle: 20,
  couverture_besoins: 20,
  valeur_commerciale: 15,
  fraicheur: 15,
  autorite_editoriale: 20,
  automation_access: 10,
} as const

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string, defaulted: string[]): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T
  defaulted.push(field)
  return fallback
}

/**
 * Qualification par défaut d'une source que le modèle n'a pas qualifiée : la plus
 * prudente (tier 4, découverte, statique, pack enrichi). Elle est marquée `default`.
 */
export function defaultSourceQualification(): E3SourceQualification {
  return {
    label: null,
    publisher: null,
    source_type: "other",
    tier: 4,
    primary_role: "discovery",
    utility_score_detail: {
      pertinence_sectorielle: 0,
      couverture_besoins: 0,
      valeur_commerciale: 0,
      fraicheur: 0,
      autorite_editoriale: 0,
      automation_access: 0,
    },
    automation_fit: "manual_only",
    content_temporality: "static",
    usage_scopes: ["study"],
    pack: "enrichi",
    familles_couvertes: [],
    famille_obligatoire: null,
    atteste: null,
    defaulted_fields: ["*"],
  }
}

export function parseSourcesPartOutput(
  raw: string,
  expected: { sourceIds: readonly string[] },
): PartParseResult<ParsedSourcesPart> {
  const root = parseRoot(raw)
  if (!root.ok) return root
  if (!Array.isArray(root.value.sources)) return { ok: false, error: "Sortie « sources » sans tableau sources." }

  const expectedSet = new Set(expected.sourceIds)
  const qualifications = new Map<string, E3SourceQualification>()

  for (const entry of root.value.sources) {
    if (!isRecord(entry)) continue
    const id = asString(entry.id)
    if (!id || !expectedSet.has(id) || qualifications.has(id)) continue
    const defaulted: string[] = []

    const tierRaw = typeof entry.tier === "number" ? entry.tier : Number(entry.tier)
    const tier = ([1, 2, 3, 4] as const).includes(tierRaw as 1) ? (tierRaw as 1 | 2 | 3 | 4) : (defaulted.push("tier"), 4)

    const detailRaw = isRecord(entry.utility_score_detail) ? entry.utility_score_detail : {}
    const detail = { ...defaultSourceQualification().utility_score_detail }
    for (const [key, cap] of Object.entries(UTILITY_CAPS) as [keyof typeof UTILITY_CAPS, number][]) {
      const valueRaw = detailRaw[key]
      if (typeof valueRaw === "number" && Number.isFinite(valueRaw)) {
        const clamped = Math.round(Math.min(cap, Math.max(0, valueRaw)))
        if (clamped !== valueRaw) defaulted.push(`utility_score_detail.${key}`)
        detail[key] = clamped
      } else {
        defaulted.push(`utility_score_detail.${key}`)
      }
    }

    const scopesRaw = Array.isArray(entry.usage_scopes) ? entry.usage_scopes : []
    const scopes = Array.from(new Set<(typeof SCOPES)[number]>([
      "study",
      ...scopesRaw.filter((scope): scope is (typeof SCOPES)[number] => (SCOPES as readonly unknown[]).includes(scope)),
    ]))

    const families = Array.isArray(entry.familles_couvertes)
      ? Array.from(new Set(entry.familles_couvertes.filter((family): family is string => typeof family === "string" && FAMILY_SET.has(family))))
      : []

    const mandatory = typeof entry.famille_obligatoire === "string" && (MANDATORY as readonly string[]).includes(entry.famille_obligatoire)
      ? (entry.famille_obligatoire as E3SourceQualification["famille_obligatoire"])
      : null

    const sourceType = asString(entry.source_type)
    qualifications.set(id, {
      label: asString(entry.label),
      publisher: asString(entry.publisher),
      source_type: sourceType && SOURCE_TYPE_SET.has(sourceType) ? (sourceType as StudySourceType) : (defaulted.push("source_type"), "other"),
      tier,
      primary_role: pick(entry.primary_role, ROLES, "discovery", "primary_role", defaulted),
      utility_score_detail: detail,
      automation_fit: pick(entry.automation_fit, FITS, "manual_only", "automation_fit", defaulted),
      content_temporality: pick(entry.content_temporality, TEMPORALITIES, "static", "content_temporality", defaulted),
      usage_scopes: scopes,
      pack: pick(entry.pack, PACKS, "enrichi", "pack", defaulted),
      familles_couvertes: families,
      famille_obligatoire: mandatory,
      atteste: asString(entry.atteste),
      defaulted_fields: defaulted,
    })
  }

  return { ok: true, value: { qualifications } }
}
