"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Json } from "@/types/database"

export interface UpdateMissionInput {
  id: string
  title?: string
  tjm?: number
  gross_margin_pct?: number | null
  start_date?: string | null
  end_date?: string | null
  risk_level?: "faible" | "modere" | "critique"
  practice?: string | null
  seniority?: string | null
  metadata?: Record<string, unknown>
}

export async function updateMission(input: UpdateMissionInput) {
  if (!input.id) {
    return { error: "Identifiant de mission manquant." }
  }

  try {
    const supabase = await createClient()

    // 1. Récupération de la mission actuelle pour fusionner les metadata
    const { data: mission, error: getError } = await supabase
      .from("missions")
      .select("tjm, cjm, metadata")
      .eq("id", input.id)
      .maybeSingle()

    if (getError) {
      return { error: `Erreur de récupération de la mission : ${getError.message}` }
    }
    if (!mission) {
      return { error: "Mission introuvable." }
    }

    const currentMetadata = (mission.metadata || {}) as Record<string, unknown>
    const updatedMetadata = { 
      ...currentMetadata,
      ...(input.metadata || {})
    }

    if (input.risk_level !== undefined) {
      updatedMetadata.risk_level = input.risk_level
    }

    const updatePayload: {
      metadata: Json
      title?: string
      tjm?: number
      cjm?: number
      start_date?: string | null
      end_date?: string | null
      practice?: string | null
      seniority?: string | null
    } = { metadata: updatedMetadata as Json }

    if (input.title !== undefined) updatePayload.title = input.title
    if (input.tjm !== undefined) updatePayload.tjm = input.tjm

    if (input.gross_margin_pct !== undefined) {
      const activeTjm = input.tjm !== undefined ? input.tjm : (mission.tjm || 0)
      if (input.gross_margin_pct === null) {
        updatePayload.cjm = activeTjm
      } else {
        updatePayload.cjm = Math.round(activeTjm * (1 - input.gross_margin_pct / 100))
      }
    }

    if (input.start_date !== undefined) updatePayload.start_date = input.start_date || null
    if (input.end_date !== undefined) updatePayload.end_date = input.end_date || null
    if (input.practice !== undefined) updatePayload.practice = input.practice || null
    if (input.seniority !== undefined) updatePayload.seniority = input.seniority || null

    const { error: updateError } = await supabase
      .from("missions")
      .update(updatePayload)
      .eq("id", input.id)

    if (updateError) {
      return { error: `Erreur de mise à jour : ${updateError.message}` }
    }

    // Revalidation des chemins
    revalidatePath("/missions")
    revalidatePath("/missions/actives")
    revalidatePath("/missions/opps")
    revalidatePath("/missions/planning")

    return { success: true }
  } catch (err) {
    console.error("Erreur non gérée dans updateMission:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
