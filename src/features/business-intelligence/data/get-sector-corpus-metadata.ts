import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { CorpusQualityVerdict } from "@/features/source-management/domain/source-management-contracts"
import type { CorpusConfidenceGap } from "../shared/CorpusConfidenceBanner"

export type SectorCorpusMetadata = {
  qualityVerdict: CorpusQualityVerdict
  activationState: "draft" | "active"
  snapshotDate: string | null
  gaps: CorpusConfidenceGap[]
}

type RawGap = {
  motif?: string
  rubrique?: string
  famille?: string
  recherche_effectuee?: string
}

function parseGaps(rawGaps: unknown): CorpusConfidenceGap[] {
  if (!Array.isArray(rawGaps)) return []
  return rawGaps
    .map((gap): CorpusConfidenceGap | null => {
      if (!gap || typeof gap !== "object") return null
      const record = gap as RawGap
      const motif =
        typeof record.motif === "string" && record.motif.trim().length > 0
          ? record.motif.trim()
          : typeof record.recherche_effectuee === "string"
            ? record.recherche_effectuee.trim()
            : ""
      const famille =
        typeof record.famille === "string" && record.famille.trim().length > 0
          ? record.famille.trim()
          : typeof record.rubrique === "string"
            ? record.rubrique.trim()
            : null

      if (!motif && !famille) return null
      return { motif: motif || "Information non disponible", famille }
    })
    .filter((g): g is CorpusConfidenceGap => g !== null)
}

export async function getSectorCorpusMetadata(
  sectorId: string,
  options?: { supabase?: SupabaseClient<Database> },
): Promise<SectorCorpusMetadata | null> {
  const supabase = options?.supabase ?? (await createClient())

  const { data: corpus, error } = await supabase
    .from("source_corpora")
    .select("quality_verdict, activation_state, snapshot_date, gaps")
    .eq("sector_id", sectorId)
    .eq("is_current", true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query source_corpora metadata: ${error.message}`)
  }

  if (!corpus) return null

  const qualityVerdict = (corpus.quality_verdict ?? "usable_with_caveats") as CorpusQualityVerdict
  const activationState = (corpus.activation_state ?? "active") as "draft" | "active"
  const snapshotDate = corpus.snapshot_date ?? null
  const gaps = parseGaps(corpus.gaps)

  return {
    qualityVerdict,
    activationState,
    snapshotDate,
    gaps,
  }
}
