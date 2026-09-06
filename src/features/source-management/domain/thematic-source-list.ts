/**
 * Lot 1 ADR-0022 — parsing d'une LISTE DE SOURCES THÉMATIQUE (format
 * `thematic-source-list-v1`), le format d'entrée des corpus Folio.
 *
 * Module PUR : aucune dépendance Supabase, même doctrine que
 * `source-registry-output.ts`.
 *
 * ── POURQUOI UN SECOND PARSEUR, ET PAS UN ADAPTATEUR VERS E3 ────────────────
 * `parseSourceRegistryOutput` impose `meta.segment_slug`, `meta.version = "1.1"`,
 * ≥ 8 sources, des `src_id` en `SRC-\d{3}`, des packs disjoints couvrant
 * exactement l'ensemble des sources, et des `familles_sectorielles_obligatoires`
 * (presse + fédération + régulateur) qui doivent résoudre. Une liste de 11 flux
 * RSS sur l'IA n'y entre qu'en FABRIQUANT un segment, un régulateur et une
 * partition de packs. Le point de convergence est donc plus bas : le résolveur
 * (dédoublonnage par hostname) et la RPC d'écriture, tous deux partagés.
 *
 * Ce que ce format ne porte PAS, volontairement : `tier`, `primary_role`,
 * `utility_score`. Ce sont des notions de preuve du contrat Master Study E3,
 * sans objet pour un corpus éditorial. Les champs correspondants partent à
 * `null` plutôt que de recevoir une valeur inventée.
 */

import {
  isKredoSourceCategory,
  normalizeHostname,
  type KredoSourceCategory,
} from "./source-management-contracts"
import type {
  CorpusQualityVerdictValue,
  ExistingSourceMatch,
  IngestSourceCorpusPayload,
  IngestSourceCorpusSourceItem,
  SourceRegistryAutomationFit,
} from "./source-registry-output"

export const THEMATIC_SOURCE_LIST_FORMAT = "thematic-source-list-v1" as const

/** Un corpus thématique sans aucune source lisible n'a pas d'objet. */
export const MIN_THEMATIC_SOURCES = 3

export type ThematicSourceInput = {
  name: string
  /** URL de flux DÉCLARÉE. `null` ⇒ la source sera collectée en `site:`. */
  rssUrl: string | null
  homepage: string
  searchDomain: string
  kredoCategory: KredoSourceCategory
  newsEligible: boolean
  exclusionReason: string | null
}

export type ParsedThematicSourceList = {
  format: typeof THEMATIC_SOURCE_LIST_FORMAT
  name: string
  slug: string
  version: string
  snapshotDate: string
  sources: ThematicSourceInput[]
  /** Sources réellement destinées à la collecte. */
  newsEligibleCount: number
  excludedCount: number
}

export type ThematicSourceListError = { path: string; message: string }
export type ThematicSourceListParseResult =
  | { ok: true; data: ParsedThematicSourceList }
  | { ok: false; errors: ThematicSourceListError[] }

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Reconnaît le format SANS le valider — sert à l'aiguillage du wizard entre les
 * deux parseurs. Un fichier E3 n'a pas de clé `format`.
 */
export function isThematicSourceListDocument(raw: unknown): boolean {
  let candidate: unknown = raw
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw)
    } catch {
      return false
    }
  }
  return isPlainObject(candidate) && candidate.format === THEMATIC_SOURCE_LIST_FORMAT
}

function parseSource(
  raw: unknown,
  index: number,
  defaultCategory: KredoSourceCategory,
): ThematicSourceInput | ThematicSourceListError[] {
  const path = `sources[${index}]`
  const errors: ThematicSourceListError[] = []

  if (!isPlainObject(raw)) return [{ path, message: "Entrée de source invalide (attendu un objet)." }]

  const name = toNullableString(raw.name)
  if (!name) errors.push({ path: `${path}.name`, message: "name est obligatoire." })

  const homepage = toNullableString(raw.homepage)
  if (!homepage) {
    errors.push({ path: `${path}.homepage`, message: "homepage est obligatoire." })
  } else if (!isHttpUrl(homepage)) {
    errors.push({ path: `${path}.homepage`, message: `homepage « ${homepage} » n'est pas une URL http(s).` })
  }

  const rssUrl = toNullableString(raw.rssUrl)
  if (rssUrl && !isHttpUrl(rssUrl)) {
    errors.push({ path: `${path}.rssUrl`, message: `rssUrl « ${rssUrl} » n'est pas une URL http(s).` })
  }

  const searchDomain = homepage ? normalizeHostname(homepage) : null
  if (homepage && !searchDomain) {
    errors.push({ path: `${path}.homepage`, message: `Impossible de dériver un domaine depuis « ${homepage} ».` })
  }

  const rawCategory = toNullableString(raw.kredoCategory)
  if (rawCategory && !isKredoSourceCategory(rawCategory)) {
    errors.push({ path: `${path}.kredoCategory`, message: `kredoCategory « ${rawCategory} » hors domaine.` })
  }

  const newsEligible = raw.newsEligible !== false
  const exclusionReason = toNullableString(raw.exclusionReason)
  // Une source écartée sans motif est une décision non tracée : on la refuse.
  if (!newsEligible && !exclusionReason) {
    errors.push({
      path: `${path}.exclusionReason`,
      message: "Une source non éligible doit porter un exclusionReason.",
    })
  }
  // Inversement, un motif d'exclusion sur une source active est une contradiction.
  if (newsEligible && exclusionReason) {
    errors.push({
      path: `${path}.exclusionReason`,
      message: "Une source éligible ne doit pas porter d'exclusionReason.",
    })
  }

  if (errors.length > 0) return errors

  return {
    name: name as string,
    rssUrl,
    homepage: homepage as string,
    searchDomain: searchDomain as string,
    kredoCategory: (rawCategory as KredoSourceCategory | null) ?? defaultCategory,
    newsEligible,
    exclusionReason,
  }
}

