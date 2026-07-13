"use client"

import { useEffect, useState, useTransition } from "react"
import { getActionPriorities, type ActionPrioritiesResult as ActionPrioritiesResultData } from "@/lib/intelligence/actions/action-priorities"
import { getPrepareDay, type PrepareDayResult as PrepareDayResultData } from "@/lib/intelligence/actions/prepare-day"
import { getDetectRisks, type DetectRisksResult as DetectRisksResultData } from "@/lib/intelligence/actions/detect-risks"
import { getAnalyzeActivity, type AnalyzeActivityResult as AnalyzeActivityResultData } from "@/lib/intelligence/actions/analyze-activity"
import { ActionPrioritiesResult } from "./ActionPrioritiesResult"
import { PrepareDayResult } from "./PrepareDayResult"
import { DetectRisksResult } from "./DetectRisksResult"
import { AnalyzeActivityResult } from "./AnalyzeActivityResult"

export const DETERMINISTIC_INTELLIGENCE_ACTION_IDS = [
  "action_priorities",
  "prepare_day",
  "detect_risks",
  "analyze_activity",
] as const

export type DeterministicIntelligenceActionId = typeof DETERMINISTIC_INTELLIGENCE_ACTION_IDS[number]

type LoadedResult =
  | { id: "action_priorities"; data: ActionPrioritiesResultData }
  | { id: "prepare_day"; data: PrepareDayResultData }
  | { id: "detect_risks"; data: DetectRisksResultData }
  | { id: "analyze_activity"; data: AnalyzeActivityResultData }

export function isDeterministicIntelligenceAction(id: string): id is DeterministicIntelligenceActionId {
  return DETERMINISTIC_INTELLIGENCE_ACTION_IDS.includes(id as DeterministicIntelligenceActionId)
}

function titleForAction(id: DeterministicIntelligenceActionId) {
  switch (id) {
    case "action_priorities":
      return "Priorités d'action"
    case "prepare_day":
      return "Préparer la journée"
    case "detect_risks":
      return "Détection de risques"
    case "analyze_activity":
      return "Analyse & recommandations"
  }
}

async function loadAction(id: DeterministicIntelligenceActionId): Promise<LoadedResult> {
  switch (id) {
    case "action_priorities":
      return { id, data: await getActionPriorities() }
    case "prepare_day":
      return { id, data: await getPrepareDay() }
    case "detect_risks":
      return { id, data: await getDetectRisks() }
    case "analyze_activity":
      return { id, data: await getAnalyzeActivity() }
  }
}

export function IntelligenceActionResultContent({ actionId }: { actionId: DeterministicIntelligenceActionId }) {
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState<LoadedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoaded(null)
    setError(null)
    startTransition(() => {
      void loadAction(actionId)
        .then((result) => {
          if (!cancelled) setLoaded(result)
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Action impossible à charger.")
        })
    })
    return () => { cancelled = true }
  }, [actionId])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-brass">Résultat déterministe</p>
        <h3 className="mt-1 text-base font-bold leading-tight text-primary-fg">{titleForAction(actionId)}</h3>
      </div>

      {(isPending || (!loaded && !error)) && (
        <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-4 text-xs text-primary-fg/60">
          Calcul en cours...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-xs text-primary-fg/75">
          {error}
        </div>
      )}

      {loaded?.id === "action_priorities" && <ActionPrioritiesResult result={loaded.data} />}
      {loaded?.id === "prepare_day" && <PrepareDayResult result={loaded.data} />}
      {loaded?.id === "detect_risks" && <DetectRisksResult result={loaded.data} />}
      {loaded?.id === "analyze_activity" && <AnalyzeActivityResult result={loaded.data} />}
    </div>
  )
}
