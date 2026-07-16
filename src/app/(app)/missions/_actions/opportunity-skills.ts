"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { SkillImportance } from "@/types/database-domain"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getSkillsCatalog } from "@/lib/reference-data/get-skills-catalog"

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

export interface SkillPickerItem {
  id: string
  name: string
  category: string | null
}

export async function getAllSkillsForPicker(): Promise<SkillPickerItem[]> {
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) return []
  const skills = await getSkillsCatalog(workspaceId)
  return skills.map(({ id, name, category }) => ({ id, name, category }))
}

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

  // 1. Rechercher la compétence dans le référentiel skills (recherche insensible à la casse)
  let skillId: string
  const { data: existingSkill, error: skillFindError } = await supabase
    .from("skills")
    .select("id")
    .ilike("name", name)
    .maybeSingle()

  if (skillFindError) {
    console.error("Erreur lors de la recherche de compétence :", skillFindError)
  }

  if (existingSkill) {
    skillId = existingSkill.id
  } else {
    // Créer la compétence dans le référentiel
    const { data: newSkill, error: skillCreateError } = await supabase
      .from("skills")
      .insert({ name })
      .select("id")
      .single()

    if (skillCreateError) {
      console.error("Erreur de création de compétence :", skillCreateError)
      return { error: `Création de compétence impossible : ${skillCreateError.message}` }
    }
    skillId = newSkill.id
  }

  // 2. Insérer dans la table d'association opportunity_skills
  const { error } = await supabase
    .from("opportunity_skills")
    .insert({
      opportunity_id: input.opportunity_id,
      skill_id: skillId,
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

  // 1. Rechercher ou créer la compétence correspondante
  let skillId: string
  const { data: existingSkill, error: skillFindError } = await supabase
    .from("skills")
    .select("id")
    .ilike("name", name)
    .maybeSingle()

  if (skillFindError) {
    console.error("Erreur lors de la recherche de compétence :", skillFindError)
  }

  if (existingSkill) {
    skillId = existingSkill.id
  } else {
    // Créer la compétence
    const { data: newSkill, error: skillCreateError } = await supabase
      .from("skills")
      .insert({ name })
      .select("id")
      .single()

    if (skillCreateError) {
      console.error("Erreur de création de compétence :", skillCreateError)
      return { error: `Création de compétence impossible : ${skillCreateError.message}` }
    }
    skillId = newSkill.id
  }

  // 2. Mettre à jour dans la table opportunity_skills
  const { error } = await supabase
    .from("opportunity_skills")
    .update({
      skill_id: skillId,
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
    .from("opportunity_skills")
    .delete()
    .eq("id", input.id)

  if (error) {
    console.error("Erreur lors de la suppression de la compétence :", error)
    return { error: `Suppression impossible : ${error.message}` }
  }

  revalidatePath("/missions/opps")
  return { success: true }
}
