"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { RecruitmentStageKey } from "@/lib/recruitment/recruitment-stages"
import { getRecruitmentCanonicalStatus } from "@/lib/recruitment/recruitment-stages"

interface UpdateRecruitmentStatusInput {
  id: string
  stage: RecruitmentStageKey
}

export async function updateRecruitmentStatus({
  id,
  stage,
}: UpdateRecruitmentStatusInput) {
  const supabase = await createClient()
  const nextStatus = getRecruitmentCanonicalStatus(stage)
  const now = new Date().toISOString()

  const { data: current, error: currentError } = await supabase
    .from("opportunity_candidates")
    .select("status, proposed_at, sent_to_client_at")
    .eq("id", id)
    .maybeSingle()

  if (currentError) {
    console.error("[recruitment] Failed to load current status:", currentError)
    return { error: currentError.message }
  }

  if (!current) {
    return { error: "Positionnement introuvable." }
  }

  const REQUIRES_PROPOSED_AT = new Set([
    "propose_interne",
    "envoye_client",
    "entretien_planifie",
    "entretien_realise",
    "retenu",
    "refuse_client",
    "refuse_candidat",
  ])

  const updatePayload: {
    status: string
    status_changed_at: string
    proposed_at?: string
    sent_to_client_at?: string
  } = {
    status: nextStatus,
    status_changed_at: now,
  }

  if (REQUIRES_PROPOSED_AT.has(nextStatus) && !current.proposed_at) {
    updatePayload.proposed_at = now
  }

  if (
    nextStatus === "envoye_client" &&
    current.status !== "envoye_client" &&
    !current.sent_to_client_at
  ) {
    updatePayload.sent_to_client_at = now
  }

  const { error } = await supabase
    .from("opportunity_candidates")
    .update(updatePayload)
    .eq("id", id)

  if (error) {
    console.error("[recruitment] Failed to update positioning status:", error)
    return { error: error.message }
  }

  revalidatePath("/recruitment")
  revalidatePath("/staffing")
  revalidatePath("/missions/opps")

  return { success: true }
}
