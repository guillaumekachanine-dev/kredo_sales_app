/**
 * Lot 4 « Import de corpus E3 » — parsing défensif du livrable JSON produit par
 * `docs/MASTER-STUDY/06-ETAPE-E3-CORPUS-DE-SOURCES.md`, standard 1.1
 * (`docs/MASTER-STUDY/schemas/source-registry.schema.json`).
 *
 * Module PUR : aucune dépendance Supabase, aucune bibliothèque de validation
 * (même doctrine que `competitive-map-output.ts` / `account-classification.ts`).
 *
 * Ce parseur n'implémente PAS l'intégralité du schéma JSON Schema. Il implémente
 * exactement les invariants bloquants listés par le prompt Lot 4 §5, qui sont un
 * sous-ensemble délibéré du contrat complet : la scorecard 24 critères,
 * l'arithmétique de `utility_score_detail`, la cohérence éditeur/domaine et le
 * journal ≥ 15 requêtes restent le rôle de `scripts/audit-master-study.py` (gate
 * G1), exécuté hors du contexte producteur (axiome A10, E3 §7). Le corpus de
 * recette canonique (`registre/2026-08-parfumerie-compositions-b2b/03-sources.json`)
 * porte d'ailleurs `compteurs.requetes: 0` et aucun `journal_recherche` — il
 * échouerait G1, mais c'est un livrable `usable_with_caveats` légitime pour cet
 * import, pas un fichier à rejeter ici.
 */

import type { SourceOrigin } from "./source-management-contracts"

export const SOURCE_REGISTRY_VERSION = "1.1" as const

export const SOURCE_REGISTRY_TIER_VALUES = [1, 2, 3, 4] as const
export type SourceRegistryTier = (typeof SOURCE_REGISTRY_TIER_VALUES)[number]

export const SOURCE_REGISTRY_PRIMARY_ROLE_VALUES = ["proof", "corroboration", "discovery", "watch"] as const
export type SourceRegistryPrimaryRole = (typeof SOURCE_REGISTRY_PRIMARY_ROLE_VALUES)[number]

export const SOURCE_REGISTRY_AUTOMATION_FIT_VALUES = ["high", "medium", "low", "manual_only"] as const
export type SourceRegistryAutomationFit = (typeof SOURCE_REGISTRY_AUTOMATION_FIT_VALUES)[number]

export const SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES = ["static", "periodic", "continuous"] as const
export type SourceRegistryContentTemporality = (typeof SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES)[number]

export const SOURCE_REGISTRY_USAGE_SCOPE_VALUES = ["news", "account_watch", "study"] as const
export type SourceRegistryUsageScope = (typeof SOURCE_REGISTRY_USAGE_SCOPE_VALUES)[number]

export const SOURCE_REGISTRY_PACK_VALUES = ["minimal", "enrichi"] as const
export type SourceRegistryPack = (typeof SOURCE_REGISTRY_PACK_VALUES)[number]

export const SOURCE_REGISTRY_VALIDATION_STATUS_VALUES = ["verified", "pending"] as const
export type SourceRegistrySourceValidationStatus = (typeof SOURCE_REGISTRY_VALIDATION_STATUS_VALUES)[number]

export const SOURCE_REGISTRY_META_VERDICT_VALUES = [
  "pending",
  "production_ready",
  "usable_with_caveats",
  "rejected",
] as const
export type SourceRegistryMetaVerdict = (typeof SOURCE_REGISTRY_META_VERDICT_VALUES)[number]

/** Domaine `corpus_quality_verdict` (base). `pending` n'existe pas côté SQL — mappé vers `usable_with_caveats` (Lot 4 §12). */
export const CORPUS_QUALITY_VERDICT_VALUES = ["production_ready", "usable_with_caveats", "rejected"] as const
export type CorpusQualityVerdictValue = (typeof CORPUS_QUALITY_VERDICT_VALUES)[number]

const SRC_ID_PATTERN = /^SRC-[0-9]{3}$/

