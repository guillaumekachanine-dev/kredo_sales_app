"use server"

import { createClient } from "@/lib/supabase/server"

export type SuggestedOffer = {
  id: string
  name: string
  practiceName: string
  practiceSlug: string
  shortDescription: string | null
}

export type SuggestedOffersResult = {
  offers: SuggestedOffer[]
  suggestedPracticeSlugs: string[]
  error: string | null
}

type OfferRow = {
  id: string
  name: string
  short_description: string | null
  offer_practices: { name: string; slug: string } | { name: string; slug: string }[] | null
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

  const [offersResult, contextResult] = await Promise.all([
    supabase
      .from("offers")
      .select("id,name,short_description,offer_practices(name,slug)")
      .eq("is_active", true)
      .order("name"),
    supabase.rpc("get_pitch_context", { p_workspace_id: workspaceId, p_company_id: companyId }),
  ])

  if (offersResult.error) {
    return { offers: [], suggestedPracticeSlugs: [], error: offersResult.error.message }
  }

  const offers: SuggestedOffer[] = ((offersResult.data ?? []) as OfferRow[]).map((row) => {
    const practice = Array.isArray(row.offer_practices) ? row.offer_practices[0] : row.offer_practices
    return {
      id: row.id,
      name: row.name,
      practiceName: practice?.name ?? "",
      practiceSlug: practice?.slug ?? "",
      shortDescription: row.short_description,
    }
  })

  const ctx = contextResult.data as { suggestedPractices?: { slug: string }[] } | null
  const suggestedPracticeSlugs = ctx?.suggestedPractices?.map((p) => p.slug) ?? []

  return { offers, suggestedPracticeSlugs, error: null }
}