export function parseThematicSourceList(raw: unknown): ThematicSourceListParseResult {
  let candidate: unknown = raw
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw)
    } catch (cause) {
      return {
        ok: false,
        errors: [
          {
            path: "",
            message: `Le texte fourni n'est pas un JSON valide (${cause instanceof Error ? cause.message : "erreur de parsing"}).`,
          },
        ],
      }
    }
  }
  if (!isPlainObject(candidate)) {
    return { ok: false, errors: [{ path: "", message: "Le fichier ne contient pas un objet JSON valide." }] }
  }

  const root = candidate
  const errors: ThematicSourceListError[] = []

  if (root.format !== THEMATIC_SOURCE_LIST_FORMAT) {
    errors.push({ path: "format", message: `format doit valoir « ${THEMATIC_SOURCE_LIST_FORMAT} ».` })
  }

  const name = toNullableString(root.name)
  if (!name) errors.push({ path: "name", message: "name est obligatoire." })

  const slug = toNullableString(root.slug)
  if (!slug) {
    errors.push({ path: "slug", message: "slug est obligatoire." })
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.push({ path: "slug", message: `slug « ${slug} » doit être en minuscules, chiffres et tirets.` })
  }

  const version = toNullableString(root.version) ?? "1.0"

  const snapshotDate = toNullableString(root.snapshot_date)
  if (!snapshotDate) {
    errors.push({ path: "snapshot_date", message: "snapshot_date est obligatoire." })
  } else if (!DATE_PATTERN.test(snapshotDate)) {
    errors.push({ path: "snapshot_date", message: "snapshot_date doit être au format AAAA-MM-JJ." })
  }

  const rawDefaultCategory = toNullableString(root.default_kredo_category) ?? "ia-appliquee"
  if (!isKredoSourceCategory(rawDefaultCategory)) {
    errors.push({
      path: "default_kredo_category",
      message: `default_kredo_category « ${rawDefaultCategory} » hors domaine.`,
    })
  }

  const rawSources = Array.isArray(root.sources) ? root.sources : null
  if (!rawSources) {
    errors.push({ path: "sources", message: "sources est obligatoire (tableau)." })
  }

  if (errors.length > 0) return { ok: false, errors }

  const defaultCategory = rawDefaultCategory as KredoSourceCategory
  const sources: ThematicSourceInput[] = []
  for (const [index, item] of (rawSources as unknown[]).entries()) {
    const parsed = parseSource(item, index, defaultCategory)
    if (Array.isArray(parsed)) errors.push(...parsed)
    else sources.push(parsed)
  }
  if (errors.length > 0) return { ok: false, errors }

  // Deux entrées sur le même domaine produiraient deux items pointant la même
  // source : `source_corpus_items` a un UNIQUE(corpus_id, source_id), la seconde
  // écraserait silencieusement la première.
  const byDomain = new Map<string, number>()
  for (const source of sources) byDomain.set(source.searchDomain, (byDomain.get(source.searchDomain) ?? 0) + 1)
  const duplicates = [...byDomain.entries()].filter(([, count]) => count > 1).map(([domain]) => domain)
  if (duplicates.length > 0) {
    errors.push({ path: "sources", message: `Domaine(s) en double : ${duplicates.join(", ")}.` })
  }

  const newsEligibleCount = sources.filter((source) => source.newsEligible).length
  if (newsEligibleCount < MIN_THEMATIC_SOURCES) {
    errors.push({
      path: "sources",
      message: `Un corpus thématique doit compter au moins ${MIN_THEMATIC_SOURCES} sources éligibles (reçu ${newsEligibleCount}).`,
    })
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    data: {
      format: THEMATIC_SOURCE_LIST_FORMAT,
      name: name as string,
      slug: slug as string,
      version,
      snapshotDate: snapshotDate as string,
      sources,
      newsEligibleCount,
      excludedCount: sources.length - newsEligibleCount,
    },
  }
}

