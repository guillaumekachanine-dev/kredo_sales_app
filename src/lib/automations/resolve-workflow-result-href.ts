// Client-safe resolver déterministe pour les liens de livrables d'exécutions de workflow.

export type WorkflowResultHrefInput = {
  runType: string
  status?: string | null
  companyId?: string | null
  primaryEntityType?: string | null
  primaryEntityId?: string | null
  config?: Record<string, unknown> | null
}

const ACCOUNT_CENTRIC_RUN_TYPES = new Set([
  "intel-010-refresh",
  "intel-030-account-knowledge",
  "intel-031-issues-map",
  "intel-032-strategy",
  "intel-033-account-watch-refresh",
  "account_watch_refresh",
  "intel-034-account-signal-verification",
])

const GLOBAL_WATCH_RUN_TYPES = new Set([
  "veille-hebdomadaire-kredo",
  "veille-ia-marche-on-demand",
  "global-watch",
  "global_watch",
  "KREDO — Veille Hebdomadaire IA & Marché",
])

const REPORT_RUN_TYPES = new Set([
  "intel-040-workspace-diagnostic",
  "report-account-summary",
  "report-activity-commercial",
  "report-activity-recruitment",
  "report-weekly-manager",
  "report-weekly-manager-cron",
])

/**
 * Résout de façon déterministe l'URL relative interne vers le livrable issu d'un run.
 * Renvoie `null` si le run n'est pas terminé avec succès ou si aucune destination
 * navigable fiable ne correspond au type de workflow.
 */
export function resolveWorkflowResultHref(run: WorkflowResultHrefInput): string | null {
  // Seul un run ayant abouti avec succès produit un livrable navigable
  if (run.status && run.status !== "succeeded") {
    return null
  }

  // Option B : route configurée explicitement dans extraConfig (doit être un chemin relatif interne sûr)
  if (typeof run.config?.resultHref === "string" && run.config.resultHref.startsWith("/")) {
    return run.config.resultHref
  }

  const { runType, companyId } = run

  // Workflows centrés sur un compte
  if (companyId && (ACCOUNT_CENTRIC_RUN_TYPES.has(runType) || runType.startsWith("mission:"))) {
    return `/prospection/accounts/${companyId}`
  }

  // Workflows de veille générale
  if (GLOBAL_WATCH_RUN_TYPES.has(runType)) {
    return "/veille"
  }

  // Workflows de rapports / diagnostics transverses
  if (REPORT_RUN_TYPES.has(runType) || (runType.startsWith("mission:") && !companyId)) {
    return "/reports"
  }

  return null
}
