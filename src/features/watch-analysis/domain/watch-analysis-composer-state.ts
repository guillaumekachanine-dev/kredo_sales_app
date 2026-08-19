// État pur du compositeur (tableau de 3 emplacements de sources) — aucune I/O,
// aucun hook React. Extrait de `hooks/use-watch-analysis-composer.ts` pour
// rester testable sans DOM (le repo n'a pas d'infra de test de composants —
// `vitest.config.ts` n'inclut que `src/**/*.test.ts`, jamais `.test.tsx`).

import type { WatchAnalysisInputV2, WatchAnalysisSource } from "@/lib/n8n/types"

export const MAX_WATCH_ANALYSIS_SLOTS = 3

export type WatchAnalysisSlots = Array<WatchAnalysisSource | null>

export function initialSlots(initialDigestSource: WatchAnalysisSource | null): WatchAnalysisSlots {
  const slots: WatchAnalysisSlots = [null, null, null]
  if (initialDigestSource) slots[0] = initialDigestSource
  return slots
}

export function setSlotAt(
  slots: WatchAnalysisSlots,
  index: number,
  source: WatchAnalysisSource | null,
): WatchAnalysisSlots {
  const next = [...slots]
  next[index] = source
  return next
}

export function sourcesFromSlots(slots: WatchAnalysisSlots): WatchAnalysisSource[] {
  return slots.filter((slot): slot is WatchAnalysisSource => slot !== null)
}

export function canAddSlot(slots: WatchAnalysisSlots): boolean {
  return sourcesFromSlots(slots).length < MAX_WATCH_ANALYSIS_SLOTS && slots.some((slot) => slot === null)
}

export function firstEmptySlotIndex(slots: WatchAnalysisSlots): number | null {
  const index = slots.findIndex((slot) => slot === null)
  return index === -1 ? null : index
}

export function buildWatchAnalysisInput(params: {
  intention: string
  slots: WatchAnalysisSlots
  requestedAt: string
}): WatchAnalysisInputV2 {
  return {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: params.intention,
    sources: sourcesFromSlots(params.slots),
    requestedAt: params.requestedAt,
  }
}
