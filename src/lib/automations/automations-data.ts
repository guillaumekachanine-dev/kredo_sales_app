import "server-only"

import { createClient } from "@/lib/supabase/server"
import { JOURNAL_LIMIT } from "./run-journal-merge"
import {
  VEILLE_RUNS_PER_MONTH,
  type VeilleCadence,
  type VeilleSimulatorBaseline,
} from "./veille-cadence"
import { isLegacyWorkflow, workflowLabelForRunType } from "./workflow-labels"

// ─────────────────────────────────────────────────────────────────────────────
//  Automatisations — couche données (Monitoring IA, Lots 1-2)
//  Lit exclusivement les vues Lot 0 (v_workflow_health, v_ai_run_costs,
//  v_workflow_cost_stats, v_ai_cost_timeline) — aucun coût/santé recalculé
//  ici, tout vient de la base. Un seul passage de fetch pour toute la page
//  (onglets Santé + Coûts) : le changement d'onglet est un simple état client,
//  pas un refetch serveur.
//
//  Le journal d'exécution est aussi rechargé à chaud, run par run, depuis
//  `getRunJournalRowsByIds()` (Server Action `fetchRunJournalRows`) quand
//  Realtime signale un changement — d'où l'extraction de `JOURNAL_SELECT` et
//  de `mapRunJournalRows()` : une seule et même projection pour le chargement
//  initial et pour l'hydratation live, jamais deux implémentations à faire
//  diverger.
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
  ownerEmail: string | null
  durationMs: number | null
  costEstimate: number | null
  hasPricingGap: boolean
  hasTokensGap: boolean
  config: Record<string, unknown> | null
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

// Une requête tombée ne doit plus disparaître en silence : c'est exactement ce
// qui a laissé le journal d'exécution vide pendant deux mois (embed
// `owner:profiles(...)` impossible faute de clé étrangère → PGRST200 → `.data`
// null → `?? []`). Chaque échec est désormais remonté jusqu'à l'écran.
export type AutomationsDataError = {
  source: string
  message: string
}

export type AutomationsDashboardData = {
  kpis: AutomationsKpis
  workflows: WorkflowHealthRow[]
  journal: RunJournalRow[]
  costs: AutomationsCostData
  dataErrors: AutomationsDataError[]
  fetchedAt: string
}

type CompanyEmbed = { name: string | null } | { name: string | null }[] | null
type OwnerEmbed =
  | { full_name: string | null; email: string | null }
  | { full_name: string | null; email: string | null }[]
  | null

type RunCostRow = {
  run_id: string
  duration_ms: number | null
  cost_estimate: number | null
  has_pricing_gap: boolean | null
  has_tokens_gap: boolean | null
}

type JournalRunRow = {
  id: string
  run_type: string
  status: string
  trigger_source: string
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  company_id: string | null
  primary_entity_type: string | null
  primary_entity_id: string | null
  config: unknown
  company: CompanyEmbed
  owner: OwnerEmbed
}

// `input_snapshot` est volontairement absent : jusqu'à 5,3 ko par run, utile
// uniquement à la relance d'UN run (lu côté serveur par `retryRun`), pas aux
// 50 lignes sérialisées vers le client.
export const JOURNAL_SELECT =
  "id, run_type, status, trigger_source, error_message, created_at, started_at, completed_at, failed_at, company_id, primary_entity_type, primary_entity_id, config, company:companies(name), owner:profiles(full_name, email)"

export const RUN_COSTS_SELECT = "run_id, duration_ms, cost_estimate, has_pricing_gap, has_tokens_gap"

function firstOf<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// `profiles.full_name` peut être null (aucune contrainte) — retomber sur
// l'e-mail plutôt que d'afficher « — » alors que le propriétaire est connu.
function resolveOwnerName(owner: OwnerEmbed): string | null {
  const resolved = firstOf(owner)
  if (!resolved) return null
  return resolved.full_name ?? resolved.email ?? null
}

function resolveOwnerEmail(owner: OwnerEmbed): string | null {
  const resolved = firstOf(owner)
  if (!resolved) return null
  return resolved.email ?? null
}

