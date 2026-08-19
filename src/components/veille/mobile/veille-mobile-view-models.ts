/**
 * View-models internes de la refonte mobile /veille.
 *
 * Ces fonctions sont volontairement PURES : elles ne connaissent ni Supabase ni
 * React. Elles transforment les contrats serveur déjà transmis au composant
 * mobile (`VeilleArticle`, `VeilleDigest`, `WatchedAccountSignal`,
 * `StrategicWatchAnalysis`) en structures directement consommables par les
 * quatre onglets. Aucune donnée n'est réécrite côté base : les normalisations
 * ci-dessous sont strictement de la PRÉSENTATION.
 */
import type {
  VeilleArticle,
  VeilleDigest,
  WatchedAccountSignal,
} from "@/app/(app)/veille/_data/veille-data"
import type { StrategicWatchAnalysis } from "../veille-desktop-contracts"
import type { WatchAnalysisEvidenceRef } from "@/lib/n8n/types"

/* ────────────────────────────────────────────────────────────
   Onglet 1 — Actualités
   ──────────────────────────────────────────────────────────── */

export type NewsRowVM = {
  id: string
  digestId: string
  title: string
  sourceName: string | null
  /** Libellé de catégorie normalisé pour l'affichage (jamais persisté). */
  categoryLabel: string | null
  /** Clé de famille servant au filtre Catégorie. */
  categoryKey: string | null
  publishedAt: string | null
  dateLabel: string | null
}

/**
 * Familles de catégories. Les données réelles mélangent des variantes
 * (`Réglementaire`, `Réglementation`, `Réglementation / Gouvernance IA`, …) :
 * on les replie sur une famille canonique POUR L'AFFICHAGE uniquement.
 */
const CATEGORY_FAMILIES: Array<{ key: string; label: string; match: (value: string) => boolean }> = [
  { key: "reglementation", label: "Réglementation", match: (v) => v.includes("reglement") },
  { key: "cas-usage", label: "Cas d'usage IA", match: (v) => v.includes("cas d'usage") || v.includes("cas dusage") },
  { key: "infrastructure", label: "Infrastructure", match: (v) => v.includes("infrastructure") || v.includes("souverainete") },
  { key: "investissement", label: "Investissement", match: (v) => v.includes("investissement") || v.includes("marche") },
  { key: "produit", label: "Produit", match: (v) => v.includes("produit") },
  { key: "tendance", label: "Tendance IA", match: (v) => v.includes("tendance") },
  { key: "gouvernance", label: "Gouvernance IA", match: (v) => v.includes("gouvernance") },
]

function foldAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

/** Replie une catégorie brute sur sa famille canonique (présentation seule). */
export function normalizeCategory(raw: string | null | undefined): { key: string; label: string } | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null

  const folded = foldAccents(trimmed)
  const family = CATEGORY_FAMILIES.find((candidate) => candidate.match(folded))
  if (family) return { key: family.key, label: family.label }

  // Catégorie inconnue : on garde le libellé tel quel plutôt que de le ranger
  // de force dans une famille qui ne lui correspond pas.
  return { key: `autre:${folded}`, label: trimmed }
}

export function formatNewsDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

export function buildNewsRows(articles: VeilleArticle[]): NewsRowVM[] {
  return [...articles]
    .sort((a, b) => {
      const left = a.published_at ? new Date(a.published_at).getTime() : 0
      const right = b.published_at ? new Date(b.published_at).getTime() : 0
      if (right !== left) return right - left
      return a.selection_rank - b.selection_rank
    })
    .map((article) => {
      const category = normalizeCategory(article.categorie)
      return {
        id: article.id,
        digestId: article.digest_id,
        title: article.titre_fr,
        sourceName: article.source_name?.trim() || null,
        categoryLabel: category?.label ?? null,
        categoryKey: category?.key ?? null,
        publishedAt: article.published_at,
        dateLabel: formatNewsDate(article.published_at),
      }
    })
}

