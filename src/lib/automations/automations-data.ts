import { createClient } from "@/lib/supabase/server"
import {
  VEILLE_RUNS_PER_MONTH,
  type VeilleCadence,
  type VeilleSimulatorBaseline,
} from "./veille-cadence"

// ─────────────────────────────────────────────────────────────────────────────
//  Automatisations — couche données (Monitoring IA, Lots 1-2)
//  Lit exclusivement les vues Lot 0 (v_workflow_health, v_ai_run_costs,
//  v_workflow_cost_stats, v_ai_cost_timeline) — aucun coût/santé recalculé
//  ici, tout vient de la base. Un seul passage de fetch pour toute la page
//  (onglets Santé + Coûts) : le changement d'onglet est un simple état client,
//  pas un refetch serveur.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowHealthRow = {
  runType: string
  label: string
  runs30d: number
  succeeded30d: number
  failed30d: number
  successRatePct30d: number | null
  stuckRunningNow: number
  stuckQueuedNow: number
  lastRunAt: string | null
  lastFailureAt: string | null
  p50DurationMs: number | null
  p95DurationMs: number | null
  avgCost30d: number | null
  totalCost30d: number | null
  hasPricingGap: boolean
  hasTokensGap: boolean
}

export type RunJournalRow = {
  id: string
  runType: string
  runTypeLabel: string
  status: string
  triggerSource: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  errorMessage: string | null
  companyId: string | null
  companyName: string | null
  primaryEntityType: string | null
  primaryEntityId: string | null
  ownerName: string | null
  durationMs: number | null
  costEstimate: number | null
  hasPricingGap: boolean
  hasTokensGap: boolean
  config: Record<string, unknown> | null
  inputSnapshot: Record<string, unknown> | null
}

export type AutomationsKpis = {
  runs30d: number
  successRatePct30d: number | null
  stuckNow: number
  reapedLast7d: number
}

export type CostTimelinePoint = {
  day: string
  costEstimate: number | null
  runs: number
}

export type CostByOwner = {
  ownerName: string
  costEstimate: number
  runs: number
}

export type AutomationsCostKpis = {
  costToday: number | null
  cost7d: number | null
  cost30d: number | null
  cost30dDeltaPct: number | null
  costAllTime: number | null
  dataSince: string | null
}

export type AutomationsCostData = {
  kpis: AutomationsCostKpis
  timeline: CostTimelinePoint[]
  byOwner: CostByOwner[]
  veilleSimulator: VeilleSimulatorBaseline
}

export type AutomationsDashboardData = {
  kpis: AutomationsKpis
  workflows: WorkflowHealthRow[]
  journal: RunJournalRow[]
  costs: AutomationsCostData
}

// Libellés lisibles par run_type. Volontairement permissif : un run_type
// inconnu retombe sur sa valeur brute plutôt que de faire planter le rendu —
// ce référentiel est amené à évoluer (nouveaux workflows) sans qu'un oubli
// ici ne casse la page.
const WORKFLOW_LABELS: Record<string, string> = {
  "intel-010-refresh": "Scan rapide compte",
  "intel-020-communication": "Rédaction (pitch / mail)",
  "intel-020-pitch-mail": "Rédaction (legacy)",
  "intel-030-account-knowledge": "Connaissance compte",
  "intel-031-issues-map": "Cartographie des enjeux",
  "intel-032-strategy": "Stratégie commerciale",
  account_watch_refresh: "Veille de compte",
  "report-account-summary": "Synthèse de compte",
  "report-activity-commercial": "Rapport activité commerciale",
  "report-activity-recruitment": "Rapport activité recrutement",
  "report-weekly-manager": "Brief hebdomadaire manager",
  process_diagnostic: "Diagnostic process (import)",
  process_diagnostic_import: "Diagnostic process (import)",
  full_prospection_analysis: "Analyse prospection (legacy)",
  activity_commercial: "Rapport activité commerciale (legacy)",
  activity_recruitment: "Rapport activité recrutement (legacy)",
}

function labelForRunType(runType: string): string {
  return WORKFLOW_LABELS[runType] ?? runType
}

type CompanyEmbed = { name: string | null } | { name: string | null }[] | null
type OwnerEmbed = { full_name: string | null } | { full_name: string | null }[] | null

