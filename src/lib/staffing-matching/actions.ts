"use server"

import { revalidatePath } from "next/cache"
import { collectMatchingInput } from "./collect-matching-input"
import { computeMatching } from "./compute-match"
import { persistMatchRun } from "./persist-match-run"
import type { MatchingResult } from "./types"

export type RunMatchingResult =
  | { ok: true; result: MatchingResult; persistedCount: number }
  | { ok: false; error: string }

// Orchestrateur du matching provoqué (bouton "Trouver les profils" sur un besoin).
// Chaîne 100 % déterministe : hydratation RPC -> moteur TS -> persistance
// match_scores. Aucun LLM, aucun workflow n8n. Le résultat complet est renvoyé au
// client pour affichage immédiat (la persistance sert le cache/rechargements).
export async function runOpportunityMatching(opportunityId: string): Promise<RunMatchingResult> {
  if (!opportunityId) {
    return { ok: false, error: "Opportunité manquante." }
  }

  try {
    const context = await collectMatchingInput(opportunityId)

    if (!context.need?.id) {
      return { ok: false, error: "Besoin introuvable ou hors de votre périmètre." }
    }

    const result = computeMatching(context)
    const { persistedCount } = await persistMatchRun(result)

    revalidatePath("/missions/opps")
    revalidatePath("/staffing")

    return { ok: true, result, persistedCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue pendant le matching."
    console.error("runOpportunityMatching a échoué:", err)
    return { ok: false, error: message }
  }
}
