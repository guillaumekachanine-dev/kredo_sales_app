import type { RunJournalRow } from "@/lib/automations/automations-data"

export type RetryRunResult = { ok: true; runId: string } | { ok: false; error: string }

// Relance un run échoué avec exactement le même payload que l'appel d'origine
// (config.workflowId + primary_entity_type/id + company_id + input_snapshot).
// Repose sur POST /api/n8n/trigger (CORE-001) — aucune nouvelle plomberie.
export async function retryFailedRun(run: RunJournalRow): Promise<RetryRunResult> {
  const workflowId = (run.config as { workflowId?: string } | null)?.workflowId

  if (!workflowId) {
    return { ok: false, error: "workflowId introuvable dans ce run (config manquante) — relance impossible." }
  }

  try {
    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId,
        entityType: run.primaryEntityType ?? undefined,
        entityId: run.primaryEntityId ?? undefined,
        companyId: run.companyId ?? undefined,
        input: run.inputSnapshot ?? {},
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: (body as { error?: string }).error ?? `Erreur ${res.status}` }
    }

    const body = (await res.json()) as { runId: string }
    return { ok: true, runId: body.runId }
  } catch {
    return { ok: false, error: "Erreur réseau — la relance n'a pas pu être déclenchée." }
  }
}