export function mapRunJournalRows(runRows: JournalRunRow[], costRows: RunCostRow[]): RunJournalRow[] {
  const costsByRunId = new Map(costRows.map((c) => [c.run_id, c]))

  return runRows.map((r) => {
    const cost = costsByRunId.get(r.id)
    const company = firstOf(r.company)

    return {
      id: r.id,
      runType: r.run_type,
      runTypeLabel: workflowLabelForRunType(r.run_type),
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
      ownerName: resolveOwnerName(r.owner),
      ownerEmail: resolveOwnerEmail(r.owner),
      durationMs: cost?.duration_ms ?? null,
      costEstimate: cost?.cost_estimate ?? null,
      hasPricingGap: cost?.has_pricing_gap ?? false,
      hasTokensGap: cost?.has_tokens_gap ?? false,
      config: (r.config as Record<string, unknown>) ?? null,
    }
  })
}

// ─── Hydratation ciblée (Realtime) ───────────────────────────────────────────
// Recharge un lot de runs précis avec exactement la même projection que la
// liste initiale. Appelée depuis la Server Action `fetchRunJournalRows`.
export async function getRunJournalRowsByIds(runIds: string[]): Promise<RunJournalRow[]> {
  if (runIds.length === 0) return []

  const supabase = await createClient()

  const [runsRes, costsRes] = await Promise.all([
    supabase.from("ai_intelligence_runs").select(JOURNAL_SELECT).in("id", runIds),
    supabase.from("v_ai_run_costs").select(RUN_COSTS_SELECT).in("run_id", runIds),
  ])

  if (runsRes.error) {
    console.error("[automations] getRunJournalRowsByIds:", runsRes.error.message)
    return []
  }

  return mapRunJournalRows(
    (runsRes.data ?? []) as unknown as JournalRunRow[],
    (costsRes.data ?? []) as RunCostRow[],
  )
}

// ─── Rechargement complet du journal (bouton « Rafraîchir ») ─────────────────
// Renvoie `null` en cas d'échec plutôt qu'une liste vide : un journal vidé par
// une erreur silencieuse est précisément le défaut corrigé par ce chantier.
export async function getLatestRunJournalRows(): Promise<RunJournalRow[] | null> {
  const supabase = await createClient()

  const runsRes = await supabase
    .from("ai_intelligence_runs")
    .select(JOURNAL_SELECT)
    .order("created_at", { ascending: false })
    .limit(JOURNAL_LIMIT)

  if (runsRes.error) {
    console.error("[automations] getLatestRunJournalRows:", runsRes.error.message)
    return null
  }

  const runRows = (runsRes.data ?? []) as unknown as JournalRunRow[]
  const runIds = runRows.map((r) => r.id)

  const costsRes =
    runIds.length > 0
      ? await supabase.from("v_ai_run_costs").select(RUN_COSTS_SELECT).in("run_id", runIds)
      : { data: [] as RunCostRow[], error: null }

  if (costsRes.error) console.error("[automations] getLatestRunJournalRows (coûts):", costsRes.error.message)

  return mapRunJournalRows(runRows, (costsRes.data ?? []) as RunCostRow[])
}

export async function getFilteredRunJournalRows(filters: { from: string; to: string; workflow: string; status: string }): Promise<RunJournalRow[] | null> {
  const supabase = await createClient()

  let query = supabase
    .from("ai_intelligence_runs")
    .select(JOURNAL_SELECT)
    .gte("created_at", filters.from)
    .lt("created_at", filters.to)
    .order("created_at", { ascending: false })
    .limit(JOURNAL_LIMIT)

  if (filters.workflow !== "all") {
    query = query.eq("run_type", filters.workflow)
  }
  if (filters.status !== "all") {
    query = query.eq("status", filters.status as "succeeded" | "failed" | "queued" | "running" | "cancelled")
  }

  const runsRes = await query

  if (runsRes.error) {
    console.error("[automations] getFilteredRunJournalRows:", runsRes.error.message)
    return null
  }

  const runRows = (runsRes.data ?? []) as unknown as JournalRunRow[]
  const runIds = runRows.map((r) => r.id)

  const costsRes =
    runIds.length > 0
      ? await supabase.from("v_ai_run_costs").select(RUN_COSTS_SELECT).in("run_id", runIds)
      : { data: [] as RunCostRow[], error: null }

  if (costsRes.error) console.error("[automations] getFilteredRunJournalRows (coûts):", costsRes.error.message)

  return mapRunJournalRows(runRows, (costsRes.data ?? []) as RunCostRow[])
}

