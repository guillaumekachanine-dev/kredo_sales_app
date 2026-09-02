import { asNumber, daysSince, parseDate } from "./shared"

// ─────────────────────────────────────────────────────────────────────────────
//  Intelligence Automatisations — règles pures.
//
//  Trois lectures d'un même corpus (santé par workflow + runs en échec + stats
//  de coût) : les erreurs, les coûts, et le backlog de corrections priorisé.
//
//  Trois invariants, tous hérités de la doctrine des vues Lot 0 :
//   • un coût inconnu vaut `null`, jamais 0. Les vues distinguent déjà
//     `tokens_missing` de `pricing_missing` précisément pour ne pas
//     sous-estimer en silence ; ces règles ne rattrapent pas ce choix ;
//   • un run repris par le reaper (ops-004) n'est pas une erreur de workflow.
//     C'est un run bloqué que la base a fermé. Le compter comme un échec
//     applicatif ferait accuser le mauvais coupable ;
//   • toute valeur estimée porte le mot « estimé » jusque dans son nom de
//     champ. Le coût gaspillé par les échecs est dérivé d'un coût MOYEN : ce
//     n'est pas un montant constaté et il ne doit jamais s'afficher comme tel.
// ─────────────────────────────────────────────────────────────────────────────

export type AutomationSeverity = "critical" | "warning" | "info"

/** Préfixe écrit par la fonction ops-004 sur les runs qu'elle referme. */
export const REAPED_RUN_ERROR_PREFIX = "Run repris automatiquement (ops-004)"

export type AutomationWorkflowRow = {
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
  p95DurationMs: number | null
  totalCost30d: number | null
  avgCost30d: number | null
  avgCostAllTime: number | null
  hasPricingGap: boolean
  hasTokensGap: boolean
}

export type AutomationFailedRunRow = {
  id: string
  runType: string
  errorMessage: string | null
  failedAt: string | null
}

