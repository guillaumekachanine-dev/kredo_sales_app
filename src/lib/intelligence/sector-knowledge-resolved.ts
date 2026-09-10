import "server-only"

import { cache } from "react"
import { getRequestClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture unique de `v_sector_knowledge_resolved` pour un segment donné.
//
//  Pourquoi ce module existe : la fiche compte interrogeait cette vue DEUX fois
//  par rendu, depuis deux modules différents et avec deux listes de colonnes
//  distinctes — donc sans déduplication possible par la mémoïsation `fetch` de
//  Next, qui n'agit qu'à URL strictement identique. Trace du 2026-09-10 :
//  t0=1545 ms (4 522 octets) puis t0=1689 ms (2 947 octets), deux vagues.
//  Voir docs/performance-data-audit, constat F-1b.
//
//  Une seule projection — l'union des deux — mémoïsée par `cache()` : les deux
//  consommateurs partagent désormais un aller-retour au lieu de deux.
//
//  ⚠️ `cache()` ne mémoïse que pendant un rendu RSC. La route API
//  `/api/intelligence-panel/[companyId]` en bénéficie donc pas ; elle n'en fait
//  de toute façon qu'un seul appel, et paie seulement quelques colonnes de plus.
//
//  🔴 Rappel Lot 0 (migrations 069-071) : la connaissance sectorielle d'un compte
//  se lit par `companies.segment_id` sur CETTE vue, jamais par `sector_id` sur
//  `sector_intelligence`. La résolution segment → macro n'existe qu'en SQL et ne
//  doit jamais être réimplémentée en TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

export type SectorKnowledgeResolvedRow = {
  segment_id: string
  segment_name: string
  segment_slug: string
  segment_status: string
  macro_id: string | null
  macro_name: string | null
  macro_slug: string | null
  macro_status: string | null
  description: string | null
  attractiveness_score: number | string | null
  market_size_eur_bn: number | string | null
  market_growth_pct: number | string | null
  key_players_paca: unknown
  key_players_national: unknown
  playbook: Json
  description_level: string
  playbook_level: string
  attractiveness_score_level: string
  market_size_eur_bn_level: string
  market_growth_pct_level: string
  has_segment_knowledge: boolean
}

// Littéral d'un seul tenant : PostgREST infère le type de ligne en parsant cette
// chaîne, une concaténation la rendrait opaque.
const SECTOR_KNOWLEDGE_SELECT =
  "segment_id,segment_name,segment_slug,segment_status,macro_id,macro_name,macro_slug,macro_status,description,attractiveness_score,market_size_eur_bn,market_growth_pct,key_players_paca,key_players_national,playbook,description_level,playbook_level,attractiveness_score_level,market_size_eur_bn_level,market_growth_pct_level,has_segment_knowledge"

export const getSectorKnowledgeResolved = cache(
  async (segmentId: string): Promise<SectorKnowledgeResolvedRow | null> => {
    const supabase = await getRequestClient()
    const { data } = await supabase
      .from("v_sector_knowledge_resolved")
      .select(SECTOR_KNOWLEDGE_SELECT)
      .eq("segment_id", segmentId)
      .maybeSingle<SectorKnowledgeResolvedRow>()
    return data ?? null
  },
)
