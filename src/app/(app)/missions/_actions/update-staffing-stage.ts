"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface UpdateStaffingStageInput {
  positioningId: string
  status: string
}

export async function updateStaffingStage(input: UpdateStaffingStageInput) {
  if (!input.positioningId) {
    return { error: "Identifiant du positionnement requis." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase
    .from("opportunity_candidates")
    .update({
      status: input.status,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", input.positioningId)

  if (error) {
    console.error("Erreur lors de la mise à jour du positionnement :", error)
    return { error: `Mise à jour impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  revalidatePath("/missions")
  revalidatePath("/staffing")

  return { success: true }
}
