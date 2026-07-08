// ─── Client HTTP vers n8n (CORE-001) ─────────────────────────────────────────
// Appelé uniquement depuis /api/n8n/trigger (jamais depuis le front).
// Ne lève pas d'erreur bloquante : on log et on continue (le run reste "queued",
// un job de reprise pourra le relancer — OPS-004).

import { signPayload } from "./hmac"

function getBaseUrl(): string {
  const url = process.env.N8N_WEBHOOK_BASE_URL
  if (!url) throw new Error("N8N_WEBHOOK_BASE_URL is not set")
  return url.replace(/\/$/, "") // enlève le slash final s'il existe
}

// workflowPath = l'ID du workflow tel qu'il est nommé dans n8n
// ex: "intel-020-communication" → POST sur {BASE}/webhook/intel-020-communication
export async function callN8nWebhook(
  workflowPath: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body)
  const url = `${getBaseUrl()}/webhook/${workflowPath}`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KREDO-Signature": signature,
    },
    body,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "(no body)")
    throw new Error(`n8n webhook error ${res.status}: ${detail}`)
  }
}
