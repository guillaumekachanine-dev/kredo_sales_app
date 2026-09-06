"use server"

import "server-only"

// Lot 4 — résolution en LECTURE SEULE d'un import de corpus E3 : le segment
// cible (`meta.segment_slug` -> `sector_intelligence.level='segment'`) et les
// sources déjà cataloguées (dédoublonnage par hostname). Aucune écriture ici :
// le wizard affiche ce résultat avant que l'utilisateur ne confirme quoi que
// ce soit via `ingestSourceCorpusAction` (étape 3).
//
// Patron identique à `resolve-competitive-map-entries.ts` (ADR-0019 Lot 5) :
// `"use server"` + `import "server-only"`, appelé directement depuis le
// composant client du wizard comme une Server Action de lecture.

import { createClient } from "@/lib/supabase/server"
import { normalizeHostname, type SourceOrigin } from "../domain/source-management-contracts"
import {
  buildThematicSourceItemPreview,
  type ParsedThematicSourceList,
  type ThematicSourceItemPreview,
} from "../domain/thematic-source-list"
import {
  buildSourceCorpusItemPreview,
  type ExistingSourceMatch,
  type ParsedSourceRegistry,
  type SourceCorpusItemPreview,
} from "../domain/source-registry-output"

export type SegmentResolution =
  | { ok: true; sectorId: string; sectorName: string; macroName: string | null }
  | { ok: false; error: string }

export async function resolveImportSegment(segmentSlug: string): Promise<SegmentResolution> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: "Non authentifié." }

  const { data: row, error } = await supabase
    .from("sector_intelligence")
    .select("id, name, level, parent_id")
    .eq("slug", segmentSlug)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  // RLS restreint déjà au workspace courant : un slug d'un autre workspace,
  // ou inconnu, ne remonte simplement aucune ligne — même traitement, même message.
  if (!row) return { ok: false, error: `Segment « ${segmentSlug} » introuvable dans ce workspace.` }
  if (row.level !== "segment") {
    return {
      ok: false,
      error: `« ${segmentSlug} » est un secteur macro, pas un segment — un corpus se rattache toujours à un segment (jamais à un macro).`,
    }
  }

  let macroName: string | null = null
  if (row.parent_id) {
    const { data: macro } = await supabase.from("sector_intelligence").select("name").eq("id", row.parent_id).maybeSingle()
    macroName = macro?.name ?? null
  }

  return { ok: true, sectorId: row.id, sectorName: row.name, macroName }
}

type CatalogLookupRow = { id: string; source_key: string; origin: SourceOrigin; is_locked: boolean; name: string }
type CatalogRowWithDomains = CatalogLookupRow & { domain: string | null; search_domain: string | null }

/**
 * Index hostname -> ligne de catalogue, partage par les deux chemins d'import
 * (E3 sectoriel et liste thematique). Un domaine peut apparaitre en `domain` sur
 * une ligne et en `search_domain` sur une autre (rare) : on indexe les deux
 * colonnes, la premiere ecriture gagne.
 * Prive au module : un fichier `"use server"` n'exporte que des fonctions async.
 */
function indexCatalogByHostname(rows: CatalogRowWithDomains[] | null): Map<string, CatalogLookupRow> {
  const byHostname = new Map<string, CatalogLookupRow>()
  for (const row of rows ?? []) {
    for (const raw of [row.domain, row.search_domain]) {
      if (!raw) continue
      const normalized = normalizeHostname(raw) ?? raw.trim().toLowerCase()
      if (!byHostname.has(normalized)) byHostname.set(normalized, row)
    }
  }
  return byHostname
}

export type SourceCorpusImportResolution = {
  error: string | null
  segment: SegmentResolution
  items: SourceCorpusItemPreview[]
}

export type ThematicSourceListImportResolution = {
  error: string | null
  items: ThematicSourceItemPreview[]
}

/**
 * Lot 1 ADR-0022 — pendant thématique de `resolveSourceCorpusImport`.
 *
 * Même dédoublonnage par hostname, même lecture seule, mais AUCUNE résolution de
 * segment : un corpus thématique n'en a pas. C'est ici que les deux formats
 * d'entrée convergent — pas dans le parseur, qui reste propre à chaque contrat.
 */
export async function resolveThematicSourceListImport(
  parsed: ParsedThematicSourceList,
): Promise<ThematicSourceListImportResolution> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié.", items: [] }

  const { data: catalogRows, error: catalogError } = await supabase
    .from("source_catalog")
    .select("id, source_key, origin, is_locked, name, domain, search_domain")

  if (catalogError) return { error: catalogError.message, items: [] }

  const byHostname = indexCatalogByHostname(catalogRows)

  const items = parsed.sources.map((source) => {
    const matchRow = byHostname.get(source.searchDomain) ?? null
    const existingMatch = matchRow
      ? {
          id: matchRow.id,
          sourceKey: matchRow.source_key,
          origin: matchRow.origin,
          isLocked: matchRow.is_locked,
          name: matchRow.name,
        }
      : null

    return buildThematicSourceItemPreview(source, { corpusName: parsed.name, existingMatch })
  })

  return { error: null, items }
}

export async function resolveSourceCorpusImport(parsed: ParsedSourceRegistry): Promise<SourceCorpusImportResolution> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié.", segment: { ok: false, error: "Non authentifié." }, items: [] }
  }

  const segment = await resolveImportSegment(parsed.meta.segmentSlug)

  const { data: catalogRows, error: catalogError } = await supabase
    .from("source_catalog")
    .select("id, source_key, origin, is_locked, name, domain, search_domain")

  if (catalogError) {
    return { error: catalogError.message, segment, items: [] }
  }

  const byHostname = indexCatalogByHostname(catalogRows)

  const items: SourceCorpusItemPreview[] = parsed.sources.map((source) => {
    const normalizedDomain = source.domain ? normalizeHostname(source.domain) : null
    const normalizedSearchDomain = normalizeHostname(source.searchDomain) ?? source.searchDomain.trim().toLowerCase()

    const matchRow =
      (normalizedDomain ? byHostname.get(normalizedDomain) : undefined) ?? byHostname.get(normalizedSearchDomain) ?? null

    const existingMatch: ExistingSourceMatch | null = matchRow
      ? { id: matchRow.id, sourceKey: matchRow.source_key, origin: matchRow.origin, isLocked: matchRow.is_locked, name: matchRow.name }
      : null

    return buildSourceCorpusItemPreview(source, {
      secteur: parsed.meta.secteur,
      normalizedDomain,
      normalizedSearchDomain,
      existingMatch,
    })
  })

  return { error: null, segment, items }
}
