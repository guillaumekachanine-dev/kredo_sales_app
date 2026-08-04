import { getRunRetryPayload } from "@/lib/automations/run-journal-actions"

export type RetryRunResult = { ok: true; runId: string } | { ok: false; error: string }

// Relance un run échoué avec exactement le même payload que l'appel d'origine.
// Le payload (config.workflowId + primary_entity_type/id + company_id +
// input_snapshot) est relu côté serveur au moment du clic : `input_snapshot` ne
// voyage plus avec les 50 lignes du journal, et le serveur revérifie que le run
// appartient bien au workspace et est bien en échec.
// Le déclenchement passe toujours par POST /api/n8n/trigger (CORE-001) — aucune
// nouvelle plomberie.
export async function retryFailedRun(runId: string): Promise<RetryRunResult> {
  const payloadResult = await getRunRetryPayload(runId)
  if (!payloadResult.ok) return { ok: false, error: payloadResult.error }

  const { workflowId, entityType, entityId, companyId, input } = payloadResult.payload

  try {
    const res = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        companyId: companyId ?? undefined,
        input,
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
