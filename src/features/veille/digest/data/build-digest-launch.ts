import "server-only"

/**
 * Construction de l'enveloppe transmise à n8n et du snapshot de traçabilité
 * pour le digest Sujet × Corpus (Veille, V2) — ADR-0022 §3.4 et §3.5.
 *
 * Module PUR / testable :
 *   1. Ce qui part vers n8n (enveloppe d'exécution pré-résolue).
 *   2. Ce qui est persisté dans `ai_intelligence_runs.input_snapshot` (trace compacte).
 */

import type { DigestLaunchInputV2 } from "../domain/digest-launch-contracts"
import type { ResolvedDigestLaunch, ResolvedDigestSource } from "./resolve-digest-launch"

export type DigestRunEnvelopeV2 = {
  schemaVersion: 2
  triggerMode: "manual"
  topicKey: string
  topicSectorId: string | null
  corpusId: string | null
  framing: string
  sources: ResolvedDigestSource[]
  stats: {
    sourcesCount: number
    rssCount: number
    siteSearchCount: number
  }
}

export type DigestInputSnapshotV2 = {
  schemaVersion: 2
  triggerMode: "manual"
  requested: {
    topicKey: string
    corpusId: string | null
  }
  resolved: {
    topicKey: string
    topicLabel: string
    topicSectorId: string | null
    presetVersion: number
    corpus: {
      id: string
      slug: string
      scopeKind: string
    } | null
    stats: {
      sourcesCount: number
      rssCount: number
      siteSearchCount: number
    }
    sources: Array<{
      sourceId: string
      sourceKey: string
      sourceName: string
      corpusId: string | null
    }>
  }
}

/**
 * Construit l'enveloppe envoyée au webhook n8n pour un digest V2.
 * Ne contient que des données résolues côté serveur sous RLS.
 * Ne transmet ni generationMode (n8n impose "manual") ni sourceCorpusId (n8n le dérive de corpusId).
 */
export function buildDigestRunEnvelope(
  _validatedInput: DigestLaunchInputV2,
  resolvedLaunch: ResolvedDigestLaunch,
): DigestRunEnvelopeV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual",
    topicKey: resolvedLaunch.topic.topicKey,
    topicSectorId: resolvedLaunch.topic.sectorId,
    corpusId: resolvedLaunch.corpus?.id ?? null,
    framing: resolvedLaunch.framing,
    sources: resolvedLaunch.sources,
    stats: resolvedLaunch.stats,
  }
}

/**
 * Construit le snapshot de traçabilité compact pour `ai_intelligence_runs.input_snapshot`.
 * Ne contient AUCUN texte complet de cadrage, ni contenu d'article, ni secrets.
 */
export function buildDigestInputSnapshot(
  validatedInput: DigestLaunchInputV2,
  resolvedLaunch: ResolvedDigestLaunch,
): DigestInputSnapshotV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual",
    requested: {
      topicKey: validatedInput.topicKey,
      corpusId: validatedInput.corpusId,
    },
    resolved: {
      topicKey: resolvedLaunch.topic.topicKey,
      topicLabel: resolvedLaunch.topic.label,
      topicSectorId: resolvedLaunch.topic.sectorId,
      presetVersion: resolvedLaunch.topic.presetVersion,
      corpus: resolvedLaunch.corpus
        ? {
            id: resolvedLaunch.corpus.id,
            slug: resolvedLaunch.corpus.slug,
            scopeKind: resolvedLaunch.corpus.scopeKind,
          }
        : null,
      stats: resolvedLaunch.stats,
      sources: resolvedLaunch.sources.map((source) => ({
        sourceId: source.sourceId,
        sourceKey: source.sourceKey,
        sourceName: source.sourceName,
        corpusId: source.corpusId,
      })),
    },
  }
}