export type SourceRegistrySourceInput = {
  srcId: string
  publisher: string | null
  domain: string | null
  url: string | null
  tier: SourceRegistryTier
  primaryRole: SourceRegistryPrimaryRole
  utilityScore: number
  automationFit: SourceRegistryAutomationFit
  /** Nullable : une autorité sans flux reste utilisable en `site:` (E3 §4.1.6). Jamais copié aveuglément — voir `deriveImportCollectionUrl`. */
  collectionUrl: string | null
  searchDomain: string
  contentTemporality: SourceRegistryContentTemporality
  usageScopes: SourceRegistryUsageScope[]
  pack: SourceRegistryPack
  atteste: string | null
  famillesCouvertes: string[]
  consultedAt: string | null
  validationStatus: SourceRegistrySourceValidationStatus
  conditionsUtilisation: string | null
}

export type ParsedSourceRegistry = {
  meta: {
    segmentSlug: string
    secteur: string | null
    geographie: string | null
    dateSnapshot: string
    version: "1.1"
    validationStatus: SourceRegistryMetaVerdict
  }
  /** Passthrough non retypé — projeté tel quel dans `source_corpora.metadata` (Lot 4 §12). */
  besoinsInformation: unknown[]
  famillesSectoriellesObligatoires: { presse_professionnelle: string; federation: string; regulateur: string }
  sources: SourceRegistrySourceInput[]
  packMinimal: string[]
  packEnrichi: string[]
  matriceCouverture: unknown[]
  gaps: unknown[]
  compteurs: { sources: number; packMinimal: number; packEnrichi: number; requetes: number }
  /** Nombre de sources dont `content_temporality !== 'static'` — affiché à l'étape 1 du wizard. */
  collectableCount: number
  staticCount: number
}

export type SourceRegistryError = { path: string; message: string }

export type SourceRegistryParseResult =
  | { ok: true; data: ParsedSourceRegistry }
  | { ok: false; errors: SourceRegistryError[] }

function toNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Accepte un texte JSON ou un objet déjà parsé (Lot 4 §4). Jamais d'exception
 * non contrôlée : une erreur de parsing JSON devient une entrée de `errors`.
 */
function toRootObject(raw: unknown): { root: Record<string, unknown> } | { error: SourceRegistryError } {
  let candidate: unknown = raw
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw)
    } catch (cause) {
      return { error: { path: "", message: `Le texte fourni n'est pas un JSON valide (${cause instanceof Error ? cause.message : "erreur de parsing"}).` } }
    }
  }
  if (!isPlainObject(candidate)) {
    return { error: { path: "", message: "Le fichier ne contient pas un objet JSON valide." } }
  }
  return { root: candidate }
}

