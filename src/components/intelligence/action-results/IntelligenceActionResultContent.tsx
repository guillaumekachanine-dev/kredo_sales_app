"use client"

import { useEffect, useState, useTransition } from "react"
import { getActionPriorities, type ActionPrioritiesResult as ActionPrioritiesResultData } from "@/lib/intelligence/actions/action-priorities"
import { getPrepareDay, type PrepareDayResult as PrepareDayResultData } from "@/lib/intelligence/actions/prepare-day"
import { getDetectRisks, type DetectRisksResult as DetectRisksResultData } from "@/lib/intelligence/actions/detect-risks"
import { getAnalyzeActivity, type AnalyzeActivityResult as AnalyzeActivityResultData } from "@/lib/intelligence/actions/analyze-activity"
import { getPipelineInsights, type PipelineInsightsResult as PipelineInsightsResultData } from "@/lib/intelligence/actions/pipeline-insights"
import { getForecastRevenue, type ForecastRevenueResult as ForecastRevenueResultData } from "@/lib/intelligence/actions/forecast-revenue"
import { getPrioritizePipeline, type PrioritizePipelineResult as PrioritizePipelineResultData } from "@/lib/intelligence/actions/prioritize-pipeline"
import { getAnalyzeNeeds, type AnalyzeNeedsResult as AnalyzeNeedsResultData } from "@/lib/intelligence/actions/analyze-needs"
import { getScanContacts, type ScanContactsResult as ScanContactsResultData } from "@/lib/intelligence/actions/scan-contacts"
import { getAnalyzeFunnel, type AnalyzeFunnelResult as AnalyzeFunnelResultData } from "@/lib/intelligence/actions/analyze-funnel"
import { getAnalyzeMargins, type AnalyzeMarginsResult as AnalyzeMarginsResultData } from "@/lib/intelligence/actions/analyze-margins"
import { ActionPrioritiesResult } from "./ActionPrioritiesResult"
import { PrepareDayResult } from "./PrepareDayResult"
import { DetectRisksResult } from "./DetectRisksResult"
import { AnalyzeActivityResult } from "./AnalyzeActivityResult"
import { PipelineInsightsResult } from "./PipelineInsightsResult"
import { ForecastRevenueResult } from "./ForecastRevenueResult"
import { PrioritizePipelineResult } from "./PrioritizePipelineResult"
import { AnalyzeNeedsResult } from "./AnalyzeNeedsResult"
import { ScanContactsResult } from "./ScanContactsResult"
import { AnalyzeFunnelResult } from "./AnalyzeFunnelResult"
import { AnalyzeMarginsResult } from "./AnalyzeMarginsResult"
import { CockpitBrightHeader, CockpitBrightSection } from "../CockpitBrightSection"

export const DETERMINISTIC_INTELLIGENCE_ACTION_IDS = [
  "action_priorities",
  "prepare_day",
  "detect_risks",
  "analyze_activity",
  "pipeline_insights",
  "forecast_revenue",
  "prioritize_pipeline",
  "analyze_needs",
  "scan_contacts",
  "analyze_funnel",
  "analyze_margins",
] as const

export type DeterministicIntelligenceActionId = typeof DETERMINISTIC_INTELLIGENCE_ACTION_IDS[number]

type LoadedResult =
  | { id: "action_priorities"; data: ActionPrioritiesResultData }
  | { id: "prepare_day"; data: PrepareDayResultData }
  | { id: "detect_risks"; data: DetectRisksResultData }
  | { id: "analyze_activity"; data: AnalyzeActivityResultData }
  | { id: "pipeline_insights"; data: PipelineInsightsResultData }
  | { id: "forecast_revenue"; data: ForecastRevenueResultData }
  | { id: "prioritize_pipeline"; data: PrioritizePipelineResultData }
  | { id: "analyze_needs"; data: AnalyzeNeedsResultData }
  | { id: "scan_contacts"; data: ScanContactsResultData }
  | { id: "analyze_funnel"; data: AnalyzeFunnelResultData }
  | { id: "analyze_margins"; data: AnalyzeMarginsResultData }

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
    case "pipeline_insights":
      return "Insights pipeline"
    case "forecast_revenue":
      return "Prévision de CA"
    case "prioritize_pipeline":
      return "Prioriser le pipeline"
    case "analyze_needs":
      return "Analyse des besoins"
    case "scan_contacts":
      return "Scan contacts"
    case "analyze_funnel":
      return "Analyse du funnel"
    case "analyze_margins":
      return "Analyse des marges"
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
    case "pipeline_insights":
      return { id, data: await getPipelineInsights() }
    case "forecast_revenue":
      return { id, data: await getForecastRevenue() }
    case "prioritize_pipeline":
      return { id, data: await getPrioritizePipeline() }
    case "analyze_needs":
      return { id, data: await getAnalyzeNeeds() }
    case "scan_contacts":
      return { id, data: await getScanContacts() }
    case "analyze_funnel":
      return { id, data: await getAnalyzeFunnel() }
    case "analyze_margins":
      return { id, data: await getAnalyzeMargins() }
  }
}