/** Familles réellement présentes dans le flux — aucune catégorie inventée. */
export function collectCategoryOptions(rows: NewsRowVM[]): Array<{ key: string; label: string }> {
  const seen = new Map<string, string>()
  for (const row of rows) {
    if (row.categoryKey && row.categoryLabel && !seen.has(row.categoryKey)) {
      seen.set(row.categoryKey, row.categoryLabel)
    }
  }
  return [...seen.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
}

/** Filtre le flux. `categoryKeys` vide = aucune restriction de catégorie. */
export function filterNewsRows(
  rows: NewsRowVM[],
  filters: { search: string; categoryKeys: string[] },
): NewsRowVM[] {
  const needle = foldAccents(filters.search.trim())
  const selected = new Set(filters.categoryKeys)
  return rows.filter((row) => {
    if (selected.size > 0 && (!row.categoryKey || !selected.has(row.categoryKey))) return false
    if (!needle) return true
    const haystack = foldAccents(`${row.title} ${row.sourceName ?? ""} ${row.categoryLabel ?? ""}`)
    return haystack.includes(needle)
  })
}

/* ────────────────────────────────────────────────────────────
   Accent de catégorie
   ──────────────────────────────────────────────────────────── */

/**
 * Slot de la palette `dataviz` (catégorielle, sans sémantique de statut —
 * contrairement à `danger`/`warning` qui signifieraient autre chose).
 *
 * La couleur est portée par une PASTILLE et une teinte de fond, jamais par le
 * texte : sur blanc, `dataviz-2` (#D89B16) et `dataviz-6` (#D4B26A) plafonnent
 * autour de 2:1 de contraste et seraient illisibles en encre.
 */
export type CategoryAccentSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7

const CATEGORY_ACCENTS: Record<string, CategoryAccentSlot> = {
  reglementation: 1,
  "cas-usage": 3,
  infrastructure: 7,
  investissement: 4,
  produit: 5,
  tendance: 2,
  gouvernance: 6,
}

export function categoryAccentSlot(categoryKey: string | null | undefined): CategoryAccentSlot {
  if (!categoryKey) return 1
  const known = CATEGORY_ACCENTS[categoryKey]
  if (known) return known
  // Catégorie hors référentiel : slot stable dérivé du libellé, pour qu'une
  // même catégorie garde toujours la même couleur d'une session à l'autre.
  let hash = 0
  for (let index = 0; index < categoryKey.length; index += 1) {
    hash = (hash * 31 + categoryKey.charCodeAt(index)) % 7
  }
  return ((hash + 1) as CategoryAccentSlot)
}

/* ────────────────────────────────────────────────────────────
   Périodes de digest (navigation hebdomadaire)
   ──────────────────────────────────────────────────────────── */

export type DigestPeriodVM = {
  digestId: string
  title: string
  weekNumber: number
  /** « Semaine 31 » */
  weekLabel: string
  /** « 27 au 30 juillet » ou « 27 juillet au 2 août » */
  rangeLabel: string
  /** Libellé complet affiché dans le navigateur. */
  label: string
  articleCount: number
}

/** Numéro de semaine ISO-8601 (lundi = premier jour, semaine 1 = celle du 4 janvier). */
export function isoWeekNumber(date: Date): number {
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNumber = shifted.getUTCDay() || 7
  shifted.setUTCDate(shifted.getUTCDate() + 4 - dayNumber)
  const yearStart = Date.UTC(shifted.getUTCFullYear(), 0, 1)
  return Math.ceil(((shifted.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

function formatCoverageRange(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" })
  const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })
  if (start.getTime() === end.getTime()) return dayMonth.format(start)
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()
  return sameMonth ? `${day.format(start)} au ${dayMonth.format(end)}` : `${dayMonth.format(start)} au ${dayMonth.format(end)}`
}

/**
 * Construit les périodes navigables, de la plus récente à la plus ancienne.
 *
 * La période affichée est la COUVERTURE RÉELLE des articles du digest, pas la
 * semaine calendaire de `digest_date` : un digest publié le 3 août analyse en
 * pratique des articles du 27 au 30 juillet. Afficher « semaine du 3 août »
 * mentirait sur le contenu.
 */
export function buildDigestPeriods(
  digests: VeilleDigest[],
  articles: VeilleArticle[],
): DigestPeriodVM[] {
  const byDigest = new Map<string, VeilleArticle[]>()
  for (const article of articles) {
    const bucket = byDigest.get(article.digest_id)
    if (bucket) bucket.push(article)
    else byDigest.set(article.digest_id, [article])
  }

  return [...digests]
    .sort((a, b) => b.digest_date.localeCompare(a.digest_date))
    .map((digest) => {
      const own = byDigest.get(digest.id) ?? []
      const stamps = own
        .map((article) => article.published_at)
        .filter((value): value is string => Boolean(value))
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())

      const fallback = new Date(`${digest.digest_date.slice(0, 10)}T00:00:00Z`)
      const start = stamps[0] ?? fallback
      const end = stamps[stamps.length - 1] ?? fallback
      const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
      const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

      const weekNumber = isoWeekNumber(startUtc)
      const weekLabel = `Semaine ${weekNumber}`
      const rangeLabel = formatCoverageRange(startUtc, endUtc)

      return {
        digestId: digest.id,
        title: digest.titre_digest,
        weekNumber,
        weekLabel,
        rangeLabel,
        label: `${weekLabel} · ${rangeLabel}`,
        articleCount: own.length,
      }
    })
}

/* ────────────────────────────────────────────────────────────
   Onglet 2 — Signaux des comptes surveillés
   ──────────────────────────────────────────────────────────── */

export type SignalMarker = "action" | "watch" | null

/** `urgency_score >= 0.70` ⇒ à traiter. Sinon action recommandée ⇒ à surveiller. */
export const SIGNAL_URGENCY_THRESHOLD = 0.7

export type SignalGroupVM = {
  companyId: string
  companyName: string
  logoPath: string | null
  website: string | null
  primary: WatchedAccountSignal
  /** Tous les signaux du compte, dédupliqués, dans l'ordre de tri. */
  signals: WatchedAccountSignal[]
  otherCount: number
  marker: SignalMarker
  ageLabel: string | null
}

export function resolveSignalMarker(signal: WatchedAccountSignal): SignalMarker {
  if (signal.urgencyScore >= SIGNAL_URGENCY_THRESHOLD) return "action"
  if (signal.recommendedAction && signal.recommendedAction.trim().length > 0) return "watch"
  return null
}

export const SIGNAL_MARKER_LABELS: Record<Exclude<SignalMarker, null>, string> = {
  action: "À traiter",
  watch: "À surveiller",
}

const MARKER_PRIORITY: Record<string, number> = { action: 2, watch: 1, none: 0 }

/** Ancienneté compacte (« 28 j », « 4 h »), lisible dans une ligne dense. */
export function formatSignalAge(value: string | null | undefined, now: Date = new Date()): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) return "à l'instant"
  const days = Math.floor(diffMs / 86_400_000)
  if (days >= 1) return `${days} j`
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours >= 1) return `${hours} h`
  return "à l'instant"
}

