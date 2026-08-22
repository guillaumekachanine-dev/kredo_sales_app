import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { ResolvedSource } from "../shared/SourceChip"

type SourceCorpusItemWithCatalog = Database["public"]["Tables"]["source_corpus_items"]["Row"] & {
  source_catalog: Pick<
    Database["public"]["Tables"]["source_catalog"]["Row"],
    "publisher" | "homepage_url" | "last_verified_at"
  > | null
}

/**
 * Résout les src_ids entiers référencés dans sector_intelligence.playbook (market_thesis,
 * risks, tech_fronts, economic_models, dependances_critiques, ...) vers leur fiche source, via
 * le corpus déjà ingéré pour ce secteur (source_corpora/source_corpus_items, `src_number`
 * généré depuis external_src_id "SRC-0NN" — migration 20260822092309).
 *
 * `url` renvoie `source_catalog.homepage_url`, pas l'URL exacte citée dans l'étude E4 : le
 * registre de sources est scopé par domaine (une ligne par éditeur), pas par citation. L'URL
 * précise de chaque fait attesté ne vit aujourd'hui que dans le fichier `04-secteur.json` du
 * registre MASTER-STUDY, jamais en base.
 */
export async function getSectorSourceResolution(
  sectorId: string,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<Map<number, ResolvedSource>> {
  const supabase = options?.supabase ?? (await createClient())

  const { data: corpora, error: corporaError } = await supabase
    .from("source_corpora")
    .select("id")
    .eq("sector_id", sectorId)
    .eq("is_current", true)

  if (corporaError) {
    throw new Error(`Failed to query source_corpora: ${corporaError.message}`)
  }

  const corpusIds = (corpora ?? []).map((row) => row.id)
  if (corpusIds.length === 0) return new Map()

  const { data: items, error: itemsError } = await supabase
    .from("source_corpus_items")
    .select("src_number, tier, atteste, source_catalog:source_id(publisher, homepage_url, last_verified_at)")
    .in("corpus_id", corpusIds)
    .not("src_number", "is", null)

  if (itemsError) {
    throw new Error(`Failed to query source_corpus_items: ${itemsError.message}`)
  }

  const resolution = new Map<number, ResolvedSource>()
  for (const item of (items ?? []) as unknown as SourceCorpusItemWithCatalog[]) {
    if (item.src_number === null || !item.source_catalog || !item.source_catalog.publisher) continue
    resolution.set(item.src_number, {
      srcId: item.src_number,
      publisher: item.source_catalog.publisher,
      url: item.source_catalog.homepage_url,
      tier: item.tier !== null ? Number(item.tier) : null,
      attests: item.atteste,
      consultedAt: item.source_catalog.last_verified_at,
    })
  }
  return resolution
}
