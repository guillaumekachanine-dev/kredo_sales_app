"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Json, SalesStage, SalesOutcome, SalesPriority, OpportunityUpdate } from "@/types/database"

export interface UpdateOpportunityInput {
  id: string
  title?: string
  account_id?: string | null
  need_summary?: string | null
  need_detail?: string | null
  client_context?: string | null
  engagement_notes?: string | null
  stage?: SalesStage
  outcome?: SalesOutcome | null
  priority?: SalesPriority
  conviction?: number
  target_daily_rate?: number | null
  estimated_gain?: number | null
  target_close_date?: string | null
  start_date?: string | null
  duration?: number | null
  practice?: string | null
  opportunity_type?: string | null
  source?: string | null
  location?: string | null
  remote_policy?: string | null
  seniority?: string | null
  next_action_label?: string | null
  next_action_at?: string | null
  win_reason?: string | null
  loss_reason?: string | null
}

export type UpdateOpportunityResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

function isJsonRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function updateOpportunity(
  input: UpdateOpportunityInput
): Promise<UpdateOpportunityResult> {
  if (!input.id || input.id.trim() === "") {
    return { error: "L'identifiant de l'opportunité est requis." }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const updatePayload: OpportunityUpdate = {}

  // Helper pour normaliser les chaînes de caractères vides en null
  const normalizeText = (val: string | null | undefined): string | null => {
    if (val === undefined) return null
    if (val === null || val.trim() === "") return null
    return val.trim()
  }

  if (input.title !== undefined) {
    const trimmedTitle = input.title.trim()
    if (trimmedTitle === "") {
      return { error: "Le titre de l'opportunité ne peut pas être vide." }
    }
    updatePayload.title = trimmedTitle
  }

  if (input.account_id !== undefined) updatePayload.company_id = input.account_id
  if (input.need_summary !== undefined) updatePayload.need_summary = normalizeText(input.need_summary)

  // Gérer la fusion dans la colonne JSONB `context`
  const { data: currentOpp, error: selectContextError } = await supabase
    .from("opportunities")
    .select("context")
    .eq("id", input.id)
    .maybeSingle()

  if (selectContextError) {
    console.error("Erreur lors de la récupération du contexte actuel :", selectContextError)
  }

  const currentContext = isJsonRecord(currentOpp?.context) ? currentOpp.context : {}
  const newContext: Record<string, Json | undefined> = { ...currentContext }
  let hasContextChange = false

  if (input.need_detail !== undefined) {
    newContext.need_detail = normalizeText(input.need_detail)
    hasContextChange = true
  }
  if (input.client_context !== undefined) {
    newContext.client_context = normalizeText(input.client_context)
    hasContextChange = true
  }
  if (input.engagement_notes !== undefined) {
    newContext.engagement_notes = normalizeText(input.engagement_notes)
    hasContextChange = true
  }

  if (hasContextChange) {
    updatePayload.context = newContext
  }

  let targetStage = input.stage
  if (input.outcome === "gagnee") {
    targetStage = "gagne"
  } else if (input.outcome === "perdue") {
    targetStage = "perdu"
  } else if (input.outcome === "abandonnee") {
    targetStage = "abandonne"
  } else if (input.outcome === "non_traitee") {
    targetStage = "non_traitee"
  } else if (input.outcome === null) {
    if (targetStage === "gagne" || targetStage === "perdu" || targetStage === "abandonne" || targetStage === "non_traitee" || !targetStage) {
      const { data: currentOpp } = await supabase
        .from("opportunities")
        .select("stage")
        .eq("id", input.id)
        .maybeSingle()
      const currentStage = currentOpp?.stage as SalesStage | undefined
      if (currentStage && currentStage !== "gagne" && currentStage !== "perdu" && currentStage !== "abandonne" && currentStage !== "non_traitee") {
        targetStage = currentStage
      } else {
        targetStage = "qualification"
      }
    }
  }

  if (targetStage !== undefined) updatePayload.stage = targetStage
  if (input.priority !== undefined) updatePayload.priority = input.priority

  if (input.conviction !== undefined) {
    if (typeof input.conviction !== "number" || isNaN(input.conviction) || input.conviction < 0 || input.conviction > 100) {
      return { error: "Le niveau de confiance doit être compris entre 0 et 100." }
    }
    updatePayload.conviction = input.conviction
  }

  if (input.target_daily_rate !== undefined) {
    const rate = input.target_daily_rate
    if (rate !== null) {
      if (typeof rate !== "number" || isNaN(rate) || rate < 0) {
        return { error: "Le TJM cible doit être supérieur ou égal à 0." }
      }
    }
    updatePayload.target_daily_rate = rate
  }

  if (input.estimated_gain !== undefined) {
    const gain = input.estimated_gain
    if (gain !== null) {
      if (typeof gain !== "number" || isNaN(gain) || gain < 0) {
        return { error: "Le gain estimé doit être supérieur ou égal à 0." }
      }
    }
    updatePayload.estimated_gain = gain
  }

  if (input.target_close_date !== undefined) {
    updatePayload.target_close_date = normalizeText(input.target_close_date)
  }
  if (input.start_date !== undefined) {
    updatePayload.start_date = normalizeText(input.start_date)
  }

  if (input.duration !== undefined) {
    const dur = input.duration
    if (dur !== null) {
      if (typeof dur !== "number" || isNaN(dur) || dur <= 0) {
        return { error: "La durée doit être supérieure à 0 jours." }
      }
    }
    updatePayload.duration_days = dur
  }

  if (input.practice !== undefined) updatePayload.practice = normalizeText(input.practice)
  if (input.opportunity_type !== undefined) updatePayload.opportunity_type = normalizeText(input.opportunity_type)
  if (input.source !== undefined) updatePayload.source = normalizeText(input.source)
  if (input.location !== undefined) updatePayload.location = normalizeText(input.location)
  if (input.remote_policy !== undefined) updatePayload.remote_policy = normalizeText(input.remote_policy)
  if (input.seniority !== undefined) updatePayload.seniority = normalizeText(input.seniority)
  if (input.next_action_label !== undefined) updatePayload.next_action_label = normalizeText(input.next_action_label)
  if (input.next_action_at !== undefined) updatePayload.next_action_at = normalizeText(input.next_action_at)
  if (input.win_reason !== undefined) updatePayload.win_reason = normalizeText(input.win_reason)
  if (input.loss_reason !== undefined) updatePayload.loss_reason = normalizeText(input.loss_reason)

  const STAGE_LABELS_LOCAL: Record<string, string> = {
    qualification: "Qualification",
    recherche_profil: "Recherche profils",
    cv_envoyes: "CV envoyés",
    entretien_client: "Entretien client",
    gagne: "Gagné",
    perdu: "Perdu",
    abandonne: "Abandonné",
    non_traitee: "Non traitée",
  }

  let oldStage: SalesStage | null = null
  const stageChanged = targetStage !== undefined

  if (stageChanged) {
    const { data: currentOpp } = await supabase
      .from("opportunities")
      .select("stage")
      .eq("id", input.id)
      .maybeSingle()
    if (currentOpp) {
      oldStage = currentOpp.stage as SalesStage
    }
  }

  // La structure OpportunityUpdate possède les champs système en lecture seule mais nous ne devons PAS y toucher
  const cleanPayload = { ...updatePayload }
  delete cleanPayload.owner_id
  delete cleanPayload.created_at
  delete cleanPayload.updated_at
  delete cleanPayload.acv
  delete cleanPayload.weighted_gain

  const { error } = await supabase
    .from("opportunities")
    .update(cleanPayload)
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la mise à jour de l'opportunité :", error)
    return { error: `Mise à jour impossible : ${error.message}` }
  }

  // Si l'étape a changé, enregistrer un événement de changement d'étape
  if (stageChanged && oldStage !== null && oldStage !== targetStage) {
    const oldStageLabel = STAGE_LABELS_LOCAL[oldStage] || oldStage
    const newStageLabel = STAGE_LABELS_LOCAL[targetStage!] || targetStage!
    const { error: eventError } = await supabase
      .from("interactions")
      .insert({
        opportunity_id: input.id,
        type: "changement_etape",
        summary: `Étape mise à jour : ${oldStageLabel} → ${newStageLabel}`,
        occurred_at: new Date().toISOString(),
        details: {},
      })
    if (eventError) {
      console.error("Erreur lors de la création automatique de l'événement d'étape :", eventError)
    }
  }

  revalidatePath("/missions/opps")
  revalidatePath("/missions")
  revalidatePath("/missions/actives")

  return { success: true }
}
