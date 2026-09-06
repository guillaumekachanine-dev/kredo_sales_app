/**
 * Lot 1 ADR-0022 — vue normalisée d'un import de corpus, pour le wizard.
 *
 * Module PUR. Le wizard sait afficher DEUX formats d'entrée (livrable Master
 * Study E3, liste thématique) sans que sa présentation ne connaisse ni l'un ni
 * l'autre : les deux se projettent ici, dans le même modèle d'affichage.
 *
 * Ce n'est pas le point de convergence des DONNÉES — celui-là est plus bas, au
 * résolveur et à la RPC. C'est le point de convergence de l'ÉCRAN.
 */

import type { SourceCorpusItemPreview } from "./source-registry-output"
import type { ParsedSourceRegistry } from "./source-registry-output"
import type { ParsedThematicSourceList, ThematicSourceItemPreview } from "./thematic-source-list"

export type CorpusImportScopeKind = "sector" | "thematic"

export type CorpusImportItemView = {
  srcId: string
  title: string
  subtitle: string
  badges: string[]
  meta: string
  /** Une source non collectable ne peut pas être activée à la main (règle dure des deux formats). */
  isCollectable: boolean
  isEnabledDefault: boolean
  isNewSource: boolean
  /** Motif affiché quand la source est hors veille. */
  exclusionReason: string | null
}

export type CorpusImportHeaderView = {
  scopeKind: CorpusImportScopeKind
  /** Titre du bloc de synthèse de l'étape 1. */
  analysisTitle: string
  corpusSlug: string
  /** Ce que vise le corpus : un segment, ou rien. */
  targetLabel: string
  targetValue: string
  version: string
  snapshotDate: string
  sourcesCount: number
  collectableCount: number
  excludedCount: number
  /** Ligne libre affichée sous la grille (packs E3, ou compte de flux). */
  detailLine: string
  verdictLabel: string
}

export function buildE3ItemView(item: SourceCorpusItemPreview): CorpusImportItemView {
  return {
    srcId: item.srcId,
    title: item.mappedPublisher ?? item.srcId,
    subtitle: `${item.srcId} · ${item.mappedSearchDomain}`,
    badges: [`T${item.input.tier}`, item.input.pack],
    meta: `${item.input.contentTemporality} (${item.input.usageScopes.join(", ") || "—"})`,
    isCollectable: item.isCollectable,
    isEnabledDefault: item.isEnabledDefault,
    isNewSource: item.isNewSource,
    exclusionReason: item.exclusionReasonDefault,
  }
}

export function buildThematicItemView(item: ThematicSourceItemPreview): CorpusImportItemView {
  return {
    srcId: item.srcId,
    title: item.mappedName,
    subtitle: item.mappedSearchDomain,
    badges: [item.mappedKredoCategory, item.mappedCollectionUrl ? "flux" : "site:"],
    // Pour une source écartée, la meta porte le motif : c'est l'information utile
    // à l'écran, pas une temporalité qu'on n'ira jamais collecter.
    meta: item.newsEligible ? "continuous (news)" : (item.exclusionReasonDefault ?? "hors veille"),
    isCollectable: item.newsEligible,
    isEnabledDefault: item.isEnabledDefault,
    isNewSource: item.isNewSource,
    exclusionReason: item.exclusionReasonDefault,
  }
}

export function buildE3HeaderView(parsed: ParsedSourceRegistry): CorpusImportHeaderView {
  return {
    scopeKind: "sector",
    analysisTitle: "Synthèse de l'analyse E3",
    corpusSlug: `sources-${parsed.meta.segmentSlug}`,
    targetLabel: "Segment / Secteur",
    targetValue: parsed.meta.segmentSlug,
    version: parsed.meta.version,
    snapshotDate: parsed.meta.dateSnapshot,
    sourcesCount: parsed.sources.length,
    collectableCount: parsed.collectableCount,
    excludedCount: parsed.staticCount,
    detailLine: `Packs : minimal (${parsed.packMinimal.length}) · enrichi (${parsed.packEnrichi.length})`,
    verdictLabel: `Verdict : ${parsed.meta.validationStatus}`,
  }
}

export function buildThematicHeaderView(parsed: ParsedThematicSourceList): CorpusImportHeaderView {
  const withFeed = parsed.sources.filter((source) => source.rssUrl !== null).length
  return {
    scopeKind: "thematic",
    analysisTitle: "Synthèse de la liste thématique",
    corpusSlug: parsed.slug,
    targetLabel: "Corpus thématique",
    targetValue: parsed.name,
    version: parsed.version,
    snapshotDate: parsed.snapshotDate,
    sourcesCount: parsed.sources.length,
    collectableCount: parsed.newsEligibleCount,
    excludedCount: parsed.excludedCount,
    detailLine: `${withFeed} flux direct(s) · ${parsed.sources.length - withFeed} sans flux`,
    // Un corpus thématique n'a pas de scorecard E3 : le dire, plutôt que d'afficher
    // un verdict qui n'a pas été produit.
    verdictLabel: "Sans verdict E3",
  }
}
