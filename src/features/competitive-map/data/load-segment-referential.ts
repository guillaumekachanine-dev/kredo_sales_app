import "server-only"

// ADR-0019 Lot 5 — référentiel des segments pour le wizard d'import (étape 1 :
// choix du segment cible). Même requête que `loadClassificationReferential()`
// dans AccountScanDialog.tsx (Lot 4) : un segment sans macro parent est
// inexploitable (unique clé fonctionnelle = slug, §9/§12.4 REFERENTIEL —
// jamais de création à la volée), donc filtré ici plutôt qu'affiché puis
// rejeté côté RPC.

import { createClient } from "@/lib/supabase/server"

export type CompetitiveMapSegmentOption = {
  slug: string
  name: string
  macroSlug: string
  macroName: string
}

export async function loadSegmentReferential(): Promise<CompetitiveMapSegmentOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sector_intelligence")
    .select("slug, name, parent:parent_id(slug, name)")
    .eq("level", "segment")
    .order("name")

  if (error || !data) return []

  return data.flatMap((row) => {
    const parent = row.parent as { slug: string; name: string } | { slug: string; name: string }[] | null
    const macro = Array.isArray(parent) ? parent[0] : parent
    return macro ? [{ slug: row.slug, name: row.name, macroSlug: macro.slug, macroName: macro.name }] : []
  })
}