function compareSignals(a: WatchedAccountSignal, b: WatchedAccountSignal) {
  const markerDelta =
    MARKER_PRIORITY[resolveSignalMarker(b) ?? "none"] - MARKER_PRIORITY[resolveSignalMarker(a) ?? "none"]
  if (markerDelta !== 0) return markerDelta
  if (b.globalScore !== a.globalScore) return b.globalScore - a.globalScore
  return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
}

/**
 * Regroupe les signaux par entreprise. La base contient des lignes strictement
 * redondantes (même compte, même titre, plusieurs insertions de veille) : on
 * les fusionne pour que le compteur « N autres signaux » reste sincère.
 */
export function buildSignalGroups(
  signals: WatchedAccountSignal[],
  now: Date = new Date(),
): SignalGroupVM[] {
  const byCompany = new Map<string, WatchedAccountSignal[]>()
  for (const signal of signals) {
    const bucket = byCompany.get(signal.company.id)
    if (bucket) bucket.push(signal)
    else byCompany.set(signal.company.id, [signal])
  }

  const groups: SignalGroupVM[] = []
  for (const bucket of byCompany.values()) {
    const seenTitles = new Set<string>()
    const deduped: WatchedAccountSignal[] = []
    for (const signal of [...bucket].sort(compareSignals)) {
      const key = foldAccents(signal.title.trim())
      if (seenTitles.has(key)) continue
      seenTitles.add(key)
      deduped.push(signal)
    }
    const primary = deduped[0]
    if (!primary) continue

    groups.push({
      companyId: primary.company.id,
      companyName: primary.company.name,
      logoPath: primary.company.logoPath,
      website: primary.company.website,
      primary,
      signals: deduped,
      otherCount: deduped.length - 1,
      marker: resolveSignalMarker(primary),
      ageLabel: formatSignalAge(primary.detectedAt, now),
    })
  }

  return groups.sort((a, b) => compareSignals(a.primary, b.primary))
}

/* ────────────────────────────────────────────────────────────
   Onglet 3 — Analyses stratégiques
   ──────────────────────────────────────────────────────────── */

