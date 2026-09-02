"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isLegacyWorkflow, workflowLabelForRunType } from "@/lib/automations/workflow-labels"
import {
  buildAutomationCosts,
  buildAutomationErrors,
  buildAutomationFixes,
  type AutomationCostsRulesResult,
  type AutomationErrorsRulesResult,
  type AutomationFailedRunRow,
  type AutomationFixesRulesResult,
  type AutomationWorkflowRow,
} from "./automation-intelligence-rules"

// ─────────────────────────────────────────────────────────────────────────────
//  Corpus unique des trois actions Automatisations.
//
//  Lit les MÊMES vues que la page /automations (`v_workflow_health`,
//  `v_workflow_cost_stats`) : santé et coûts restent calculés en base, jamais
//  ici. Les runs en échec sont lus séparément, et non depuis le journal de la
//  page — celui-ci est plafonné aux N runs les plus récents, tous statuts
//  confondus, ce qui ferait disparaître des échecs anciens du regroupement.
// ─────────────────────────────────────────────────────────────────────────────

export type AutomationErrorsResult = AutomationErrorsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

export type AutomationCostsResult = AutomationCostsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

export type AutomationFixesResult = AutomationFixesRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type HealthRow = {
  run_type: string
  runs_30d: number | null
  succeeded_30d: number | null
  failed_30d: number | null
  success_rate_pct_30d: number | null
  stuck_running_now: number | null
  stuck_queued_now: number | null
  last_run_at: string | null
  last_failure_at: string | null
  p95_duration_ms: number | null
}

type CostStatRow = {
  run_type: string
  avg_cost_30d: number | null
  total_cost_30d: number | null
  avg_cost_all_time: number | null
  has_pricing_gap: boolean | null
  has_tokens_gap: boolean | null
}

type FailedRunRow = {
  id: string
  run_type: string
  error_message: string | null
  failed_at: string | null
}

type Corpus = {
  workflows: AutomationWorkflowRow[]
  failedRuns: AutomationFailedRunRow[]
  sourceIssues: string[]
}

async function collectAutomationCorpus(): Promise<Corpus> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { workflows: [], failedRuns: [], sourceIssues: ["Non authentifié."] }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [healthRes, costRes, failedRes] = await Promise.all([
    supabase
      .from("v_workflow_health")
      .select("run_type,runs_30d,succeeded_30d,failed_30d,success_rate_pct_30d,stuck_running_now,stuck_queued_now,last_run_at,last_failure_at,p95_duration_ms")
      .returns<HealthRow[]>(),
    supabase
      .from("v_workflow_cost_stats")
      .select("run_type,avg_cost_30d,total_cost_30d,avg_cost_all_time,has_pricing_gap,has_tokens_gap")
      .returns<CostStatRow[]>(),
    supabase
      .from("ai_intelligence_runs")
      .select("id,run_type,error_message,failed_at")
      .eq("status", "failed")
      .gte("created_at", thirtyDaysAgo)
      .order("failed_at", { ascending: false })
      .limit(500)
      .returns<FailedRunRow[]>(),
  ])

  const sourceIssues = [
    healthRes.error ? `Santé des workflows: ${healthRes.error.message}` : null,
    costRes.error ? `Coûts par workflow: ${costRes.error.message}` : null,
    failedRes.error ? `Runs en échec: ${failedRes.error.message}` : null,
  ].filter((issue): issue is string => Boolean(issue))

  const costByRunType = new Map((costRes.data ?? []).map((row) => [row.run_type, row]))

  const workflows = (healthRes.data ?? [])
    .filter((row) => !isLegacyWorkflow(row.run_type))
    .map<AutomationWorkflowRow>((row) => {
      const cost = costByRunType.get(row.run_type)
      return {
        runType: row.run_type,
        label: workflowLabelForRunType(row.run_type),
        runs30d: row.runs_30d ?? 0,
        succeeded30d: row.succeeded_30d ?? 0,
        failed30d: row.failed_30d ?? 0,
        successRatePct30d: row.success_rate_pct_30d,
        stuckRunningNow: row.stuck_running_now ?? 0,
        stuckQueuedNow: row.stuck_queued_now ?? 0,
        lastRunAt: row.last_run_at,
        lastFailureAt: row.last_failure_at,
        p95DurationMs: row.p95_duration_ms,
        totalCost30d: cost?.total_cost_30d ?? null,
        avgCost30d: cost?.avg_cost_30d ?? null,
        avgCostAllTime: cost?.avg_cost_all_time ?? null,
        hasPricingGap: Boolean(cost?.has_pricing_gap),
        hasTokensGap: Boolean(cost?.has_tokens_gap),
      }
    })

  const failedRuns = (failedRes.data ?? [])
    .filter((row) => !isLegacyWorkflow(row.run_type))
    .map<AutomationFailedRunRow>((row) => ({
      id: row.id,
      runType: row.run_type,
      errorMessage: row.error_message,
      failedAt: row.failed_at,
    }))

  return { workflows, failedRuns, sourceIssues }
}

export async function getAutomationErrors(): Promise<AutomationErrorsResult> {
  const generatedAt = new Date().toISOString()
  const corpus = await collectAutomationCorpus()

  return {
    generatedAt,
    ...buildAutomationErrors({ workflows: corpus.workflows, failedRuns: corpus.failedRuns }),
    sourceIssues: corpus.sourceIssues,
  }
}

export async function getAutomationCosts(): Promise<AutomationCostsResult> {
  const generatedAt = new Date().toISOString()
  const corpus = await collectAutomationCorpus()

  return {
    generatedAt,
    ...buildAutomationCosts({ workflows: corpus.workflows }),
    sourceIssues: corpus.sourceIssues,
  }
}

export async function getAutomationFixes(): Promise<AutomationFixesResult> {
  const generatedAt = new Date().toISOString()
  const corpus = await collectAutomationCorpus()

  return {
    generatedAt,
    ...buildAutomationFixes({ now: generatedAt, workflows: corpus.workflows }),
    sourceIssues: corpus.sourceIssues,
  }
}
