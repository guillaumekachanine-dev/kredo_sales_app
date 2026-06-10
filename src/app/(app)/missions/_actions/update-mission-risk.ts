"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateMissionRisk(
  missionId: string,
  riskLevel: "faible" | "modere" | "critique",
  riskDescription: string
) {
  if (!missionId) {
    return { error: "Identifiant de mission manquant." }
  }

  try {
    const supabase = await createClient()

    // 1. Récupération des metadata actuelles
    const { data: mission, error: getError } = await supabase
      .from("missions")
      .select("metadata")
      .eq("id", missionId)
      .maybeSingle()

    if (getError) {
      return { error: `Erreur de récupération : ${getError.message}` }
    }
    if (!mission) {
      return { error: "Mission introuvable." }
    }

    const currentMetadata = (mission.metadata || {}) as Record<string, unknown>
    const updatedMetadata = {
      ...currentMetadata,
      risk_level: riskLevel,
      risk_description: riskDescription,
    }

    // 2. Mise à jour de la table missions
    const { error: updateError } = await supabase
      .from("missions")
      .update({
        metadata: updatedMetadata,
      })
      .eq("id", missionId)

    if (updateError) {
      return { error: `Erreur de mise à jour : ${updateError.message}` }
    }

    // Revalidation des chemins Next.js
    revalidatePath("/missions")
    revalidatePath("/missions/actives")
    
    return { success: true }
  } catch (err) {
    console.error("Erreur non gérée dans updateMissionRisk:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
