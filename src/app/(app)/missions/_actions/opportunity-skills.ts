"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/database"

type SkillImportance = Database["public"]["Enums"]["sales_skill_importance"]

export interface AddSkillInput {
  opportunity_id: string
  skill_name: string
  importance: SkillImportance
  min_years: number | null
}

export interface UpdateSkillInput {
  id: string
  skill_name: string
  importance: SkillImportance
  min_years: number | null
}

export interface DeleteSkillInput {
  id: string
}

export type SkillActionResult =
  | { success: true; error?: never }
  | { success?: never; error: string }

export async function addOpportunitySkill(
  input: AddSkillInput
): Promise<SkillActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const name = input.skill_name.trim()
  if (!name) {
    return { error: "Le nom de la compétence est requis." }
  }

  const years = input.min_years !== null && !isNaN(input.min_years) && input.min_years >= 0
    ? input.min_years
    : null

  const { error } = await supabase
    .from("sales_opportunity_skills")
    .insert({
      opportunity_id: input.opportunity_id,
      skill_name: name,
      importance: input.importance || "souhaitee",
      min_years: years,
    })

  if (error) {
    console.error("Erreur lors de l'ajout de la compétence :", error)
    return { error: `Ajout impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}

export async function updateOpportunitySkill(
  input: UpdateSkillInput
): Promise<SkillActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const name = input.skill_name.trim()
  if (!name) {
    return { error: "Le nom de la compétence est requis." }
  }

  const years = input.min_years !== null && !isNaN(input.min_years) && input.min_years >= 0
    ? input.min_years
    : null

  const { error } = await supabase
    .from("sales_opportunity_skills")
    .update({
      skill_name: name,
      importance: input.importance || "souhaitee",
      min_years: years,
    })
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la modification de la compétence :", error)
    return { error: `Mise à jour impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}

export async function deleteOpportunitySkill(
  input: DeleteSkillInput
): Promise<SkillActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." }
  }

  const { error } = await supabase
    .from("sales_opportunity_skills")
    .delete()
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la suppression de la compétence :", error)
    return { error: `Suppression impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