export function IntelligenceActionResultContent({
  actionId,
  onBack,
}: {
  actionId: DeterministicIntelligenceActionId
  onBack?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState<LoadedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    startTransition(() => {
      setLoaded(null)
      setError(null)
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

  if (actionId === "forecast_revenue" || actionId === "action_priorities") {
    const isBrightPilotLoaded = actionId === "forecast_revenue"
      ? loaded?.id === "forecast_revenue"
      : loaded?.id === "action_priorities"

    return (
      <CockpitBrightSection>
        <CockpitBrightHeader
          title={titleForAction(actionId)}
          kicker={["Processus", "déterministe"]}
          onBack={onBack}
        />

        {(isPending || (!isBrightPilotLoaded && !error)) && (
          <div className="flex items-center gap-3 border-b border-edito-border px-5 py-6 text-xs font-semibold text-edito-muted animate-pulse">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
            <span>Calcul en cours...</span>
          </div>
        )}

        {error && (
          <div className="border-b border-danger/35 px-5 py-5 text-xs font-semibold leading-relaxed text-edito-body">
            {error}
          </div>
        )}

        {loaded?.id === "forecast_revenue" && <ForecastRevenueResult result={loaded.data} />}
        {loaded?.id === "action_priorities" && <ActionPrioritiesResult result={loaded.data} />}
      </CockpitBrightSection>
    )
  }

  return (
    <div data-theme="cockpit" className="rounded-2xl border border-white/15 bg-[#0c1838] p-4.5 text-white shadow-xl space-y-4">
      <div className="border-b border-white/12 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-brass">Processus déterministe</p>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="group -ml-1 mt-1 inline-flex min-h-[2.5rem] items-center gap-2 rounded p-1 text-left text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-amber cursor-pointer"
            aria-label={`Retour depuis ${titleForAction(actionId)}`}
          >
            <svg
              className="size-3 shrink-0 fill-white"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M16 19.5V4.5L5 12z" />
            </svg>
            <h3 className="font-heading text-lg font-bold leading-tight text-white">{titleForAction(actionId)}</h3>
          </button>
        ) : (
          <h3 className="mt-1 font-heading text-lg font-bold leading-tight text-white">{titleForAction(actionId)}</h3>
        )}
      </div>

      {(isPending || (!loaded && !error)) && (
        <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.05] p-4 text-xs font-medium text-white/75 animate-pulse">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-brass border-t-transparent" />
          <span>Calcul en cours...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/35 bg-danger/15 p-4 text-xs font-semibold text-white/90">
          {error}
        </div>
      )}

      {loaded?.id === "action_priorities" && <ActionPrioritiesResult result={loaded.data} />}
      {loaded?.id === "prepare_day" && <PrepareDayResult result={loaded.data} />}
      {loaded?.id === "detect_risks" && <DetectRisksResult result={loaded.data} />}
      {loaded?.id === "analyze_activity" && <AnalyzeActivityResult result={loaded.data} />}
      {loaded?.id === "pipeline_insights" && <PipelineInsightsResult result={loaded.data} />}
      {loaded?.id === "forecast_revenue" && <ForecastRevenueResult result={loaded.data} />}
      {loaded?.id === "prioritize_pipeline" && <PrioritizePipelineResult result={loaded.data} />}
      {loaded?.id === "analyze_needs" && <AnalyzeNeedsResult result={loaded.data} />}
      {loaded?.id === "scan_contacts" && <ScanContactsResult result={loaded.data} />}
      {loaded?.id === "analyze_funnel" && <AnalyzeFunnelResult result={loaded.data} />}
      {loaded?.id === "analyze_margins" && <AnalyzeMarginsResult result={loaded.data} />}
    </div>
  )
}