export async function getAutomationsDashboardData(): Promise<AutomationsDashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const dataErrors: AutomationsDataError[] = []

  function collectError(source: string, error: { message: string } | null) {
    if (!error) return
    console.error(`[automations] ${source}:`, error.message)
    dataErrors.push({ source, message: error.message })
  }

  // Requêtes indépendantes en parallèle (pas de cascade) : santé par workflow,
  // stats de coût par workflow, journal des runs récents, compteur de runs
  // repris par le reaper, timeline de coût complète, réglages de veille actifs,
  // et digests récents de la veille hebdomadaire.
  const [healthRes, costStatsRes, journalRunsRes, reapedRes, timelineRes, watchSettingsRes, watchRefreshStuckRes, veilleDigestsRes] = await Promise.all([
    supabase.from("v_workflow_health").select("*"),
    supabase.from("v_workflow_cost_stats").select("run_type, avg_cost_30d, total_cost_30d, has_pricing_gap, has_tokens_gap, avg_cost_all_time"),
    supabase
      .from("ai_intelligence_runs")
      .select(JOURNAL_SELECT)
      .order("created_at", { ascending: false })
      .limit(JOURNAL_LIMIT),
    supabase
      .from("ai_intelligence_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .ilike("error_message", "Run repris automatiquement (ops-004)%")
      .gte("failed_at", sevenDaysAgo.toISOString()),
    // L'embed vers profiles est possible depuis la migration 065 (clé étrangère
    // ai_intelligence_runs.owner_id → profiles.id) : PostgREST la propage aux
    // vues qui exposent owner_id. Une requête de résolution des noms en moins.
    supabase
      .from("v_ai_cost_timeline")
      .select("day, owner_id, cost_estimate, runs, owner:profiles(full_name, email)"),
    supabase
      .from("account_watch_settings")
      .select("cadence")
      .eq("is_enabled", true),
    supabase
      .from("ai_intelligence_runs")
      .select("id", { count: "exact", head: true })
      .in("run_type", ["account_watch_refresh", "intel-033-account-watch-refresh"])
      .eq("status", "running")
      .lt("started_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    supabase
      .from("veille_digests")
      .select("id, created_at, digest_date, nb_sources_actives, nb_candidats_evalues")
      .order("digest_date", { ascending: false })
      .limit(10),
  ])

  collectError("Santé des workflows", healthRes.error)
  collectError("Coûts par workflow", costStatsRes.error)
  collectError("Journal d'exécution", journalRunsRes.error)
  collectError("Runs repris (7j)", reapedRes.error)
  collectError("Timeline de coût", timelineRes.error)
  collectError("Réglages de veille", watchSettingsRes.error)
  collectError("Stuck runs veille", watchRefreshStuckRes.error)
  collectError("Digests de veille", veilleDigestsRes.error)

  const runRows = (journalRunsRes.data ?? []) as unknown as JournalRunRow[]
  const runIds = runRows.map((r) => r.id)

  // Dépend des IDs retournés ci-dessus — ne peut pas être parallélisée avec
  // le lot précédent, mais reste une seule requête ciblée (pas de N+1 par run).
  const costsRes =
    runIds.length > 0
      ? await supabase.from("v_ai_run_costs").select(RUN_COSTS_SELECT).in("run_id", runIds)
      : { data: [] as RunCostRow[], error: null }

  collectError("Coûts par run", costsRes.error)

  const journal = mapRunJournalRows(runRows, (costsRes.data ?? []) as RunCostRow[])

  // Workflows actifs uniquement (exclusion des workflows legacy inactifs)
  const activeHealthRows = (healthRes.data ?? []).filter((h) => !isLegacyWorkflow(h.run_type as string))
  const workflows: WorkflowHealthRow[] = activeHealthRows.map((h) => ({
    runType: h.run_type as string,
    label: workflowLabelForRunType(h.run_type as string),
    runs30d: h.runs_30d ?? 0,
    succeeded30d: h.succeeded_30d ?? 0,
    failed30d: h.failed_30d ?? 0,
    successRatePct30d: h.success_rate_pct_30d,
    stuckRunningNow: (h.run_type === "account_watch_refresh" || h.run_type === "intel-033-account-watch-refresh") ? (watchRefreshStuckRes.count ?? 0) : (h.stuck_running_now ?? 0),
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

  // Intégration de la veille hebdomadaire IA & Marché si non déjà présente via ai_intelligence_runs
  const hasVeilleWorkflow = workflows.some((w) =>
    w.runType === "veille-hebdomadaire-kredo" ||
    w.runType === "global-watch" ||
    w.runType === "global_watch" ||
    w.runType === "KREDO — Veille Hebdomadaire IA & Marché"
  )
  if (!hasVeilleWorkflow) {
    const thirtyDaysAgoTime = now.getTime() - 30 * 24 * 60 * 60 * 1000
    const allDigests = veilleDigestsRes.data ?? []
    const digests30d = allDigests.filter((d) => {
      const dateVal = d.created_at || d.digest_date
      return dateVal && new Date(dateVal).getTime() >= thirtyDaysAgoTime
    })
    const latestDigest = allDigests[0]
    const runsCount = digests30d.length > 0 ? digests30d.length : (latestDigest ? 1 : 0)

    workflows.push({
      runType: "veille-hebdomadaire-kredo",
      label: "Veille hebdomadaire IA & Marché",
      runs30d: runsCount,
      succeeded30d: runsCount,
      failed30d: 0,
      successRatePct30d: runsCount > 0 ? 100 : null,
      stuckRunningNow: 0,
      stuckQueuedNow: 0,
      lastRunAt: latestDigest?.created_at ?? latestDigest?.digest_date ?? null,
      lastFailureAt: null,
      p50DurationMs: null,
      p95DurationMs: null,
      avgCost30d: null,
      totalCost30d: null,
      hasPricingGap: false,
      hasTokensGap: false,
    })
  }

  workflows.sort(
    (a, b) =>
      b.failed30d + b.stuckRunningNow + b.stuckQueuedNow - (a.failed30d + a.stuckRunningNow + a.stuckQueuedNow) ||
      b.runs30d - a.runs30d ||
      a.label.localeCompare(b.label, "fr")
  )

  const costStatsByRunType = new Map((costStatsRes.data ?? []).filter((c) => !isLegacyWorkflow(c.run_type)).map((c) => [c.run_type, c]))
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
  const timelineRows = (timelineRes.data ?? []) as unknown as {
    day: string | null
    owner_id: string | null
    cost_estimate: number | null
    runs: number | null
    owner: OwnerEmbed
  }[]

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

    // Un run porte toujours un owner_id (colonne NOT NULL) : « Système / cron »
    // est réservé au cas où il n'y en aurait réellement aucun, et un
    // propriétaire connu mais sans nom ni e-mail n'est pas maquillé en cron.
    const ownerKey = row.owner_id ?? "__system__"
    const ownerName =
      row.owner_id === null
        ? "Système / cron"
        : (resolveOwnerName(row.owner) ?? "Utilisateur sans nom")
    const existingOwner = byOwnerMap.get(ownerKey) ?? { name: ownerName, costEstimate: 0, runs: 0 }
    existingOwner.runs += row.runs ?? 0
    if (row.cost_estimate !== null) existingOwner.costEstimate += row.cost_estimate
    byOwnerMap.set(ownerKey, existingOwner)

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
    dataErrors,
    fetchedAt: now.toISOString(),
  }
}