function firstOf<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getAutomationsDashboardData(): Promise<AutomationsDashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Requêtes indépendantes en parallèle (pas de cascade) : santé par workflow,
  // stats de coût par workflow, journal des runs récents, compteur de runs
  // repris par le reaper, timeline de coût complète, réglages de veille actifs.
  const [healthRes, costStatsRes, journalRunsRes, reapedRes, timelineRes, watchSettingsRes] = await Promise.all([
    supabase.from("v_workflow_health").select("*"),
    supabase.from("v_workflow_cost_stats").select("run_type, avg_cost_30d, total_cost_30d, has_pricing_gap, has_tokens_gap, avg_cost_all_time"),
    supabase
      .from("ai_intelligence_runs")
      .select(
        "id, run_type, status, trigger_source, error_message, created_at, started_at, completed_at, failed_at, company_id, primary_entity_type, primary_entity_id, config, input_snapshot, company:companies(name), owner:profiles(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("notification_type", "ai_run_reaped")
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("v_ai_cost_timeline")
      .select("day, owner_id, cost_estimate, runs"),
    supabase
      .from("account_watch_settings")
      .select("cadence")
      .eq("is_enabled", true),
  ])

  const runRows = journalRunsRes.data ?? []
  const runIds = runRows.map((r) => r.id)

  // Dépend des IDs retournés ci-dessus — ne peut pas être parallélisée avec
  // le lot précédent, mais reste une seule requête ciblée (pas de N+1 par run).
  const costsRes =
    runIds.length > 0
      ? await supabase
          .from("v_ai_run_costs")
          .select("run_id, duration_ms, cost_estimate, has_pricing_gap, has_tokens_gap")
          .in("run_id", runIds)
      : { data: [] as { run_id: string; duration_ms: number | null; cost_estimate: number | null; has_pricing_gap: boolean | null; has_tokens_gap: boolean | null }[] }

  const costsByRunId = new Map((costsRes.data ?? []).map((c) => [c.run_id, c]))

  const journal: RunJournalRow[] = runRows.map((r) => {
    const cost = costsByRunId.get(r.id)
    const company = firstOf(r.company as CompanyEmbed)
    const owner = firstOf(r.owner as OwnerEmbed)

    return {
      id: r.id,
      runType: r.run_type,
      runTypeLabel: labelForRunType(r.run_type),
      status: r.status,
      triggerSource: r.trigger_source,
      createdAt: r.created_at,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      failedAt: r.failed_at,
      errorMessage: r.error_message,
      companyId: r.company_id,
      companyName: company?.name ?? null,
      primaryEntityType: r.primary_entity_type,
      primaryEntityId: r.primary_entity_id,
      ownerName: owner?.full_name ?? null,
      durationMs: cost?.duration_ms ?? null,
      costEstimate: cost?.cost_estimate ?? null,
      hasPricingGap: cost?.has_pricing_gap ?? false,
      hasTokensGap: cost?.has_tokens_gap ?? false,
      config: (r.config as Record<string, unknown>) ?? null,
      inputSnapshot: (r.input_snapshot as Record<string, unknown>) ?? null,
    }
  })

  const workflows: WorkflowHealthRow[] = (healthRes.data ?? [])
    .map((h) => ({
      runType: h.run_type as string,
      label: labelForRunType(h.run_type as string),
      runs30d: h.runs_30d ?? 0,
      succeeded30d: h.succeeded_30d ?? 0,
      failed30d: h.failed_30d ?? 0,
      successRatePct30d: h.success_rate_pct_30d,
      stuckRunningNow: h.stuck_running_now ?? 0,
      stuckQueuedNow: h.stuck_queued_now ?? 0,
      lastRunAt: h.last_run_at,
      lastFailureAt: h.last_failure_at,
      p50DurationMs: h.p50_duration_ms,
      p95DurationMs: h.p95_duration_ms,
      avgCost30d: null as number | null,
      totalCost30d: null as number | null,
      hasPricingGap: false,
      hasTokensGap: false,
    }))
    .sort(
      (a, b) =>
        b.failed30d + b.stuckRunningNow + b.stuckQueuedNow - (a.failed30d + a.stuckRunningNow + a.stuckQueuedNow)
    )

  const costStatsByRunType = new Map((costStatsRes.data ?? []).map((c) => [c.run_type, c]))
  for (const workflow of workflows) {
    const stats = costStatsByRunType.get(workflow.runType)
    if (stats) {
      workflow.avgCost30d = stats.avg_cost_30d
      workflow.totalCost30d = stats.total_cost_30d
      workflow.hasPricingGap = stats.has_pricing_gap ?? false
      workflow.hasTokensGap = stats.has_tokens_gap ?? false
    }
  }

  const totalRuns30d = workflows.reduce((sum, w) => sum + w.runs30d, 0)
  const totalSucceeded30d = workflows.reduce((sum, w) => sum + w.succeeded30d, 0)
  const totalFailed30d = workflows.reduce((sum, w) => sum + w.failed30d, 0)
  const totalStuckNow = workflows.reduce((sum, w) => sum + w.stuckRunningNow + w.stuckQueuedNow, 0)
  const totalDecided = totalSucceeded30d + totalFailed30d

  // ── Onglet Coûts ──────────────────────────────────────────────────────────
  // Pas d'embed PostgREST possible ici : v_ai_cost_timeline est une vue, sans
  // métadonnée de FK vers profiles — résolution des noms via une requête
  // séparée par lot d'IDs (pas de N+1).
  const timelineRows = timelineRes.data ?? []
  const ownerIds = [...new Set(timelineRows.map((r) => r.owner_id).filter((id): id is string => Boolean(id)))]
  const ownerNamesRes =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] as { id: string; full_name: string | null }[] }
  const ownerNameById = new Map((ownerNamesRes.data ?? []).map((p) => [p.id, p.full_name]))

  const todayIso = isoDate(now)
  const sevenDaysAgoIso = isoDate(sevenDaysAgo)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoIso = isoDate(thirtyDaysAgo)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgoIso = isoDate(sixtyDaysAgo)

  const byDay = new Map<string, { costEstimate: number | null; runs: number; hasCost: boolean }>()
  const byOwnerMap = new Map<string, { name: string; costEstimate: number; runs: number }>()
  let cost30d = 0
  let hasCost30d = false
  let costPrev30d = 0
  let hasCostPrev30d = false
  let costAllTime = 0
  let hasCostAllTime = false
  let cost7d = 0
  let hasCost7d = false
  let costToday = 0
  let hasCostToday = false
  let earliestDay: string | null = null

  for (const row of timelineRows) {
    if (!row.day) continue // day dérivé de created_at::date, non-null en pratique
    if (earliestDay === null || row.day < earliestDay) earliestDay = row.day

    const existingDay = byDay.get(row.day) ?? { costEstimate: null, runs: 0, hasCost: false }
    existingDay.runs += row.runs ?? 0
    if (row.cost_estimate !== null) {
      existingDay.costEstimate = (existingDay.costEstimate ?? 0) + row.cost_estimate
      existingDay.hasCost = true
    }
    byDay.set(row.day, existingDay)

    const ownerName = (row.owner_id ? ownerNameById.get(row.owner_id) : null) ?? "Système / cron"
    const existingOwner = byOwnerMap.get(ownerName) ?? { name: ownerName, costEstimate: 0, runs: 0 }
    existingOwner.runs += row.runs ?? 0
    if (row.cost_estimate !== null) existingOwner.costEstimate += row.cost_estimate
    byOwnerMap.set(ownerName, existingOwner)

    if (row.cost_estimate !== null) {
      costAllTime += row.cost_estimate
      hasCostAllTime = true

      if (row.day === todayIso) {
        costToday += row.cost_estimate
        hasCostToday = true
      }
      if (row.day >= sevenDaysAgoIso) {
        cost7d += row.cost_estimate
        hasCost7d = true
      }
      if (row.day >= thirtyDaysAgoIso) {
        cost30d += row.cost_estimate
        hasCost30d = true
      } else if (row.day >= sixtyDaysAgoIso) {
        costPrev30d += row.cost_estimate
        hasCostPrev30d = true
      }
    }
  }

  const timeline: CostTimelinePoint[] = [...byDay.entries()]
    .filter(([day]) => day >= sixtyDaysAgoIso)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, costEstimate: v.hasCost ? v.costEstimate : null, runs: v.runs }))

  const byOwner: CostByOwner[] = [...byOwnerMap.values()]
    .map((o) => ({ ownerName: o.name, costEstimate: o.costEstimate, runs: o.runs }))
    .sort((a, b) => b.costEstimate - a.costEstimate)

  // Delta 30j vs les 30j précédents — seulement si les deux fenêtres ont des
  // données réelles (sinon un delta serait fabriqué à partir d'une fenêtre vide,
  // trompeur plutôt qu'informatif).
  const cost30dDeltaPct =
    hasCost30d && hasCostPrev30d && costPrev30d > 0
      ? Math.round(((cost30d - costPrev30d) / costPrev30d) * 1000) / 10
      : null

  // ── Simulateur de cadence de veille ────────────────────────────────────────
  const veilleStats = costStatsByRunType.get("account_watch_refresh")
  const avgCostPerRun = veilleStats?.avg_cost_all_time ?? null
  const cadenceCounts = new Map<string, number>()
  for (const row of watchSettingsRes.data ?? []) {
    const cadence = row.cadence ?? "weekly"
    cadenceCounts.set(cadence, (cadenceCounts.get(cadence) ?? 0) + 1)
  }
  const cadenceBreakdown = [...cadenceCounts.entries()].map(([cadence, count]) => ({ cadence, count }))
  const watchedAccountsCount = watchSettingsRes.data?.length ?? 0

  const currentMonthlyCostEstimate =
    avgCostPerRun !== null
      ? cadenceBreakdown.reduce((sum, c) => {
          const runsPerMonth = VEILLE_RUNS_PER_MONTH[c.cadence as VeilleCadence] ?? VEILLE_RUNS_PER_MONTH.weekly
          return sum + c.count * runsPerMonth * avgCostPerRun
        }, 0)
      : null

  return {
    kpis: {
      runs30d: totalRuns30d,
      successRatePct30d: totalDecided > 0 ? Math.round((totalSucceeded30d / totalDecided) * 1000) / 10 : null,
      stuckNow: totalStuckNow,
      reapedLast7d: reapedRes.count ?? 0,
    },
    workflows,
    journal,
    costs: {
      kpis: {
        costToday: hasCostToday ? costToday : null,
        cost7d: hasCost7d ? cost7d : null,
        cost30d: hasCost30d ? cost30d : null,
        cost30dDeltaPct,
        costAllTime: hasCostAllTime ? costAllTime : null,
        dataSince: earliestDay,
      },
      timeline,
      byOwner,
      veilleSimulator: {
        avgCostPerRun,
        watchedAccountsCount,
        cadenceBreakdown,
        currentMonthlyCostEstimate,
      },
    },
  }
}
