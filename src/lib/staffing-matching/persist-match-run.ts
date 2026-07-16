import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { MATCH_VERSION } from "./match-config"
import type { MatchingResult } from "./types"

// Persiste un run de matching dans match_scores (une ligne par profil noté).
// match_scores est un CACHE de calcul (pas de curation humaine dessus), donc un
// re-run REMPLACE le run précédent de l'opportunité (delete puis insert) plutôt
// que d'empiler un historique — la table reste "le match courant". `scores` porte
// le détail explicable par composante (le champ existe précisément pour ça).
export interface PersistMatchRunResult {
  persistedCount: number
  runAt: string
}

export async function persistMatchRun(result: MatchingResult): Promise<PersistMatchRunResult> {
  const supabase = await createClient()
  const runAt = new Date().toISOString()

  // Remplacement scopé à l'opportunité (RLS garantit l'isolation workspace).
  const { error: deleteError } = await supabase
    .from("match_scores")
    .delete()
    .eq("opportunity_id", result.needId)

  if (deleteError) {
    throw new Error(`Échec de la purge des matchs précédents : ${deleteError.message}`)
  }

  if (result.rankedProfiles.length === 0) {
    return { persistedCount: 0, runAt }
  }

  const rows = result.rankedProfiles.map((profile) => ({
    opportunity_id: result.needId,
    person_id: profile.personId,
    overall_score: profile.overallScore,
    model_version: MATCH_VERSION,
    scores: {
      tier: profile.tier,
      confidence: profile.confidence,
      sourceType: profile.sourceType,
      sourceId: profile.sourceId,
      components: profile.components,
      pros: profile.pros,
      cons: profile.cons,
      missingData: profile.missingData,
    } as unknown as Json,
  }))

  const { error: insertError } = await supabase.from("match_scores").insert(rows)

  if (insertError) {
    throw new Error(`Échec de la persistance des matchs : ${insertError.message}`)
  }

  return { persistedCount: rows.length, runAt }
}
