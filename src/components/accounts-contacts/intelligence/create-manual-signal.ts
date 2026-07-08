"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type CreateManualSignalInput = {
  companyId: string
  title: string
  summary: string
  url?: string
  excerpt?: string
  category?: string
  comment?: string
  detectedAt?: string
}

export async function createManualSignal(
  input: CreateManualSignalInput
): Promise<{ error: string | null; data: { id: string } | null }> {
  const supabase = await createClient()

  // 1. Get company's workspace_id to ensure proper tenant isolation
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("workspace_id")
    .eq("id", input.companyId)
    .single()

  if (companyError || !company) {
    return { error: "Compte introuvable ou accès refusé", data: null }
  }

  const workspaceId = company.workspace_id
  const sourceId = crypto.randomUUID()
  const signalId = crypto.randomUUID()

  // 2. Determine source attributes
  const isLinkedIn = !!input.url && input.url.toLowerCase().includes("linkedin.com")
  const sourceType = isLinkedIn ? "professional_profile" : "human_note"
  const sourceName = isLinkedIn ? "LinkedIn manuel" : "Note manuelle"
  const sourceKey = `manual-${sourceType}-${crypto.randomUUID()}`

  // 3. Create intelligence source
  const { error: sourceError } = await supabase
    .from("intelligence_sources")
    .insert({
      id: sourceId,
      workspace_id: workspaceId,
      source_type: sourceType,
      source_name: sourceName,
      source_url: input.url || null,
      evidence_excerpt: input.excerpt || null,
      reliability_score: 0.65,
      collection_method: "manual",
      source_key: sourceKey,
      technical_metadata: {
        comment: input.comment || null,
        created_manually: true,
      },
    })

  if (sourceError) {
    return { error: `Erreur d'insertion de la source : ${sourceError.message}`, data: null }
  }

  // 4. Create account signal
  const dedupeKey = `manual-signal-${crypto.randomUUID()}`
  const signalCategory = input.category || "growth"
  const signalType = isLinkedIn ? "linkedin_post" : "manual_note"

  const { error: signalError } = await supabase
    .from("account_signals")
    .insert({
      id: signalId,
      workspace_id: workspaceId,
      company_id: input.companyId,
      title: input.title.trim(),
      summary: input.summary.trim() || null,
      status: "needs_review",
      detected_at: input.detectedAt || new Date().toISOString(),
      global_score: 0.5,
      urgency_score: 0.5,
      confidence_score: 0.6,
      relevance_score: 0.5,
      potential_value_score: 0.5,
      primary_source_id: sourceId,
      dedupe_key: dedupeKey,
      signal_category: signalCategory,
      signal_type: signalType,
      recommended_action: input.comment || null,
      score_justification: "Création manuelle",
      scoring_rules_version: "1.0",
      taxonomy_version: "1.0",
    })

  if (signalError) {
    // Attempt rollback of source on failure
    await supabase.from("intelligence_sources").delete().eq("id", sourceId)
    return { error: `Erreur d'insertion du signal : ${signalError.message}`, data: null }
  }

  // 5. Create source link reference
  const { error: linkError } = await supabase
    .from("intelligence_source_links")
    .insert({
      workspace_id: workspaceId,
      source_id: sourceId,
      object_id: signalId,
      object_type: "signal",
      link_role: "supporting",
    })

  if (linkError) {
    console.error("Warning: intelligence_source_links insert failed:", linkError.message)
    // Non-blocking, keep signal & source
  }

  revalidatePath(`/prospection/accounts/${input.companyId}`)
  return { error: null, data: { id: signalId } }
}