export type AnalysisSectionKey = "trends" | "opportunities" | "risks"

export type AnalysisSectionVM = {
  key: AnalysisSectionKey
  label: string
  count: number
  items: Array<{ title: string; body: string; evidenceRefs?: WatchAnalysisEvidenceRef[] }>
}

export type AnalysisIndexVM = {
  id: string
  title: string
  periodLabel: string
  analysisTitle: string
  periodRange: string | null
  statusLabel: string
  executiveSummary: string
  coverageLabel: string | null
  digestsCount: number | null
  producedAtLabel: string | null
  metaSubtitle: string | null
  sections: AnalysisSectionVM[]
}

const ANALYSIS_STATUS_LABELS: Record<StrategicWatchAnalysis["status"], string> = {
  draft: "Brouillon",
  ready: "Prête",
  used: "Utilisée",
  archived: "Archivée",
}

export function formatProducedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

function formatPeriodRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" })
  const longFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })
  return `${dayFormatter.format(startDate)}–${longFormatter.format(endDate)}`
}

export function buildAnalysisIndex(analysis: StrategicWatchAnalysis): AnalysisIndexVM {
  const content = analysis.content
  const isV2 = content?.schemaVersion === 2

  const rawPeriodLabel = isV2 ? "Analyse à la demande" : (content?.period?.label ?? analysis.title)
  const analysisTitle = isV2 ? analysis.title : (rawPeriodLabel.startsWith("Analyse") ? rawPeriodLabel : `Analyse ${rawPeriodLabel}`)

  const producedDate = formatProducedDate(analysis.createdAt)
  const producedAtLabel = producedDate ? `produite le ${producedDate}` : null

  const coverageLabel = content
    ? isV2
      ? `${content.coverage.articlesCount} articles · ${content.coverage.signalsCount} signaux · ${content.coverage.documentsCount} docs`
      : `${content.coverage.articlesCount} articles · ${content.coverage.sourcesCount} sources`
    : null

  const metaParts: string[] = []
  if (content) {
    if (isV2) {
      metaParts.push(`${content.coverage.articlesCount} articles`, `${content.coverage.signalsCount} signaux`, `${content.coverage.documentsCount} docs`)
    } else {
      metaParts.push(`${content.coverage.articlesCount} articles`, `${content.coverage.sourcesCount} sources`)
    }
  }
  if (producedDate) {
    metaParts.push(`Produite le ${producedDate}`)
  }
  const metaSubtitle = metaParts.length > 0 ? metaParts.join(" - ") : null

  const sections: AnalysisSectionVM[] = [
    {
      key: "trends",
      label: "Enseignements clés",
      count: content?.majorTrends?.length ?? 0,
      items: (content?.majorTrends ?? []).map((item) => ({
        title: item.title,
        body: item.synthesis,
        evidenceRefs: "evidenceRefs" in item ? item.evidenceRefs : undefined,
      })),
    },
    {
      key: "opportunities",
      label: "Opportunités commerciales",
      count: content?.commercialOpportunities?.length ?? 0,
      items: (content?.commercialOpportunities ?? []).map((item) => ({
        title: item.title,
        body: item.rationale,
        evidenceRefs: "evidenceRefs" in item ? item.evidenceRefs : undefined,
      })),
    },
    {
      key: "risks",
      label: "Risques à surveiller",
      count: content?.risksAndWatchpoints?.length ?? 0,
      items: (content?.risksAndWatchpoints ?? []).map((item) => ({
        title: item.title,
        body: item.explanation,
        evidenceRefs: "evidenceRefs" in item ? item.evidenceRefs : undefined,
      })),
    },
  ]

  return {
    id: analysis.id,
    title: analysis.title,
    periodLabel: rawPeriodLabel,
    analysisTitle,
    periodRange: isV2 ? null : formatPeriodRange(analysis.periodStart, analysis.periodEnd),
    statusLabel: ANALYSIS_STATUS_LABELS[analysis.status],
    executiveSummary: content?.executiveSummary ?? "",
    coverageLabel,
    digestsCount: content && "digestsCount" in content.coverage ? content.coverage.digestsCount : null,
    producedAtLabel,
    metaSubtitle,
    sections,
  }
}

/* ────────────────────────────────────────────────────────────
   Onglet 4 — Archives (chronologie de la veille)
   ──────────────────────────────────────────────────────────── */