function parseSource(raw: unknown, index: number): SourceRegistrySourceInput | SourceRegistryError[] {
  const path = `sources[${index}]`
  const errors: SourceRegistryError[] = []

  if (!isPlainObject(raw)) {
    return [{ path, message: "Entrée de source invalide (attendu un objet)." }]
  }

  const srcId = toNullableString(raw.src_id)
  if (!srcId) {
    errors.push({ path: `${path}.src_id`, message: "src_id est obligatoire." })
  } else if (!SRC_ID_PATTERN.test(srcId)) {
    errors.push({ path: `${path}.src_id`, message: `src_id « ${srcId} » ne respecte pas le format SRC-XXX.` })
  }

  const searchDomain = toNullableString(raw.search_domain)
  if (!searchDomain) {
    errors.push({ path: `${path}.search_domain`, message: "search_domain est obligatoire." })
  }

  const contentTemporality = toNullableString(raw.content_temporality)
  if (!contentTemporality || !(SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES as readonly string[]).includes(contentTemporality)) {
    errors.push({
      path: `${path}.content_temporality`,
      message: `content_temporality « ${String(raw.content_temporality)} » hors domaine (${SOURCE_REGISTRY_CONTENT_TEMPORALITY_VALUES.join(", ")}).`,
    })
  }

  const rawUsageScopes = Array.isArray(raw.usage_scopes) ? raw.usage_scopes : null
  let usageScopes: SourceRegistryUsageScope[] = []
  if (!rawUsageScopes) {
    errors.push({ path: `${path}.usage_scopes`, message: "usage_scopes est obligatoire (tableau)." })
  } else {
    const invalid = rawUsageScopes.filter((v) => !(SOURCE_REGISTRY_USAGE_SCOPE_VALUES as readonly unknown[]).includes(v))
    if (invalid.length > 0) {
      errors.push({ path: `${path}.usage_scopes`, message: `Valeur(s) hors domaine : ${invalid.map(String).join(", ")}.` })
    } else {
      usageScopes = rawUsageScopes as SourceRegistryUsageScope[]
    }
  }

  const pack = toNullableString(raw.pack)
  if (!pack || !(SOURCE_REGISTRY_PACK_VALUES as readonly string[]).includes(pack)) {
    errors.push({ path: `${path}.pack`, message: `pack « ${String(raw.pack)} » hors domaine (minimal, enrichi).` })
  }

  const tier = toNullableNumber(raw.tier)
  if (tier === null || !(SOURCE_REGISTRY_TIER_VALUES as readonly number[]).includes(tier)) {
    errors.push({ path: `${path}.tier`, message: `tier « ${String(raw.tier)} » hors domaine (1 à 4).` })
  }

  const utilityScore = toNullableNumber(raw.utility_score)
  if (utilityScore === null || utilityScore < 0 || utilityScore > 100) {
    errors.push({ path: `${path}.utility_score`, message: `utility_score « ${String(raw.utility_score)} » hors domaine (0 à 100).` })
  }

  const automationFit = toNullableString(raw.automation_fit)
  if (!automationFit || !(SOURCE_REGISTRY_AUTOMATION_FIT_VALUES as readonly string[]).includes(automationFit)) {
    errors.push({
      path: `${path}.automation_fit`,
      message: `automation_fit « ${String(raw.automation_fit)} » hors domaine (${SOURCE_REGISTRY_AUTOMATION_FIT_VALUES.join(", ")}).`,
    })
  }

  const primaryRole = toNullableString(raw.primary_role)
  if (!primaryRole || !(SOURCE_REGISTRY_PRIMARY_ROLE_VALUES as readonly string[]).includes(primaryRole)) {
    errors.push({
      path: `${path}.primary_role`,
      message: `primary_role « ${String(raw.primary_role)} » hors domaine (${SOURCE_REGISTRY_PRIMARY_ROLE_VALUES.join(", ")}).`,
    })
  }

  if (errors.length > 0) return errors

  const validationStatusRaw = toNullableString(raw.validation_status)
  const validationStatus: SourceRegistrySourceValidationStatus =
    validationStatusRaw && (SOURCE_REGISTRY_VALIDATION_STATUS_VALUES as readonly string[]).includes(validationStatusRaw)
      ? (validationStatusRaw as SourceRegistrySourceValidationStatus)
      : "pending"

  return {
    srcId: srcId as string,
    publisher: toNullableString(raw.publisher),
    domain: toNullableString(raw.domain),
    url: toNullableString(raw.url),
    tier: tier as SourceRegistryTier,
    primaryRole: primaryRole as SourceRegistryPrimaryRole,
    utilityScore: utilityScore as number,
    automationFit: automationFit as SourceRegistryAutomationFit,
    collectionUrl: toNullableString(raw.collection_url),
    searchDomain: searchDomain as string,
    contentTemporality: contentTemporality as SourceRegistryContentTemporality,
    usageScopes,
    pack: pack as SourceRegistryPack,
    atteste: toNullableString(raw.atteste),
    famillesCouvertes: Array.isArray(raw.familles_couvertes) ? raw.familles_couvertes.filter((v): v is string => typeof v === "string") : [],
    consultedAt: toNullableString(raw.consulted_at),
    validationStatus,
    conditionsUtilisation: toNullableString(raw.conditions_utilisation),
  }
}

