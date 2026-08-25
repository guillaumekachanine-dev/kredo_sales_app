import { createClient } from "@/lib/supabase/client"

/**
 * Lit la source de vérité d'estimation des coûts par workflow depuis la vue `v_workflow_cost_stats`.
 * Réutilise exactement le modèle et la logique de la page Automatisations.
 */
export async function getWorkflowEstimatedCost(runType: string): Promise<number | null> {
  const supabase = createClient()

  let searchRunTypes = [runType]
  if (runType === "account_watch_refresh" || runType === "intel-033-account-watch-refresh") {
    searchRunTypes = ["intel-033-account-watch-refresh", "account_watch_refresh"]
  } else if (["veille-hebdomadaire-kredo", "global-watch", "global_watch"].includes(runType)) {
    searchRunTypes = ["veille-hebdomadaire-kredo", "global-watch", "global_watch", "KREDO — Veille Hebdomadaire IA & Marché"]
  }

  const { data } = await supabase
    .from("v_workflow_cost_stats")
    .select("run_type, avg_cost_30d, avg_cost_all_time")
    .in("run_type", searchRunTypes)

  if (!data || data.length === 0) return null

  for (const row of data) {
    const cost = row.avg_cost_30d ?? row.avg_cost_all_time ?? null
    if (cost !== null) return cost
  }

  return null
}

export function formatWorkflowCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined || !Number.isFinite(cost)) {
    return "—"
  }
  const formatted = cost.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} $`
}
