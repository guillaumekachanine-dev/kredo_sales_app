import type {
  SourceCorpusItemView,
  SourceCorpusView,
  SourceManagementSnapshot,
} from "./source-management-contracts"

/**
 * Recalcule les métriques dérivées d'un corpus à partir de sa liste d'items.
 */
function recalculateCorpusMetrics(items: SourceCorpusItemView[]) {
  const evaluatedItems = items.filter(
    (item) => item.source?.effectiveness?.effectivenessScore != null,
  )
  const evaluatedSourcesCount = evaluatedItems.length
  const averageEffectivenessScore =
    evaluatedSourcesCount > 0
      ? Math.round(
          evaluatedItems.reduce(
            (acc, item) => acc + (item.source?.effectiveness?.effectivenessScore ?? 0),
            0,
          ) / evaluatedSourcesCount,
        )
      : null

  return {
    totalSources: items.length,
    collectableSources: items.filter((item) => item.isCollectable).length,
    activeSources: items.filter((item) => item.isEnabled).length,
    evaluatedSourcesCount,
    averageEffectivenessScore,
  }
}

/**
 * Met à jour le nom et la description d'un corpus éditorial dans le snapshot local.
 */
export function updateCorpusEditorialInSnapshot(
  snapshot: SourceManagementSnapshot,
  corpusId: string,
  editorial: { name: string; description: string | null },
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    if (corpus.id !== corpusId) return corpus
    return {
      ...corpus,
      name: editorial.name,
      description: editorial.description,
    }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Renomme une source dans TOUTES les occurrences du snapshot local :
 * - catalogue système et manuel
 * - items de tous les corpus sectoriels et thématiques partageant ce sourceId.
 */
export function updateSourceNameInSnapshot(
  snapshot: SourceManagementSnapshot,
  sourceId: string,
  newName: string,
): SourceManagementSnapshot {
  const patchSource = <T extends { id: string; name: string }>(source: T): T => {
    if (source.id !== sourceId) return source
    return { ...source, name: newName }
  }

  const patchItem = (item: SourceCorpusItemView): SourceCorpusItemView => {
    if (item.sourceId !== sourceId && item.source?.id !== sourceId) {
      return item
    }
    return {
      ...item,
      source: item.source ? { ...item.source, name: newName } : null,
    }
  }

  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    const hasMatch = corpus.items.some(
      (item) => item.sourceId === sourceId || item.source?.id === sourceId,
    )
    if (!hasMatch) return corpus
    return {
      ...corpus,
      items: corpus.items.map(patchItem),
    }
  }

  return {
    ...snapshot,
    systemSources: snapshot.systemSources.map(patchSource),
    manualSources: snapshot.manualSources.map(patchSource),
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Retire un item uniquement du corpus concerné et recalcule immédiatement
 * l'ensemble des compteurs et scores dépendants de ce corpus.
 *
 * Ne modifie jamais source_catalog ni aucun autre corpus.
 */
export function removeSourceFromCorpusInSnapshot(
  snapshot: SourceManagementSnapshot,
  removedItemId: string,
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    const itemIndex = corpus.items.findIndex((item) => item.id === removedItemId)
    if (itemIndex === -1) return corpus

    const newItems = corpus.items.filter((item) => item.id !== removedItemId)
    const metrics = recalculateCorpusMetrics(newItems)

    return {
      ...corpus,
      items: newItems,
      ...metrics,
    }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Active ou désactive un item dans son corpus et recalcule activeSources.
 */
export function setCorpusItemEnabledInSnapshot(
  snapshot: SourceManagementSnapshot,
  itemId: string,
  isEnabled: boolean,
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    const itemIndex = corpus.items.findIndex((item) => item.id === itemId)
    if (itemIndex === -1) return corpus

    const newItems = corpus.items.map((item) => {
      if (item.id !== itemId) return item
      return { ...item, isEnabled }
    })

    return {
      ...corpus,
      items: newItems,
      activeSources: newItems.filter((i) => i.isEnabled).length,
    }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Met à jour le statut d'activation (draft / active) d'un corpus.
 */
export function setCorpusActivationInSnapshot(
  snapshot: SourceManagementSnapshot,
  corpusId: string,
  activationState: "draft" | "active",
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    if (corpus.id !== corpusId) return corpus
    return { ...corpus, activationState }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Active ou désactive l'éligibilité aux actualités d'un corpus.
 */
export function setCorpusNewsEnabledInSnapshot(
  snapshot: SourceManagementSnapshot,
  corpusId: string,
  enabled: boolean,
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    if (corpus.id !== corpusId) return corpus
    return { ...corpus, enabledForNews: enabled }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Active ou désactive l'éligibilité à la veille comptes d'un corpus.
 */
export function setCorpusAccountWatchEnabledInSnapshot(
  snapshot: SourceManagementSnapshot,
  corpusId: string,
  enabled: boolean,
): SourceManagementSnapshot {
  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    if (corpus.id !== corpusId) return corpus
    return { ...corpus, enabledForAccountWatch: enabled }
  }

  return {
    ...snapshot,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Met à jour l'état actif d'une source manuelle et synchronise les occurrences d'items.
 */
export function setManualSourceActiveInSnapshot(
  snapshot: SourceManagementSnapshot,
  sourceId: string,
  isActive: boolean,
): SourceManagementSnapshot {
  const patchManual = (source: SourceManagementSnapshot["manualSources"][number]) => {
    if (source.id !== sourceId) return source
    return { ...source, isActive }
  }

  const newManualSources = snapshot.manualSources.map(patchManual)
  const allActiveSources = [...snapshot.systemSources, ...newManualSources].filter((s) => s.isActive)

  const patchItem = (item: SourceCorpusItemView): SourceCorpusItemView => {
    if (item.sourceId !== sourceId && item.source?.id !== sourceId) return item
    return {
      ...item,
      source: item.source ? { ...item.source, isActive } : null,
    }
  }

  const patchCorpus = (corpus: SourceCorpusView): SourceCorpusView => {
    return {
      ...corpus,
      items: corpus.items.map(patchItem),
    }
  }

  return {
    ...snapshot,
    manualSources: newManualSources,
    activeNewsSourceCount: allActiveSources.filter((s) => s.usageScopes.includes("news")).length,
    sectorCorpora: snapshot.sectorCorpora.map(patchCorpus),
    thematicCorpora: snapshot.thematicCorpora.map(patchCorpus),
  }
}

/**
 * Supprime une source manuelle du catalogue dans le snapshot local.
 */
export function deleteManualSourceInSnapshot(
  snapshot: SourceManagementSnapshot,
  sourceId: string,
): SourceManagementSnapshot {
  const newManualSources = snapshot.manualSources.filter((s) => s.id !== sourceId)
  const allActiveSources = [...snapshot.systemSources, ...newManualSources].filter((s) => s.isActive)

  return {
    ...snapshot,
    manualSources: newManualSources,
    activeNewsSourceCount: allActiveSources.filter((s) => s.usageScopes.includes("news")).length,
  }
}