export function parseSourceRegistryOutput(raw: unknown): SourceRegistryParseResult {
  const rootResult = toRootObject(raw)
  if ("error" in rootResult) return { ok: false, errors: [rootResult.error] }
  const root = rootResult.root

  const errors: SourceRegistryError[] = []

  const meta = isPlainObject(root.meta) ? root.meta : null
  if (!meta) errors.push({ path: "meta", message: "Bloc « meta » manquant." })

  const segmentSlug = meta ? toNullableString(meta.segment_slug) : null
  if (!segmentSlug) errors.push({ path: "meta.segment_slug", message: "meta.segment_slug est obligatoire." })

  const dateSnapshot = meta ? toNullableString(meta.date_snapshot) : null
  if (!dateSnapshot) errors.push({ path: "meta.date_snapshot", message: "meta.date_snapshot est obligatoire." })

  const version = meta ? toNullableString(meta.version) : null
  if (version !== SOURCE_REGISTRY_VERSION) {
    errors.push({ path: "meta.version", message: `meta.version doit être « ${SOURCE_REGISTRY_VERSION} » (reçu « ${String(version)} »).` })
  }

  const metaValidationRaw = meta ? toNullableString(meta.validation_status) : null
  const metaValidationStatus: SourceRegistryMetaVerdict =
    metaValidationRaw && (SOURCE_REGISTRY_META_VERDICT_VALUES as readonly string[]).includes(metaValidationRaw)
      ? (metaValidationRaw as SourceRegistryMetaVerdict)
      : "pending"

  const rawSources = Array.isArray(root.sources) ? root.sources : null
  if (!rawSources || rawSources.length < 8) {
    errors.push({ path: "sources", message: `sources doit contenir au moins 8 entrées (reçu ${rawSources?.length ?? 0}).` })
  }

  if (errors.length > 0) return { ok: false, errors }

  const sources: SourceRegistrySourceInput[] = []
  for (const [index, item] of (rawSources as unknown[]).entries()) {
    const parsed = parseSource(item, index)
    if (Array.isArray(parsed)) errors.push(...parsed)
    else sources.push(parsed)
  }
  if (errors.length > 0) return { ok: false, errors }

  // src_id unique — jamais tronqué silencieusement.
  const seen = new Map<string, number>()
  for (const source of sources) seen.set(source.srcId, (seen.get(source.srcId) ?? 0) + 1)
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id)
  if (duplicates.length > 0) {
    errors.push({ path: "sources", message: `src_id dupliqué(s) : ${duplicates.join(", ")}.` })
  }

  const allSrcIds = new Set(sources.map((s) => s.srcId))

  const rawPackMinimal = Array.isArray(root.pack_minimal) ? root.pack_minimal.filter((v): v is string => typeof v === "string") : null
  const rawPackEnrichi = Array.isArray(root.pack_enrichi) ? root.pack_enrichi.filter((v): v is string => typeof v === "string") : null
  if (!rawPackMinimal) errors.push({ path: "pack_minimal", message: "pack_minimal est obligatoire (tableau)." })
  if (!rawPackEnrichi) errors.push({ path: "pack_enrichi", message: "pack_enrichi est obligatoire (tableau)." })

  if (errors.length > 0) return { ok: false, errors }

  const packMinimal = rawPackMinimal as string[]
  const packEnrichi = rawPackEnrichi as string[]

  const packMinimalSet = new Set(packMinimal)
  const packEnrichiSet = new Set(packEnrichi)
  const intersection = [...packMinimalSet].filter((id) => packEnrichiSet.has(id))
  if (intersection.length > 0) {
    errors.push({ path: "pack_minimal/pack_enrichi", message: `pack_minimal et pack_enrichi ne sont pas disjoints : ${intersection.join(", ")}.` })
  }

  for (const id of packMinimal) {
    if (!allSrcIds.has(id)) errors.push({ path: "pack_minimal", message: `« ${id} » ne résout vers aucune source.` })
  }
  for (const id of packEnrichi) {
    if (!allSrcIds.has(id)) errors.push({ path: "pack_enrichi", message: `« ${id} » ne résout vers aucune source.` })
  }

  const packUnion = new Set([...packMinimal, ...packEnrichi])
  const missingFromPacks = [...allSrcIds].filter((id) => !packUnion.has(id))
  const extraInPacks = [...packUnion].filter((id) => !allSrcIds.has(id))
  if (missingFromPacks.length > 0 || extraInPacks.length > 0) {
    errors.push({
      path: "pack_minimal ∪ pack_enrichi",
      message: `L'union des packs ne couvre pas exactement l'ensemble des sources` +
        (missingFromPacks.length > 0 ? ` — absent(s) des packs : ${missingFromPacks.join(", ")}.` : "") +
        (extraInPacks.length > 0 ? ` — orphelin(s) sans source : ${extraInPacks.join(", ")}.` : ""),
    })
  }

  const rawMatriceCouverture = Array.isArray(root.matrice_couverture) ? root.matrice_couverture : []
  for (const [index, entry] of rawMatriceCouverture.entries()) {
    if (!isPlainObject(entry) || !Array.isArray(entry.src_ids)) continue
    for (const id of entry.src_ids) {
      if (typeof id === "string" && !allSrcIds.has(id)) {
        errors.push({ path: `matrice_couverture[${index}].src_ids`, message: `« ${id} » ne résout vers aucune source.` })
      }
    }
  }

  const rawFamilles = isPlainObject(root.familles_sectorielles_obligatoires) ? root.familles_sectorielles_obligatoires : null
  const presse = rawFamilles ? toNullableString(rawFamilles.presse_professionnelle) : null
  const federation = rawFamilles ? toNullableString(rawFamilles.federation) : null
  const regulateur = rawFamilles ? toNullableString(rawFamilles.regulateur) : null
  if (!presse || !allSrcIds.has(presse)) {
    errors.push({ path: "familles_sectorielles_obligatoires.presse_professionnelle", message: `« ${String(presse)} » ne résout vers aucune source.` })
  }
  if (!federation || !allSrcIds.has(federation)) {
    errors.push({ path: "familles_sectorielles_obligatoires.federation", message: `« ${String(federation)} » ne résout vers aucune source.` })
  }
  if (!regulateur || !allSrcIds.has(regulateur)) {
    errors.push({ path: "familles_sectorielles_obligatoires.regulateur", message: `« ${String(regulateur)} » ne résout vers aucune source.` })
  }

  const rawCompteurs = isPlainObject(root.compteurs) ? root.compteurs : null
  const compteursSources = rawCompteurs ? toNullableNumber(rawCompteurs.sources) : null
  const compteursPackMinimal = rawCompteurs ? toNullableNumber(rawCompteurs.pack_minimal) : null
  const compteursPackEnrichi = rawCompteurs ? toNullableNumber(rawCompteurs.pack_enrichi) : null
  const compteursRequetes = rawCompteurs ? toNullableNumber(rawCompteurs.requetes) : null
  if (compteursSources === null) {
    errors.push({ path: "compteurs.sources", message: "compteurs.sources est obligatoire." })
  } else if (compteursSources !== sources.length) {
    errors.push({ path: "compteurs.sources", message: `compteurs.sources (${compteursSources}) ≠ sources.length (${sources.length}).` })
  }
  if (compteursPackMinimal === null) {
    errors.push({ path: "compteurs.pack_minimal", message: "compteurs.pack_minimal est obligatoire." })
  } else if (compteursPackMinimal !== packMinimal.length) {
    errors.push({ path: "compteurs.pack_minimal", message: `compteurs.pack_minimal (${compteursPackMinimal}) ≠ pack_minimal.length (${packMinimal.length}).` })
  }
  if (compteursPackEnrichi === null) {
    errors.push({ path: "compteurs.pack_enrichi", message: "compteurs.pack_enrichi est obligatoire." })
  } else if (compteursPackEnrichi !== packEnrichi.length) {
    errors.push({ path: "compteurs.pack_enrichi", message: `compteurs.pack_enrichi (${compteursPackEnrichi}) ≠ pack_enrichi.length (${packEnrichi.length}).` })
  }

  if (errors.length > 0) return { ok: false, errors }

  const collectableCount = sources.filter((s) => s.contentTemporality !== "static").length

  return {
    ok: true,
    data: {
      meta: {
        segmentSlug: segmentSlug as string,
        secteur: toNullableString(meta!.secteur),
        geographie: toNullableString(meta!.geographie),
        dateSnapshot: dateSnapshot as string,
        version: SOURCE_REGISTRY_VERSION,
        validationStatus: metaValidationStatus,
      },
      besoinsInformation: Array.isArray(root.besoins_information) ? root.besoins_information : [],
      famillesSectoriellesObligatoires: {
        presse_professionnelle: presse as string,
        federation: federation as string,
        regulateur: regulateur as string,
      },
      sources,
      packMinimal,
      packEnrichi,
      matriceCouverture: rawMatriceCouverture,
      gaps: Array.isArray(root.gaps) ? root.gaps : [],
      compteurs: {
        sources: compteursSources as number,
        packMinimal: compteursPackMinimal as number,
        packEnrichi: compteursPackEnrichi as number,
        requetes: compteursRequetes ?? 0,
      },
      collectableCount,
      staticCount: sources.length - collectableCount,
    },
  }
}

