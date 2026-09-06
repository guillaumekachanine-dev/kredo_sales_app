import { ON_DEMAND_DIGEST_WORKFLOW_ID } from "@/components/veille/veille-desktop-contracts"
import type { DigestLaunchInputV2 } from "../domain/digest-launch-contracts"

export type LaunchDigestParams = {
  topicKey: string
  corpusId?: string | null
}

export type LaunchDigestResult =
  | { ok: true; runId: string }
  | { ok: false; error: string }

/**
 * Déclenchement client factorisé d'un digest V2 (ADR-0022 Lot 3).
 *
 * Envoie STRICTEMENT le contrat client V2 à /api/n8n/trigger :
 * `schemaVersion: 2`, `triggerMode: "manual"`, `topicKey`, `corpusId`.
 * Aucun framing, ni source, ni URL n'est produit par le navigateur.
 */
export async function launchDigest(params: LaunchDigestParams): Promise<LaunchDigestResult> {
  const topicKey = params.topicKey?.trim()
  if (!topicKey) {
    return { ok: false, error: "Le choix d'un sujet est requis pour générer un digest." }
  }

  const input: DigestLaunchInputV2 = {
    schemaVersion: 2,
    triggerMode: "manual",
    topicKey,
    corpusId: params.corpusId ? params.corpusId.trim() : null,
  }

  try {
    const response = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflowId: ON_DEMAND_DIGEST_WORKFLOW_ID,
        entityType: "workspace",
        input,
      }),
    })

    const payload = (await response.json()) as { runId?: string; error?: string }

    if (!response.ok || !payload.runId) {
      return {
        ok: false,
        error: payload.error ?? "Le workflow de digest n’a pas pu être déclenché.",
      }
    }

    return { ok: true, runId: payload.runId }
  } catch {
    return {
      ok: false,
      error: "Erreur réseau : la génération du digest n’a pas pu être lancée.",
    }
  }
}
