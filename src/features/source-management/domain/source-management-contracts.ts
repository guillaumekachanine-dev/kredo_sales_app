// Contrats du domaine « Gestion des sources » (Lot 3).
// Source unique de vérité pour les types, libellés et normalisations partagés
// entre le snapshot serveur, les Server Actions et les composants Desktop/Mobile.

export type SourceOrigin = "system" | "manual" | "corpus"
export type SourceContentTemporality = "static" | "periodic" | "continuous"
export type SourceValidationStatus = "pending" | "valid" | "rejected" | "unreachable"
export type SourceCollectionMode = "rss" | "site_search"

export type KredoSourceCategory =
  | "marche-esn"
  | "ia-appliquee"
  | "frontier"
  | "strategie"
  | "reglementaire"
  | "vertical"

export const KREDO_SOURCE_CATEGORY_ORDER: KredoSourceCategory[] = [
  "marche-esn",
  "ia-appliquee",
  "frontier",
  "strategie",
  "reglementaire",
  "vertical",
]

export const KREDO_SOURCE_CATEGORY_LABELS: Record<KredoSourceCategory, string> = {
  "marche-esn": "Marché IT / ESN",
  "ia-appliquee": "IA appliquée",
  frontier: "Frontier & acteurs IA",
  strategie: "Stratégie & marché",
  reglementaire: "Réglementaire & souveraineté",
  vertical: "Verticaux sectoriels",
}

export function isKredoSourceCategory(value: string | null): value is KredoSourceCategory {
  return value !== null && (KREDO_SOURCE_CATEGORY_ORDER as string[]).includes(value)
}

export type SourceEffectivenessMetrics = {
  observations: number
  successfulObservations: number
  productiveObservations: number
  itemsCollected: number
  itemsAfterDedup: number
  itemsRetained: number
  reliabilityRate: number
  productiveRunRate: number
  retentionRate: number
  effectivenessScore: number | null
}

export type SourceCatalogEntry = {
  id: string
  sourceKey: string
  name: string
  publisher: string | null
  domain: string | null
  searchDomain: string
  collectionUrl: string | null
  collectionMode: SourceCollectionMode
  homepageUrl: string | null
  family: string | null
  kredoCategory: KredoSourceCategory | null
  origin: SourceOrigin
  contentTemporality: SourceContentTemporality
  usageScopes: string[]
  validationStatus: SourceValidationStatus
  isActive: boolean
  isLocked: boolean
  lastVerifiedAt: string | null
  lastError: string | null
  effectiveness?: SourceEffectivenessMetrics | null
}

export type CorpusQualityVerdict = "production_ready" | "usable_with_caveats" | "rejected"
export type CorpusActivationState = "draft" | "active"
export type CorpusPackType = "minimal" | "enrichi"
export type CorpusAutomationFit = "high" | "medium" | "low" | "manual_only"

export const CORPUS_QUALITY_VERDICT_LABELS: Record<CorpusQualityVerdict, string> = {
  production_ready: "Prêt production",
  usable_with_caveats: "Utilisable sous caveats",
  rejected: "Rejeté",
}

export type SourceCorpusItemView = {
  id: string
  sourceId: string
  source: SourceCatalogEntry | null
  externalSrcId: string | null
  pack: CorpusPackType
  tier: string | null
  utilityScore: number | null
  automationFit: CorpusAutomationFit | null
  newsEligible: boolean
  accountWatchEligible: boolean
  isEnabled: boolean
  exclusionReason: string | null
  /** content_temporality='static' sur la source : jamais collectée, visible seulement. */
  isCollectable: boolean
}

export type SourceCorpusView = {
  id: string
  slug: string
  version: string
  snapshotDate: string
  sectorId: string | null
  sectorName: string | null
  qualityVerdict: CorpusQualityVerdict
  activationState: CorpusActivationState
  enabledForNews: boolean
  enabledForAccountWatch: boolean
  totalSources: number
  collectableSources: number
  activeSources: number
  accountsFed: number
  evaluatedSourcesCount: number
  averageEffectivenessScore: number | null
  items: SourceCorpusItemView[]
}

export type SourceManagementSnapshot = {
  systemSources: SourceCatalogEntry[]
  manualSources: SourceCatalogEntry[]
  sectorCorpora: SourceCorpusView[]
  activeNewsSourceCount: number
  canManage: boolean
}

export const EMPTY_SOURCE_MANAGEMENT_SNAPSHOT: SourceManagementSnapshot = {
  systemSources: [],
  manualSources: [],
  sectorCorpora: [],
  activeNewsSourceCount: 0,
  canManage: false,
}

export function deriveCollectionMode(collectionUrl: string | null | undefined): SourceCollectionMode {
  return collectionUrl && collectionUrl.trim().length > 0 ? "rss" : "site_search"
}

/**
 * Normalise un hostname pour la déduplication : minuscules, sans protocole,
 * sans `www.`, sans slash final. Retourne `null` si l'URL est invalide.
 */
const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export function normalizeHostname(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    const host = url.hostname.toLowerCase()
    const normalized = host.startsWith("www.") ? host.slice(4) : host
    return HOSTNAME_PATTERN.test(normalized) ? normalized : null
  } catch {
    return null
  }
}

export type ManualSourceFormInput = {
  name: string
  url: string
  family: string
  kredoCategory: KredoSourceCategory | ""
  rssUrl?: string
}

export type ManualSourceValidationResult =
  | { ok: true; data: { name: string; searchDomain: string; homepageUrl: string; family: string; kredoCategory: KredoSourceCategory; collectionUrl: string | null } }
  | { ok: false; error: string }

export function validateManualSourceInput(input: ManualSourceFormInput): ManualSourceValidationResult {
  const name = input.name.trim()
  if (!name) return { ok: false, error: "Le nom est obligatoire." }

  const searchDomain = normalizeHostname(input.url)
  if (!searchDomain) return { ok: false, error: "L'URL du site n'est pas valide." }

  const family = input.family.trim()
  if (!family) return { ok: false, error: "La famille est obligatoire." }

  if (!isKredoSourceCategory(input.kredoCategory)) return { ok: false, error: "La catégorie KREDO est obligatoire." }

  let collectionUrl: string | null = null
  const rawRss = input.rssUrl?.trim()
  if (rawRss) {
    try {
      collectionUrl = new URL(rawRss).toString()
    } catch {
      return { ok: false, error: "Le flux RSS n'est pas une URL valide." }
    }
  }

  const homepageUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input.url.trim()) ? input.url.trim() : `https://${input.url.trim()}`

  return {
    ok: true,
    data: { name, searchDomain, homepageUrl, family, kredoCategory: input.kredoCategory, collectionUrl },
  }
}

/** `source_key` déterministe et stable pour une source manuelle : dérivé du domaine, jamais du nom (qui peut changer). */
export function buildManualSourceKey(searchDomain: string): string {
  return `manual:${searchDomain}`
}