/**
 * Mapping du verdict E3 §12 : `pending` n'existe pas dans l'enum SQL
 * `corpus_quality_verdict` — il devient `usable_with_caveats`. Le statut
 * documentaire ne bloque jamais l'existence du corpus, seul `activation_state`
 * (toujours `draft` à l'import) pilote la collecte.
 */
export function mapE3VerdictToCorpusQualityVerdict(verdict: SourceRegistryMetaVerdict): CorpusQualityVerdictValue {
  return verdict === "pending" ? "usable_with_caveats" : verdict
}

/**
 * Heuristique déterministe, sans réseau : un `collection_url` n'est projeté
 * comme flux direct que s'il ressemble effectivement à un flux RSS/Atom.
 * Le contrat E3 autorise API/formulaire/documentation en `collection_url` —
 * le workflow de veille Lot 2 interprète toute URL non nulle comme un flux
 * direct (Lot 4 §10) : les copier aveuglément casserait la collecte. Aucune
 * des 29 `collection_url` du corpus parfumerie ne matche ce motif — c'est le
 * comportement attendu, pas un défaut de l'heuristique.
 */
const RSS_LIKE_PATTERN = /(\/(rss|feed|atom)(\/|\.|$|\?)|\.(rss|atom)(\?|$))/i

export function deriveImportCollectionUrl(rawCollectionUrl: string | null): string | null {
  if (!rawCollectionUrl) return null
  return RSS_LIKE_PATTERN.test(rawCollectionUrl) ? rawCollectionUrl : null
}