export type ArchiveEntryKind = "digest" | "analysis"

export type ArchiveEntryVM = {
  id: string
  kind: ArchiveEntryKind
  kindLabel: string
  isManualCustom?: boolean
  /** ISO date (YYYY-MM-DD) servant au tri et au regroupement mensuel. */
  date: string
  dateLabel: string
  monthKey: string
  monthLabel: string
  title: string
  metaLabel: string | null
  statusLabel: string
}

export type ArchivePeriodFilter = "all" | "3m" | "12m"

export const ARCHIVE_TYPE_OPTIONS: Array<{ value: ArchiveEntryKind | "all"; label: string }> = [
  { value: "all", label: "Tout" },
  { value: "digest", label: "Briefings" },
  { value: "analysis", label: "Analyses" },
]

export const ARCHIVE_PERIOD_OPTIONS: Array<{ value: ArchivePeriodFilter; label: string }> = [
  { value: "all", label: "Tout l'historique" },
  { value: "3m", label: "3 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
]

function monthKeyOf(date: string) {
  return date.slice(0, 7)
}

function monthLabelOf(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(parsed)
    .toUpperCase()
}

function fullDateLabelOf(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(parsed)
}

export function buildArchiveEntries(input: {
  digests: VeilleDigest[]
  analyses: StrategicWatchAnalysis[]
  articleCountByDigest: Map<string, number>
}): ArchiveEntryVM[] {
  const entries: ArchiveEntryVM[] = []

  for (const digest of input.digests) {
    const date = digest.digest_date.slice(0, 10)
    const articles = input.articleCountByDigest.get(digest.id) ?? null
    const meta = [
      articles === null ? null : `${articles} article${articles > 1 ? "s" : ""}`,
      digest.nb_sources_actives > 0 ? `${digest.nb_sources_actives} sources` : null,
    ].filter(Boolean)

    entries.push({
      id: digest.id,
      kind: "digest",
      kindLabel: "Briefing",
      date,
      dateLabel: fullDateLabelOf(date),
      monthKey: monthKeyOf(date),
      monthLabel: monthLabelOf(date),
      title: digest.titre_digest,
      metaLabel: meta.length > 0 ? meta.join(" · ") : null,
      statusLabel: "Prêt",
    })
  }

  for (const analysis of input.analyses) {
    const isV2 = analysis.analysisKind === "manual_custom" || analysis.content?.schemaVersion === 2
    const date = (analysis.periodEnd ?? analysis.createdAt).slice(0, 10)
    const content = analysis.content
    const metaLabel = content
      ? content.schemaVersion === 2
        ? `${content.coverage.articlesCount} articles · ${content.coverage.signalsCount} signaux · ${content.coverage.documentsCount} docs`
        : `${content.coverage.articlesCount} articles · ${content.coverage.sourcesCount} sources`
      : null

    entries.push({
      id: analysis.id,
      kind: "analysis",
      kindLabel: isV2 ? "Analyse à la demande" : "Analyse mensuelle",
      isManualCustom: isV2,
      date,
      dateLabel: fullDateLabelOf(date),
      monthKey: monthKeyOf(date),
      monthLabel: monthLabelOf(date),
      title: analysis.title,
      metaLabel,
      statusLabel: ANALYSIS_STATUS_LABELS[analysis.status],
    })
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

export function filterArchiveEntries(
  entries: ArchiveEntryVM[],
  filters: { search: string; kind: ArchiveEntryKind | "all"; period: ArchivePeriodFilter },
  now: Date = new Date(),
): ArchiveEntryVM[] {
  const needle = foldAccents(filters.search.trim())
  let floor: string | null = null
  if (filters.period !== "all") {
    const months = filters.period === "3m" ? 3 : 12
    const boundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()))
    floor = boundary.toISOString().slice(0, 10)
  }

  return entries.filter((entry) => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) return false
    if (floor && entry.date < floor) return false
    if (!needle) return true
    return foldAccents(`${entry.title} ${entry.kindLabel}`).includes(needle)
  })
}

export function groupArchiveEntriesByMonth(entries: ArchiveEntryVM[]) {
  const groups: Array<{ monthKey: string; monthLabel: string; entries: ArchiveEntryVM[] }> = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.monthKey === entry.monthKey) last.entries.push(entry)
    else groups.push({ monthKey: entry.monthKey, monthLabel: entry.monthLabel, entries: [entry] })
  }
  return groups
}
