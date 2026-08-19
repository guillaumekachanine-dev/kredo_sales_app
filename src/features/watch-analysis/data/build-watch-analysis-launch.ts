import "server-only"

/**
 * Construction de l'enveloppe transmise à n8n et du snapshot de traçabilité
 * pour les analyses à la demande (Veille, V2).
 *
 * docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/01-ARCHITECTURE-ET-CONTRATS.md §5 et §6
 */

import type { WatchAnalysisInputV2 } from "@/lib/n8n/types"
import type { ResolvedWatchAnalysisSources, WatchAnalysisResolvedRef } from "./resolve-watch-analysis-sources"

export type WatchAnalysisRunEnvelopeV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  requestedAt: string
  refs: WatchAnalysisResolvedRef[]
  stats: {
    sourceGroups: number
    resolvedRefs: number
  }
}

export type WatchAnalysisInputSnapshotV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  requestedAt: string
  sources: WatchAnalysisInputV2["sources"]
  resolvedRefs: WatchAnalysisResolvedRef[]
  resolutionStats: {
    sourceGroups: number
    resolvedRefs: number
  }
}

/**
 * Construit l'enveloppe envoyée au webhook n8n pour un run V2.
 * Ne contient que les références résolues et les métadonnées de lancement.
 */
export function buildWatchAnalysisRunEnvelope(
  validatedInput: WatchAnalysisInputV2,
  resolvedSources: ResolvedWatchAnalysisSources,
): WatchAnalysisRunEnvelopeV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: validatedInput.intention,
    requestedAt: validatedInput.requestedAt,
    refs: resolvedSources.refs,
    stats: resolvedSources.stats,
  }
}

/**
 * Construit le snapshot de traçabilité persisté dans `ai_intelligence_runs.input_snapshot`.
 * Ne contient AUCUN contenu métier textuel (ni articles, ni signaux, ni documents).
 */
export function buildWatchAnalysisInputSnapshot(
  validatedInput: WatchAnalysisInputV2,
  resolvedSources: ResolvedWatchAnalysisSources,
): WatchAnalysisInputSnapshotV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: validatedInput.intention,
    requestedAt: validatedInput.requestedAt,
    sources: validatedInput.sources,
    resolvedRefs: resolvedSources.refs,
    resolutionStats: resolvedSources.stats,
  }
}