// ---------------------------------------------------------------------------
// Mapping E3 -> source_catalog / source_corpus_items (Lot 4 §8-§12).
// Pure : ne dépend d'aucune donnée qui ne soit pas déjà en mémoire — la
// résolution de la source existante (lecture Supabase) est faite en amont,
// par `data/resolve-source-corpus-import.ts`, et passée ici en paramètre.
// ---------------------------------------------------------------------------

export type ExistingSourceMatch = { id: string; sourceKey: string; origin: SourceOrigin; isLocked: boolean; name: string }

export type SourceCorpusItemPreview = {
  srcId: string
  input: SourceRegistrySourceInput
  /** `existingMatch` non nul ⇒ réutilisé de force (§8) : jamais de doublon sur un domaine déjà catalogué. */
  existingMatch: ExistingSourceMatch | null
  isNewSource: boolean
  sourceKey: string
  mappedName: string
  mappedPublisher: string | null
  mappedDomain: string | null
  mappedSearchDomain: string
  mappedHomepageUrl: string
  mappedFamily: string | null
  mappedKredoCategory: "vertical"
  mappedCollectionUrl: string | null
  isCollectable: boolean
  newsEligible: boolean
  accountWatchEligible: boolean
  isEnabledDefault: boolean
  exclusionReasonDefault: string | null
}

/**
 * Construit la prévisualisation d'une source E3 (mapping §9-§11). `existingMatch`
 * vient d'une lecture Supabase faite par l'appelant — cette fonction ne lit rien.
 */
export function buildSourceCorpusItemPreview(
  source: SourceRegistrySourceInput,
  params: { secteur: string | null; normalizedDomain: string | null; normalizedSearchDomain: string; existingMatch: ExistingSourceMatch | null },
): SourceCorpusItemPreview {
  const { secteur, normalizedDomain, normalizedSearchDomain, existingMatch } = params
  const isCollectable = source.contentTemporality !== "static"
  const newsEligible = isCollectable && source.usageScopes.includes("news")
  const accountWatchEligible = isCollectable && source.usageScopes.includes("account_watch")

  return {
    srcId: source.srcId,
    input: source,
    existingMatch,
    isNewSource: existingMatch === null,
    // §8 — jamais SRC-XXX (identifiant local au livrable) : déterministe, dérivé du domaine.
    sourceKey: existingMatch?.sourceKey ?? `corpus:${normalizedSearchDomain}`,
    mappedName: source.publisher ?? normalizedSearchDomain,
    mappedPublisher: source.publisher,
    mappedDomain: normalizedDomain ?? normalizedSearchDomain,
    mappedSearchDomain: normalizedSearchDomain,
    mappedHomepageUrl: `https://${normalizedSearchDomain}`,
    mappedFamily: secteur ?? "Sectoriel",
    mappedKredoCategory: "vertical",
    mappedCollectionUrl: deriveImportCollectionUrl(source.collectionUrl),
    isCollectable,
    newsEligible,
    accountWatchEligible,
    isEnabledDefault: isCollectable,
    exclusionReasonDefault: isCollectable ? null : "Contenu statique — hors veille récurrente",
  }
}

