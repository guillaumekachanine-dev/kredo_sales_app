// Appel de la passerelle unique POST /api/n8n/trigger depuis le navigateur.
//
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/03-PROMPT-LOT-0.md L1 §10
// Le navigateur transmet UNIQUEMENT le `WatchAnalysisInputV2` validé — jamais
// de `resolvedRefs`, jamais de `workspaceId` choisi côté client, jamais
// d'appel n8n direct. La résolution serveur (`resolveWatchAnalysisSources`,
// branche V2 de `/api/n8n/trigger`) est un sujet L2, pas branché ici : tant
// que L2 n'est pas livré, cet appel crée un run mais son traitement réel côté
// n8n n'est pas garanti (cf. HANDOFF-L1.md).
//
// Pas de "use client" ici : ce module ne contient aucun hook/JSX, seulement
// des fonctions pures/fetch, importables aussi bien depuis un hook client
// que depuis un test Node.

import type { WatchAnalysisInputV2 } from "@/lib/n8n/types"
import { validateWatchAnalysisInput } from "../domain/watch-analysis-contracts"

/** Même workflow que l'analyse mensuelle V1 — décision structurante du chantier (README §Décisions 1). */
export const WATCH_ANALYSIS_WORKFLOW_ID = "intel-021-monthly-watch-analysis" as const

export type LaunchWatchAnalysisResult = { ok: true; runId: string } | { ok: false; error: string }

export type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

export async function launchWatchAnalysis(
  params: { intention: string; sources: WatchAnalysisInputV2["sources"] },
  options: { fetchImpl?: FetchLike; now?: () => string } = {},
): Promise<LaunchWatchAnalysisResult> {
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike)
  const now = options.now ?? (() => new Date().toISOString())

  const candidate: WatchAnalysisInputV2 = {
    schemaVersion: 2,
    triggerMode: "manual_custom",
    intention: params.intention,
    sources: params.sources,
    requestedAt: now(),
  }

  const validated = validateWatchAnalysisInput(candidate)
  if (!validated.ok) return { ok: false, error: validated.error }

  try {
    const response = await fetchImpl("/api/n8n/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflowId: WATCH_ANALYSIS_WORKFLOW_ID,
        entityType: "workspace",
        input: validated.value,
      }),
    })
    const payload = (await response.json().catch(() => null)) as { runId?: string; error?: string } | null
    if (!response.ok || !payload?.runId) {
      return { ok: false, error: payload?.error ?? "Impossible de lancer l'analyse." }
    }
    return { ok: true, runId: payload.runId }
  } catch {
    return { ok: false, error: "Erreur réseau : l'analyse n'a pas pu être lancée." }
  }
}
