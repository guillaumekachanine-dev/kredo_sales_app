"use server"

import { createClient } from "@/lib/supabase/server"
import { buildAutomationMetricsSnapshot } from "./automation-metrics-model"
import type { AutomationMetricsFilters, AutomationMetricsIncidentRun, AutomationMetricsRun } from "./automation-metrics-types"

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
  const [costsResult, incidentsResult] = await Promise.all([
    supabase
      .from("v_ai_run_costs")
      .select("run_id, run_type, status, created_at, duration_ms, cost_estimate")
      .gte("created_at", previousFrom.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("ai_intelligence_runs")
      .select("id, run_type, status, created_at, error_message")
      .eq("status", "failed")
      .gte("created_at", previousFrom.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: true }),
  ])

  if (costsResult.error) throw new Error(`Impossible de charger les métriques : ${costsResult.error.message}`)
  if (incidentsResult.error) throw new Error(`Impossible de charger les incidents : ${incidentsResult.error.message}`)

  const runs: AutomationMetricsRun[] = (costsResult.data ?? [])
    .filter((row) => row.run_id !== null && row.run_type !== null && row.created_at !== null && row.status !== null)
    .map((row) => ({
      id: row.run_id as string,
      runType: row.run_type as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      durationMs: row.duration_ms,
      costEstimate: row.cost_estimate,
    }))

  const incidents: AutomationMetricsIncidentRun[] = (incidentsResult.data ?? [])
    .filter((row) => row.id !== null && row.run_type !== null && row.created_at !== null)
    .map((row) => ({
      id: row.id,
      runType: row.run_type,
      createdAt: row.created_at,
      errorMessage: row.error_message,
    }))

  return buildAutomationMetricsSnapshot(runs, incidents, filters)
}