// ---------------------------------------------------------------------------
// Mapping vers source_catalog / source_corpus_items.
// ---------------------------------------------------------------------------

export type ThematicSourceItemPreview = {
  /** Clé d'item, unique dans le corpus : le domaine normalisé. */
  srcId: string
  input: ThematicSourceInput
  existingMatch: ExistingSourceMatch | null
  isNewSource: boolean
  sourceKey: string
  mappedName: string
  mappedSearchDomain: string
  mappedHomepageUrl: string
  mappedCollectionUrl: string | null
  mappedKredoCategory: KredoSourceCategory
  mappedFamily: string
  /** `high` pour un flux direct, `low` pour un repli `site:` — un fait, pas une note. */
  automationFit: SourceRegistryAutomationFit
  newsEligible: boolean
  isEnabledDefault: boolean
  exclusionReasonDefault: string | null
}

export function buildThematicSourceItemPreview(
  source: ThematicSourceInput,
  params: { corpusName: string; existingMatch: ExistingSourceMatch | null },
): ThematicSourceItemPreview {
  const { corpusName, existingMatch } = params

  return {
    srcId: source.searchDomain,
    input: source,
    existingMatch,
    isNewSource: existingMatch === null,
    // Réutilise la clé de la source déjà cataloguée : jamais de doublon sur un
    // domaine connu (même règle que l'import E3).
    sourceKey: existingMatch?.sourceKey ?? `corpus:${source.searchDomain}`,
    mappedName: existingMatch?.name ?? source.name,
    mappedSearchDomain: source.searchDomain,
    mappedHomepageUrl: source.homepage,
    // Contrairement à l'import E3, l'URL de flux est prise TELLE QUELLE : ce
    // format la déclare explicitement comme flux, il n'y a rien à deviner.
    mappedCollectionUrl: source.rssUrl,
    mappedKredoCategory: source.kredoCategory,
    mappedFamily: corpusName,
    automationFit: source.rssUrl ? "high" : "low",
    newsEligible: source.newsEligible,
    isEnabledDefault: source.newsEligible,
    exclusionReasonDefault: source.exclusionReason,
  }
}

export type ThematicSourceArbitration = {
  preview: ThematicSourceItemPreview
  isEnabled: boolean
  exclusionReason: string | null
}

export function buildIngestThematicCorpusPayload(
  parsed: ParsedThematicSourceList,
  arbitrations: ThematicSourceArbitration[],
  corpusMeta: { sourceDocumentPath: string | null; sourceDocumentHash: string | null; sourceFileName: string | null },
): IngestSourceCorpusPayload {
  const sources: IngestSourceCorpusSourceItem[] = arbitrations.map(
    ({ preview, isEnabled, exclusionReason }) => {
      const active = preview.newsEligible && isEnabled
      return {
        source_key: preview.sourceKey,
        name: preview.mappedName,
        publisher: null,
        domain: preview.mappedSearchDomain,
        search_domain: preview.mappedSearchDomain,
        collection_url: preview.mappedCollectionUrl,
        homepage_url: preview.mappedHomepageUrl,
        family: preview.mappedFamily,
        kredo_category: preview.mappedKredoCategory,
        // Un flux éditorial publie en continu ; c'est aussi ce qui le distingue
        // d'une source `static`, interdite de veille récurrente.
        content_temporality: "continuous",
        usage_scopes: active ? ["news"] : [],
        external_src_id: preview.srcId,
        // `minimal` = ce qu'on collecte vraiment ; `enrichi` = conservé pour
        // mémoire du référentiel, sans collecte.
        pack: active ? "minimal" : "enrichi",
        // Notions Master Study sans objet ici — cf. l'en-tête du module.
        tier: null,
        primary_role: "watch",
        utility_score: null,
        automation_fit: preview.automationFit,
        familles_couvertes: [],
        atteste: null,
        news_eligible: active,
        // Un corpus thématique ne sert jamais la veille compte : il n'a pas de
        // périmètre d'entreprise.
        account_watch_eligible: false,
        is_enabled: active,
        exclusion_reason: active ? null : (exclusionReason ?? preview.exclusionReasonDefault),
      }
    },
  )

  const qualityVerdict: CorpusQualityVerdictValue = "usable_with_caveats"

  return {
    slug: parsed.slug,
    version: parsed.version,
    snapshot_date: parsed.snapshotDate,
    quality_verdict: qualityVerdict,
    activation_state: "draft",
    source_document_path: corpusMeta.sourceDocumentPath,
    source_document_hash: corpusMeta.sourceDocumentHash,
    gaps: [],
    metadata: {
      meta: { name: parsed.name, format: parsed.format, scope_kind: "thematic" },
      compteurs: {
        sources: parsed.sources.length,
        news_eligible: sources.filter((source) => source.news_eligible).length,
        exclues: sources.filter((source) => !source.news_eligible).length,
      },
      source_file_name: corpusMeta.sourceFileName,
      imported_at: new Date().toISOString(),
    },
    sources,
  }
}
