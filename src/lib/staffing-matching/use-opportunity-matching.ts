"use client"

import { useState } from "react"
import { createOpportunityStaffing } from "@/app/(app)/missions/_actions/opportunity-staffing"
import { profileSourceKey } from "@/components/staffing/matching/matching-ui-utils"
import { runOpportunityMatching } from "./actions"
import type { MatchingResult } from "./types"

export type MatchingPhase = "idle" | "loading" | "results" | "error"

export type PresentState = {
  presenting: boolean
  presented: boolean
  error: string | null
}

/**
 * Orchestration du matching provoqué, partagée par les deux surfaces qui
 * l'exposent : `MatchingDialog` (fiche besoin) et `MatchingComposer`
 * (Cockpit Intelligence). Une seule copie de la séquence
 * « lancer → classer → présenter », donc une seule à faire évoluer.
 *
 * Le moteur reste `runOpportunityMatching` : ce hook n'ajoute aucune règle
 * métier, il ne fait que porter l'état d'écran.
 */
export function useOpportunityMatching(opportunityId: string) {
  const [phase, setPhase] = useState<MatchingPhase>("idle")
  const [result, setResult] = useState<MatchingResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null)
  const [presentStateByKey, setPresentStateByKey] = useState<Map<string, PresentState>>(new Map())

  async function run() {
    setPhase("loading")
    setErrorMessage(null)
    const outcome = await runOpportunityMatching(opportunityId)
    if (!outcome.ok) {
      setErrorMessage(outcome.error)
      setPhase("error")
      return
    }
    setResult(outcome.result)
    setPresentStateByKey(new Map())
    setSelectedSourceKey(null)
    setPhase("results")
  }

  async function present(sourceKey: string, onStaffed?: () => void) {
    if (!result) return
    const profile = result.rankedProfiles.find((candidate) => profileSourceKey(candidate) === sourceKey)
    if (!profile) return

    setPresentStateByKey((prev) => {
      const next = new Map(prev)
      next.set(sourceKey, { presenting: true, presented: false, error: null })
      return next
    })

    const outcome = await createOpportunityStaffing({
      opportunity_id: opportunityId,
      source_type: profile.sourceType,
      source_id: profile.sourceId,
      positioning_origin: "Matching IA",
      initial_status: "identifie",
    })

    setPresentStateByKey((prev) => {
      const next = new Map(prev)
      next.set(sourceKey, outcome.error
        ? { presenting: false, presented: false, error: outcome.error }
        : { presenting: false, presented: true, error: null })
      return next
    })

    if (!outcome.error) onStaffed?.()
  }

  return {
    phase,
    result,
    errorMessage,
    selectedSourceKey,
    setSelectedSourceKey,
    presentStateByKey,
    run,
    present,
  }
}
