"use server"

import { createClient } from "@/lib/supabase/server"
import { buildAutomationMetricsSnapshot } from "./automation-metrics-model"
import type { AutomationMetricsFilters, AutomationMetricsRun } from "./automation-metrics-types"

function parseDate(value: string, label: string): Date {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} invalide`)
  return date
}

export async function loadAutomationMetricsSnapshot(filters: AutomationMetricsFilters) {
  const from = parseDate(filters.from, "Date de début")
  const to = parseDate(filters.to, "Date de fin")
  if (to <= from) throw new Error("La date de fin doit être postérieure à la date de début")

  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()))
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("v_ai_run_costs")
    .select("run_id, run_type, status, created_at, duration_ms, cost_estimate")
    .gte("created_at", previousFrom.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Impossible de charger les métriques : ${error.message}`)

  const runs: AutomationMetricsRun[] = (data ?? [])
    .filter((row) => row.run_id !== null && row.run_type !== null && row.created_at !== null && row.status !== null)
    .map((row) => ({
      id: row.run_id as string,
      runType: row.run_type as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      durationMs: row.duration_ms,
      costEstimate: row.cost_estimate,
    }))

  return buildAutomationMetricsSnapshot(runs, filters)
}
