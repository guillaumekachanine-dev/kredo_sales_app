"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isLegacyWorkflow, workflowLabelForRunType } from "./workflow-labels"
import type {
  CadenceSimulatorLoadResult,
  CadenceSimulatorWorkflow,
} from "./veille-cadence"

const WEEKLY_WATCH_RUN_TYPES = new Set([
  "veille-hebdomadaire-kredo",
  "global-watch",
  "global_watch",
  "KREDO — Veille Hebdomadaire IA & Marché",
])

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchCadenceSimulatorWorkflows(): Promise<CadenceSimulatorLoadResult> {
  const supabase = await createClient()
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const [healthRes, costStatsRes, veilleDigestsRes] = await Promise.all([
    supabase
      .from("v_workflow_health")
      .select("run_type, runs_30d"),
    supabase
      .from("v_workflow_cost_stats")
      .select("run_type, avg_cost_30d, total_cost_30d, has_pricing_gap, has_tokens_gap"),
    supabase
      .from("veille_digests")
      .select("id, created_at, digest_date")
      .order("digest_date", { ascending: false })
      .limit(10),
  ])

  if (healthRes.error) {
    console.error("[cadence-simulator] santé workflows:", healthRes.error.message)
    return { ok: false, error: "Impossible de charger la liste des workflows actifs." }
  }

  if (costStatsRes.error) {
    console.error("[cadence-simulator] coûts workflows:", costStatsRes.error.message)
  }
  if (veilleDigestsRes.error) {
    console.error("[cadence-simulator] digests veille:", veilleDigestsRes.error.message)
  }

  const costByRunType = new Map(
    (costStatsRes.data ?? [])
      .filter((row) => Boolean(row.run_type))
      .map((row) => [row.run_type as string, row]),
  )

  const workflows: CadenceSimulatorWorkflow[] = (healthRes.data ?? [])
    .filter((row) => Boolean(row.run_type) && !isLegacyWorkflow(row.run_type))
    .map((row) => {
      const runType = row.run_type as string
      const cost = costByRunType.get(runType)
      return {
        runType,
        label: workflowLabelForRunType(runType),
        runs30d: row.runs_30d ?? 0,
        avgCost30d: numeric(cost?.avg_cost_30d),
        totalCost30d: numeric(cost?.total_cost_30d),
        hasPricingGap: cost?.has_pricing_gap ?? false,
        hasTokensGap: cost?.has_tokens_gap ?? false,
      }
    })

  const hasWeeklyWatch = workflows.some((workflow) => WEEKLY_WATCH_RUN_TYPES.has(workflow.runType))
  if (!hasWeeklyWatch) {
    const digests30d = (veilleDigestsRes.data ?? []).filter((digest) => {
      const dateValue = digest.created_at ?? digest.digest_date
      if (!dateValue) return false
      const timestamp = new Date(dateValue).getTime()
      return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo
    })

    workflows.push({
      runType: "veille-hebdomadaire-kredo",
      label: "Veille hebdomadaire IA & Marché",
      runs30d: digests30d.length,
      avgCost30d: null,
      totalCost30d: null,
      hasPricingGap: false,
      hasTokensGap: false,
    })
  }

  workflows.sort((a, b) => a.label.localeCompare(b.label, "fr") || a.runType.localeCompare(b.runType))

  return { ok: true, workflows }
}
