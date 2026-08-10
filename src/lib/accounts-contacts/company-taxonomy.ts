import "server-only"

import type { createClient } from "@/lib/supabase/server"

/**
 * Migration 066 : `companies.segment_id` et `companies.sector_id` sont NOT NULL.
 * `segment_id` est l'unique point de saisie de la taxonomie (§5.2) ; `sector_id`
 * en est dérivé par `trg_companies_derive_sector_id` (§5.1).
 *
 * Tout chemin de création de compte doit donc résoudre un segment. Sans segment
 * choisi, le compte tombe dans le bac « 0.0 À qualifier » plutôt que d'échouer.
 * Le slug est résolu à l'exécution : jamais d'UUID en dur.
 *
 * `sectorId` est renvoyé parce que `sector_id` est NOT NULL sans DEFAULT :
 * l'INSERT doit le porter. Le trigger le recalcule et fait autorité — cette
 * valeur n'est qu'un laissez-passer de contrainte.
 */
export const FALLBACK_SEGMENT_SLUG = "seg-a-qualifier"

export type ResolvedCompanyTaxonomy =
  | { segmentId: string; sectorId: string; error: null }
  | { segmentId: null; sectorId: null; error: string }

export async function resolveCompanyTaxonomy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  segmentId: string | null | undefined
): Promise<ResolvedCompanyTaxonomy> {
  const query = supabase.from("sector_intelligence").select("id, parent_id")
  const { data, error } = segmentId
    ? await query.eq("id", segmentId).maybeSingle()
    : await query.eq("slug", FALLBACK_SEGMENT_SLUG).maybeSingle()

  if (error) return { segmentId: null, sectorId: null, error: error.message }
  if (!data) {
    return {
      segmentId: null,
      sectorId: null,
      error: segmentId
        ? "Segment sectoriel introuvable."
        : `Segment « ${FALLBACK_SEGMENT_SLUG} » introuvable.`,
    }
  }

  // Un macro utilisé comme segment (classement au grain macro, toléré §5.1)
  // est son propre secteur.
  return { segmentId: data.id, sectorId: data.parent_id ?? data.id, error: null }
}