export type SourceCorpusItemArbitration = { preview: SourceCorpusItemPreview; isEnabled: boolean; exclusionReason: string | null }

export type IngestSourceCorpusSourceItem = {
  source_key: string
  name: string
  publisher: string | null
  domain: string | null
  search_domain: string
  collection_url: string | null
  homepage_url: string
  family: string | null
  kredo_category: "vertical"
  content_temporality: SourceRegistryContentTemporality
  usage_scopes: SourceRegistryUsageScope[]
  external_src_id: string
  pack: SourceRegistryPack
  tier: string
  primary_role: SourceRegistryPrimaryRole
  utility_score: number
  automation_fit: SourceRegistryAutomationFit
  familles_couvertes: string[]
  atteste: string | null
  news_eligible: boolean
  account_watch_eligible: boolean
  is_enabled: boolean
  exclusion_reason: string | null
}

export type IngestSourceCorpusPayload = {
  slug: string
  version: string
  snapshot_date: string
  quality_verdict: CorpusQualityVerdictValue
  /** Toujours `draft` (§12) : un corpus ne s'active jamais tout seul à l'import. */
  activation_state: "draft"
  source_document_path: string | null
  source_document_hash: string | null
  gaps: unknown[]
  metadata: Record<string, unknown>
  sources: IngestSourceCorpusSourceItem[]
}

/**
 * Assemble le payload RPC final à partir du livrable parsé, des décisions
 * d'arbitrage de l'étape 2 (activé/exclu par source) et des métadonnées du
 * document importé (§13). Pure : c'est la Server Action qui appelle la RPC.
 */
export function buildIngestSourceCorpusPayload(
  parsed: ParsedSourceRegistry,
  arbitrations: SourceCorpusItemArbitration[],
  corpusMeta: { sourceDocumentPath: string | null; sourceDocumentHash: string | null; sourceFileName: string | null },
): IngestSourceCorpusPayload {
  return {
    slug: `sources-${parsed.meta.segmentSlug}`,
    version: parsed.meta.version,
    snapshot_date: parsed.meta.dateSnapshot,
    quality_verdict: mapE3VerdictToCorpusQualityVerdict(parsed.meta.validationStatus),
    activation_state: "draft",
    source_document_path: corpusMeta.sourceDocumentPath,
    source_document_hash: corpusMeta.sourceDocumentHash,
    gaps: parsed.gaps,
    metadata: {
      meta: { secteur: parsed.meta.secteur, geographie: parsed.meta.geographie, segment_slug: parsed.meta.segmentSlug },
      besoins_information: parsed.besoinsInformation,
      familles_sectorielles_obligatoires: parsed.famillesSectoriellesObligatoires,
      matrice_couverture: parsed.matriceCouverture,
      compteurs: parsed.compteurs,
      source_file_name: corpusMeta.sourceFileName,
      source_e3_validation_status: parsed.meta.validationStatus,
      imported_at: new Date().toISOString(),
    },
    sources: arbitrations.map(({ preview, isEnabled, exclusionReason }) => ({
      source_key: preview.sourceKey,
      name: preview.mappedName,
      publisher: preview.mappedPublisher,
      domain: preview.mappedDomain,
      search_domain: preview.mappedSearchDomain,
      collection_url: preview.mappedCollectionUrl,
      homepage_url: preview.mappedHomepageUrl,
      family: preview.mappedFamily,
      kredo_category: preview.mappedKredoCategory,
      content_temporality: preview.input.contentTemporality,
      usage_scopes: preview.input.usageScopes,
      external_src_id: preview.srcId,
      pack: preview.input.pack,
      tier: String(preview.input.tier),
      primary_role: preview.input.primaryRole,
      utility_score: preview.input.utilityScore,
      automation_fit: preview.input.automationFit,
      familles_couvertes: preview.input.famillesCouvertes,
      atteste: preview.input.atteste,
      // Static reste dur : aucune arbitrage utilisateur ne peut le rendre collectable (§16).
      news_eligible: preview.isCollectable && preview.newsEligible,
      account_watch_eligible: preview.isCollectable && preview.accountWatchEligible,
      is_enabled: preview.isCollectable ? isEnabled : false,
      exclusion_reason: preview.isCollectable ? exclusionReason : (preview.exclusionReasonDefault ?? exclusionReason),
    })),
  }
}
