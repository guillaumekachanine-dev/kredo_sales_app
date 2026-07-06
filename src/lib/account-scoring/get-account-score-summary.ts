import { createClient } from "@/lib/supabase/server"
import type { ScoreBand } from "./types"

export interface AccountScoreComponentView {
  componentKey: string
  componentLabel: string
  normalizedScore: number
  weight: number
  lifecycleMultiplier: number
  weightedContribution: number
  confidence: number
  freshnessStatus: string
  explanation: string
}

export interface AccountScoreSummaryView {
  runId: string
  scoreValue: number
  scoreBand: ScoreBand
  confidenceScore: number
  lifecycleContext: string
  calculatedAt: string
  components: AccountScoreComponentView[]
  summary: {
    topPositiveDrivers: string[]
    topNegativeDrivers: string[]
    caveats: string[]
  }
}

type CurrentRunRow = {
  run_id: string
  score_value: number | string
  score_band: string
  confidence_score: number | string
  lifecycle_context: string
  calculated_at: string
  summary: unknown
}

type ComponentRow = {
  component_key: string
  component_label: string
  normalized_score: number | string
  weight: number | string
  lifecycle_multiplier: number | string
  weighted_contribution: number | string
  confidence: number | string
  freshness_status: string
  explanation: string
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value)
}

function asSummary(raw: unknown): AccountScoreSummaryView["summary"] {
  if (!raw || typeof raw !== "object") return { topPositiveDrivers: [], topNegativeDrivers: [], caveats: [] }
  const r = raw as Record<string, unknown>
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
  return {
    topPositiveDrivers: arr(r.topPositiveDrivers),
    topNegativeDrivers: arr(r.topNegativeDrivers),
    caveats: arr(r.caveats),
  }
}

// ADR-0011 Lot 4 — lit le dernier run via account_score_current (Lot 2) pour
// afficher le score dans le header cockpit sans recalcul. Le recalcul explicite
// passe par recomputeAccountScore() (Lot 3, Server Action côté client).
export async function getAccountScoreSummary(companyId: string): Promise<AccountScoreSummaryView | null> {
  const supabase = await createClient()

  const { data: run, error: runError } = await supabase
    .from("account_score_current")
    .select("run_id,score_value,score_band,confidence_score,lifecycle_context,calculated_at,summary")
    .eq("company_id", companyId)
    .maybeSingle<CurrentRunRow>()

  if (runError || !run) return null

  const { data: components } = await supabase
    .from("account_score_components")
    .select(
      "component_key,component_label,normalized_score,weight,lifecycle_multiplier,weighted_contribution,confidence,freshness_status,explanation",
    )
    .eq("score_run_id", run.run_id)
    .order("weighted_contribution", { ascending: false })
    .returns<ComponentRow[]>()

  return {
    runId: run.run_id,
    scoreValue: toNumber(run.score_value),
    scoreBand: run.score_band as ScoreBand,
    confidenceScore: toNumber(run.confidence_score),
    lifecycleContext: run.lifecycle_context,
    calculatedAt: run.calculated_at,
    components: (components ?? []).map((c) => ({
      componentKey: c.component_key,
      componentLabel: c.component_label,
      normalizedScore: toNumber(c.normalized_score),
      weight: toNumber(c.weight),
      lifecycleMultiplier: toNumber(c.lifecycle_multiplier),
      weightedContribution: toNumber(c.weighted_contribution),
      confidence: toNumber(c.confidence),
      freshnessStatus: c.freshness_status,
      explanation: c.explanation,
    })),
    summary: asSummary(run.summary),
  }
}
