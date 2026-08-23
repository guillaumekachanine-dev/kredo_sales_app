"use server"

import { revalidatePath } from "next/cache"
import { collectMatchingInput } from "./collect-matching-input"
import { computeMatching, selectMatchingResultForDisplay } from "./compute-match"
import { persistMatchRun } from "./persist-match-run"
import type { MatchingResult } from "./types"

export type RunMatchingResult =
  | { ok: true; result: MatchingResult; persistedCount: number }
  | { ok: false; error: string }

// Orchestrateur du matching provoqué (bouton "Trouver les profils" sur un besoin).
// Chaîne 100 % déterministe : hydratation RPC -> moteur TS -> persistance
// match_scores. Aucun LLM, aucun workflow n8n. Le cache conserve le pool complet
// tandis que la réponse UI est filtrée par la politique d'affichage V1.1.
export async function runOpportunityMatching(opportunityId: string): Promise<RunMatchingResult> {
  if (!opportunityId) {
    return { ok: false, error: "Opportunité manquante." }
  }

  try {
    const context = await collectMatchingInput(opportunityId)

    if (!context.need?.id) {
      return { ok: false, error: "Besoin introuvable ou hors de votre périmètre." }
    }

    const fullResult = computeMatching(context)
    const { persistedCount } = await persistMatchRun(fullResult)
    const result = selectMatchingResultForDisplay(fullResult)

    revalidatePath("/missions/opps")
    revalidatePath("/staffing")

    return { ok: true, result, persistedCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue pendant le matching."
    console.error("runOpportunityMatching a échoué:", err)
    return { ok: false, error: message }
  }
}