// ─── Normalisation des messages d'erreur ─────────────────────────────────────

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}(?:t[\d:.]+z?)?/gi
const QUOTED_PATTERN = /["“”'`«»][^"“”'`«»]{1,120}["“”'`«»]/g
const NUMBER_PATTERN = /\b\d+([.,]\d+)?\b/g
const URL_PATTERN = /https?:\/\/\S+/gi
const WHITESPACE_PATTERN = /\s+/g

/**
 * Signature d'un message d'erreur : ce qui reste une fois retirés les
 * identifiants, dates, URLs, littéraux entre guillemets et nombres.
 *
 * C'est ce qui permet de dire « la même panne s'est produite 14 fois » plutôt
 * que d'afficher 14 messages presque identiques. Volontairement conservateur :
 * mieux vaut deux grappes distinctes qu'une fusion abusive.
 */
export function normalizeErrorSignature(message: string | null | undefined): string | null {
  if (!message) return null
  const signature = message
    .toLowerCase()
    .replace(URL_PATTERN, "<url>")
    .replace(UUID_PATTERN, "<id>")
    .replace(ISO_DATE_PATTERN, "<date>")
    .replace(QUOTED_PATTERN, "<val>")
    .replace(NUMBER_PATTERN, "<n>")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()

  if (!signature) return null
  return signature.length > 160 ? `${signature.slice(0, 160)}…` : signature
}

export function isReapedRun(errorMessage: string | null | undefined): boolean {
  return Boolean(errorMessage?.startsWith(REAPED_RUN_ERROR_PREFIX))
}

// ─── 1. Analyser les erreurs ─────────────────────────────────────────────────

export type ErrorCluster = {
  signature: string
  count: number
  workflowLabels: string[]
  lastSeenAt: string | null
  sampleMessage: string
}

export type FailingWorkflow = {
  runType: string
  label: string
  runs30d: number
  failed30d: number
  failureRatePct: number
  stuckNow: number
  lastFailureAt: string | null
  severity: AutomationSeverity
}

export type AutomationErrorsRulesResult = {
  summary: {
    failedRuns30d: number
    reapedRuns30d: number
    affectedWorkflows: number
    stuckNow: number
  }
  failingWorkflows: FailingWorkflow[]
  clusters: ErrorCluster[]
}

function failureSeverity(failureRatePct: number, failed30d: number): AutomationSeverity {
  if (failureRatePct >= 25 || failed30d >= 10) return "critical"
  if (failureRatePct >= 10 || failed30d >= 3) return "warning"
  return "info"
}

export function buildAutomationErrors(input: {
  workflows: AutomationWorkflowRow[]
  failedRuns: AutomationFailedRunRow[]
}): AutomationErrorsRulesResult {
  const genuineFailures = input.failedRuns.filter((run) => !isReapedRun(run.errorMessage))
  const reapedRuns = input.failedRuns.filter((run) => isReapedRun(run.errorMessage))

  const labelByRunType = new Map(input.workflows.map((workflow) => [workflow.runType, workflow.label]))

  const failingWorkflows = input.workflows
    .filter((workflow) => workflow.failed30d > 0 || workflow.stuckRunningNow + workflow.stuckQueuedNow > 0)
    .map<FailingWorkflow>((workflow) => {
      const failureRatePct = workflow.runs30d > 0
        ? Math.round((workflow.failed30d / workflow.runs30d) * 1000) / 10
        : 0
      return {
        runType: workflow.runType,
        label: workflow.label,
        runs30d: workflow.runs30d,
        failed30d: workflow.failed30d,
        failureRatePct,
        stuckNow: workflow.stuckRunningNow + workflow.stuckQueuedNow,
        lastFailureAt: workflow.lastFailureAt,
        severity: failureSeverity(failureRatePct, workflow.failed30d),
      }
    })
    .sort((a, b) => b.failed30d - a.failed30d || b.failureRatePct - a.failureRatePct)

  const clusterMap = new Map<string, ErrorCluster>()
  for (const run of genuineFailures) {
    const signature = normalizeErrorSignature(run.errorMessage)
    if (!signature) continue

    const existing = clusterMap.get(signature)
    const label = labelByRunType.get(run.runType) ?? run.runType

    if (!existing) {
      clusterMap.set(signature, {
        signature,
        count: 1,
        workflowLabels: [label],
        lastSeenAt: run.failedAt,
        sampleMessage: run.errorMessage ?? "",
      })
      continue
    }

    existing.count += 1
    if (!existing.workflowLabels.includes(label)) existing.workflowLabels.push(label)
    if (!existing.lastSeenAt || (run.failedAt && run.failedAt > existing.lastSeenAt)) {
      existing.lastSeenAt = run.failedAt
    }
  }

  return {
    summary: {
      failedRuns30d: genuineFailures.length,
      reapedRuns30d: reapedRuns.length,
      affectedWorkflows: new Set(genuineFailures.map((run) => run.runType)).size,
      stuckNow: input.workflows.reduce(
        (total, workflow) => total + workflow.stuckRunningNow + workflow.stuckQueuedNow,
        0,
      ),
    },
    failingWorkflows,
    clusters: [...clusterMap.values()].sort((a, b) => b.count - a.count || a.signature.localeCompare(b.signature)),
  }
}

// ─── 2. Analyser les coûts ───────────────────────────────────────────────────

export type WorkflowCost = {
  runType: string
  label: string
  runs30d: number
  totalCost30d: number | null
  avgCost30d: number | null
  avgCostAllTime: number | null
  /** Écart du coût moyen sur 30 j face à la moyenne historique, en %. */
  avgCostDriftPct: number | null
  costCoverage: "complete" | "pricing_missing" | "tokens_missing"
}

export type AutomationCostsRulesResult = {
  summary: {
    /** Somme des coûts CONNUS. `workflowsWithGaps` dit ce qui manque. */
    knownCost30d: number
    workflowsWithGaps: number
    costliestLabel: string | null
    costliestSharePct: number | null
  }
  workflows: WorkflowCost[]
  gaps: Array<{ label: string; reason: string }>
}

function costCoverage(workflow: AutomationWorkflowRow): WorkflowCost["costCoverage"] {
  if (workflow.hasPricingGap) return "pricing_missing"
  if (workflow.hasTokensGap) return "tokens_missing"
  return "complete"
}

export function buildAutomationCosts(input: {
  workflows: AutomationWorkflowRow[]
}): AutomationCostsRulesResult {
  const workflows = input.workflows
    .filter((workflow) => workflow.runs30d > 0 || asNumber(workflow.totalCost30d) > 0)
    .map<WorkflowCost>((workflow) => {
      const avg30d = workflow.avgCost30d
      const avgAllTime = workflow.avgCostAllTime
      const drift = avg30d !== null && avgAllTime !== null && avgAllTime > 0
        ? Math.round(((avg30d - avgAllTime) / avgAllTime) * 1000) / 10
        : null

      return {
        runType: workflow.runType,
        label: workflow.label,
        runs30d: workflow.runs30d,
        totalCost30d: workflow.totalCost30d,
        avgCost30d: avg30d,
        avgCostAllTime: avgAllTime,
        avgCostDriftPct: drift,
        costCoverage: costCoverage(workflow),
      }
    })
    .sort((a, b) => asNumber(b.totalCost30d) - asNumber(a.totalCost30d) || a.label.localeCompare(b.label))

  const knownCost30d = workflows.reduce((total, workflow) => total + asNumber(workflow.totalCost30d), 0)
  const costliest = workflows.find((workflow) => workflow.totalCost30d !== null && workflow.totalCost30d > 0) ?? null

  return {
    summary: {
      knownCost30d: Math.round(knownCost30d * 100) / 100,
      workflowsWithGaps: workflows.filter((workflow) => workflow.costCoverage !== "complete").length,
      costliestLabel: costliest?.label ?? null,
      costliestSharePct: costliest && knownCost30d > 0
        ? Math.round((asNumber(costliest.totalCost30d) / knownCost30d) * 1000) / 10
        : null,
    },
    workflows,
    gaps: workflows
      .filter((workflow) => workflow.costCoverage !== "complete")
      .map((workflow) => ({
        label: workflow.label,
        reason: workflow.costCoverage === "pricing_missing"
          ? "Aucun tarif enregistré pour le modèle utilisé"
          : "Consommation de tokens non remontée",
      })),
  }
}

// ─── 3. Prioriser les corrections ────────────────────────────────────────────

export type CorrectionDriver = { label: string; weight: number }

export type CorrectionItem = {
  runType: string
  label: string
  score: number
  severity: AutomationSeverity
  drivers: CorrectionDriver[]
  failed30d: number
  failureRatePct: number
  stuckNow: number
  /** Dérivé d'un coût MOYEN, jamais constaté. `null` si le coût est incomplet. */
  estimatedWastedCostEur: number | null
  lastFailureAt: string | null
  daysSinceLastFailure: number | null
}

export type AutomationFixesRulesResult = {
  items: CorrectionItem[]
  summary: {
    criticalCount: number
    totalEstimatedWasteEur: number | null
    healthyWorkflows: number
  }
}

/**
 * Score de priorité, additif et entièrement explicable : chaque composante est
 * rendue avec son poids dans `drivers`. Aucune pondération cachée — un backlog
 * qu'on ne peut pas contester est un backlog qu'on n'applique pas.
 */
export function buildAutomationFixes(input: {
  now: string
  workflows: AutomationWorkflowRow[]
}): AutomationFixesRulesResult {
  const now = parseDate(input.now) ?? new Date()

  const items = input.workflows
    .filter((workflow) => workflow.failed30d > 0 || workflow.stuckRunningNow + workflow.stuckQueuedNow > 0)
    .map<CorrectionItem>((workflow) => {
      const failureRatePct = workflow.runs30d > 0
        ? Math.round((workflow.failed30d / workflow.runs30d) * 1000) / 10
        : 0
      const stuckNow = workflow.stuckRunningNow + workflow.stuckQueuedNow
      const sinceLastFailure = daysSince(workflow.lastFailureAt, now)

      const drivers: CorrectionDriver[] = []

      // Taux d'échec — le signal le plus fort : un workflow qui rate une fois
      // sur quatre est cassé, quel que soit son volume.
      const rateWeight = Math.min(40, Math.round(failureRatePct * 1.6))
      if (rateWeight > 0) drivers.push({ label: `${failureRatePct} % d'échecs sur 30 j`, weight: rateWeight })

      // Volume — dix échecs sur un workflow très sollicité coûtent plus qu'un
      // taux élevé sur un workflow marginal.
      const volumeWeight = Math.min(25, workflow.failed30d * 2)
      if (volumeWeight > 0) drivers.push({ label: `${workflow.failed30d} runs en échec`, weight: volumeWeight })

      // Runs bloqués maintenant — ils consomment une file et faussent tous les
      // compteurs tant qu'ils ne sont pas repris.
      const stuckWeight = Math.min(20, stuckNow * 10)
      if (stuckWeight > 0) drivers.push({ label: `${stuckNow} run(s) bloqué(s) actuellement`, weight: stuckWeight })

      // Récence — une panne d'il y a trois semaines qui ne s'est pas reproduite
      // n'est plus une priorité.
      const recencyWeight = sinceLastFailure === null ? 0 : sinceLastFailure <= 2 ? 15 : sinceLastFailure <= 7 ? 8 : 0
      if (recencyWeight > 0) {
        drivers.push({
          label: sinceLastFailure !== null && sinceLastFailure <= 2 ? "Échec dans les 48 h" : "Échec dans les 7 jours",
          weight: recencyWeight,
        })
      }

      const estimatedWastedCostEur = workflow.avgCost30d !== null && !workflow.hasPricingGap && !workflow.hasTokensGap
        ? Math.round(workflow.avgCost30d * workflow.failed30d * 100) / 100
        : null

      const score = drivers.reduce((total, driver) => total + driver.weight, 0)

      return {
        runType: workflow.runType,
        label: workflow.label,
        score,
        severity: score >= 50 ? "critical" : score >= 25 ? "warning" : "info",
        drivers: drivers.sort((a, b) => b.weight - a.weight),
        failed30d: workflow.failed30d,
        failureRatePct,
        stuckNow,
        estimatedWastedCostEur,
        lastFailureAt: workflow.lastFailureAt,
        daysSinceLastFailure: sinceLastFailure,
      }
    })
    .sort((a, b) => b.score - a.score || b.failed30d - a.failed30d || a.label.localeCompare(b.label))

  const measurableWaste = items.filter((item) => item.estimatedWastedCostEur !== null)

  return {
    items,
    summary: {
      criticalCount: items.filter((item) => item.severity === "critical").length,
      totalEstimatedWasteEur: measurableWaste.length > 0
        ? Math.round(measurableWaste.reduce((total, item) => total + asNumber(item.estimatedWastedCostEur), 0) * 100) / 100
        : null,
      healthyWorkflows: input.workflows.length - items.length,
    },
  }
}
