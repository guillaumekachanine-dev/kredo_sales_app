"use client"

// État partagé du compositeur d'analyse à la demande — Desktop ET Mobile
// consomment ce même hook (cadrage L1 §8 : logique/hooks partagés, PAS le
// markup). Toute la logique testable sans DOM vit dans
// `domain/watch-analysis-composer-state.ts` et `data/launch-watch-analysis.ts` ;
// ce hook n'est qu'un fin adaptateur useState/useCallback par-dessus.

import { useCallback, useMemo, useState } from "react"
import type { WatchAnalysisInputV2, WatchAnalysisSource } from "@/lib/n8n/types"
import { validateWatchAnalysisInput } from "../domain/watch-analysis-contracts"
import {
  canAddSlot as canAddSlotPure,
  firstEmptySlotIndex,
  initialSlots,
  setSlotAt,
  sourcesFromSlots,
  type WatchAnalysisSlots,
} from "../domain/watch-analysis-composer-state"
import { launchWatchAnalysis, type LaunchWatchAnalysisResult } from "../data/launch-watch-analysis"

export type ComposerScreen = "compose" | "source-picker"

export type UseWatchAnalysisComposerOptions = {
  /** Source 1 préremplie avec le digest actuellement consulté, si présent (cadrage §4). */
  initialDigestSource?: WatchAnalysisSource | null
  onLaunched?: (runId: string) => void
}

export function useWatchAnalysisComposer({
  initialDigestSource = null,
  onLaunched,
}: UseWatchAnalysisComposerOptions = {}) {
  const [screen, setScreen] = useState<ComposerScreen>("compose")
  const [slots, setSlots] = useState<WatchAnalysisSlots>(() => initialSlots(initialDigestSource))
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null)
  const [intention, setIntention] = useState("")
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const openPicker = useCallback((slotIndex: number) => {
    setPickerSlotIndex(slotIndex)
    setScreen("source-picker")
  }, [])

  const openPickerForNewSlot = useCallback(() => {
    setSlots((current) => {
      const index = firstEmptySlotIndex(current)
      if (index !== null) {
        setPickerSlotIndex(index)
        setScreen("source-picker")
      }
      return current
    })
  }, [])

  const backToCompose = useCallback(() => {
    setScreen("compose")
    setPickerSlotIndex(null)
  }, [])

  const setSlot = useCallback((index: number, source: WatchAnalysisSource | null) => {
    setSlots((current) => setSlotAt(current, index, source))
  }, [])

  const removeSlot = useCallback((index: number) => setSlot(index, null), [setSlot])

  const confirmPickerSelection = useCallback(
    (source: WatchAnalysisSource) => {
      if (pickerSlotIndex === null) return
      setSlot(pickerSlotIndex, source)
      backToCompose()
    },
    [pickerSlotIndex, setSlot, backToCompose],
  )

  const sources = useMemo(() => sourcesFromSlots(slots), [slots])
  const canAddSlot = canAddSlotPure(slots)

  const validation = useMemo(() => {
    const candidate: WatchAnalysisInputV2 = {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention,
      sources,
      requestedAt: new Date().toISOString(),
    }
    return validateWatchAnalysisInput(candidate)
  }, [intention, sources])

  const reset = useCallback(() => {
    setScreen("compose")
    setSlots(initialSlots(initialDigestSource))
    setPickerSlotIndex(null)
    setIntention("")
    setLaunchError(null)
  }, [initialDigestSource])

  const launch = useCallback(async (): Promise<LaunchWatchAnalysisResult> => {
    setLaunchError(null)
    setIsLaunching(true)
    const result = await launchWatchAnalysis({ intention, sources })
    setIsLaunching(false)
    if (!result.ok) {
      setLaunchError(result.error)
      return result
    }
    onLaunched?.(result.runId)
    reset()
    return result
  }, [intention, sources, onLaunched, reset])

  return {
    screen,
    openPicker,
    openPickerForNewSlot,
    backToCompose,
    slots,
    pickerSlotIndex,
    setSlot,
    removeSlot,
    confirmPickerSelection,
    intention,
    setIntention,
    canAddSlot,
    validation,
    canLaunch: validation.ok,
    isLaunching,
    launchError,
    launch,
    reset,
  }
}

export type UseWatchAnalysisComposerReturn = ReturnType<typeof useWatchAnalysisComposer>
