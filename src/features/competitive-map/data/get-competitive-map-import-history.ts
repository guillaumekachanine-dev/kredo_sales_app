"use server"

import "server-only"

// Gestion des sources — Lot 6 · lecture de l'historique des imports de
// cartographie, archivés dans `intelligence_documents` (document_type =
// 'competitive_map_import', migration 080). Deux loaders délibérément
// séparés : la liste ne lit jamais `current_content_json` (qui peut porter
// le JSON source complet, jusqu'à 400 Ko) pour ne pas charger cinq gros
// blobs juste pour afficher 5 lignes de date + secteur.

import { createClient } from "@/lib/supabase/server"
import {
  isCompetitiveMapImportReportContent,
  type CompetitiveMapImportReportContent,
} from "../domain/competitive-map-import-report"

export type CompetitiveMapImportHistoryItem = {
  documentId: string
  createdAt: string
  sectorName: string
  segmentSlug: string
}

type ScopeJson = { sectorName?: unknown; segmentSlug?: unknown } | null

export async function getCompetitiveMapImportHistory(): Promise<CompetitiveMapImportHistoryItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id, created_at, scope_json")
    .eq("document_type", "competitive_map_import")
    .order("created_at", { ascending: false })
    .limit(5)

  if (error || !data) return []

  return data.flatMap((row): CompetitiveMapImportHistoryItem[] => {
    const scope = row.scope_json as ScopeJson
    const sectorName = typeof scope?.sectorName === "string" ? scope.sectorName : null
    // Une ligne sans secteur exploitable est un document corrompu ou écrit
    // hors de ce pipeline : on l'ignore plutôt que d'afficher un blanc.
    if (!sectorName) return []
    return [
      {
        documentId: row.id,
        createdAt: row.created_at,
        sectorName,
        segmentSlug: typeof scope?.segmentSlug === "string" ? scope.segmentSlug : "",
      },
    ]
  })
}

export async function getCompetitiveMapImportDetail(
  documentId: string,
): Promise<CompetitiveMapImportReportContent | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("current_content_json")
    .eq("id", documentId)
    .eq("document_type", "competitive_map_import")
    .maybeSingle()

  if (error || !data) return null

  return isCompetitiveMapImportReportContent(data.current_content_json) ? data.current_content_json : null
}
