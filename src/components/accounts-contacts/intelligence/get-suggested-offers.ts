"use server"

import { createClient } from "@/lib/supabase/server"
import { getOffersCatalog } from "@/lib/reference-data/get-offers-catalog"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"

export type SuggestedOffer = {
  id: string
  name: string
  practiceName: string
  practiceSlug: string
  practiceColor: string
  practiceSortOrder: number
  shortDescription: string | null
}

export type SuggestedOffersResult = {
  offers: SuggestedOffer[]
  suggestedPracticeSlugs: string[]
  error: string | null
}

// ADR-0009 — alimente l'OfferPicker du formulaire de génération de pitch.
// Le matching cross-sell (get_pitch_context, p_offer_id=null) ne fait que
// suggérer — l'utilisateur choisit toujours librement parmi le catalogue complet.
export async function getSuggestedOffers(companyId: string): Promise<SuggestedOffersResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { offers: [], suggestedPracticeSlugs: [], error: "Non authentifié" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return { offers: [], suggestedPracticeSlugs: [], error: "Workspace introuvable" }
  }
  const workspaceId = profile.workspace_id

  // Référentiels quasi-statiques : mis en cache 1h par workspace (audit perf
  // Session 28). Le join offre↔practice se fait en JS via practice_id plutôt
  // que via un embed PostgREST, pour ne pas dupliquer les données de practice
  // dans chaque entrée de cache offers (cf. get-offers-catalog.ts).
  const [offersCatalog, practicesCatalog, contextResult] = await Promise.all([
    getOffersCatalog(workspaceId),
    getOfferPracticesCatalog(workspaceId),
    supabase.rpc("get_pitch_context", { p_workspace_id: workspaceId, p_company_id: companyId }),
  ])

  const practiceById = new Map(practicesCatalog.map((practice) => [practice.id, practice]))

  const offers: SuggestedOffer[] = [...offersCatalog]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => {
      const practice = row.practice_id ? practiceById.get(row.practice_id) : undefined
      return {
        id: row.id,
        name: row.name,
        practiceName: practice?.name ?? "",
        practiceSlug: practice?.slug ?? "",
        practiceColor: practice?.color_hex ?? "#2554B8",
        practiceSortOrder: practice?.sort_order ?? 99,
        shortDescription: row.short_description,
      }
    })

  const ctx = contextResult.data as { suggestedPractices?: { slug: string }[] } | null
  const suggestedPracticeSlugs = ctx?.suggestedPractices?.map((p) => p.slug) ?? []

  return { offers, suggestedPracticeSlugs, error: null }
}
