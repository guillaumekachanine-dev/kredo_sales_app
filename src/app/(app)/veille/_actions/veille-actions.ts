"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/database"

export interface UpdateVeilleArticleInput {
  titre_fr?: string
  categorie?: string
  resume?: string
  tags?: string[]
  secteur_principal?: string
  action_commerciale?: string
  analyse_kredo?: string
}

export async function updateVeilleArticleAction(
  id: string,
  input: UpdateVeilleArticleInput
) {
  if (!id) return { error: "Identifiant du signal manquant." }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "Non authentifié. Veuillez vous reconnecter." }
    }

    const updateData: Database["public"]["Tables"]["veille_articles"]["Update"] = {}
    if (input.titre_fr !== undefined) updateData.titre_fr = input.titre_fr.trim()
    if (input.categorie !== undefined) updateData.categorie = input.categorie.trim()
    if (input.resume !== undefined) updateData.resume = input.resume.trim()
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.secteur_principal !== undefined) updateData.secteur_principal = input.secteur_principal.trim()
    if (input.action_commerciale !== undefined) updateData.action_commerciale = input.action_commerciale.trim()
    if (input.analyse_kredo !== undefined) updateData.analyse_kredo = input.analyse_kredo.trim()

    const { error } = await supabase
      .from("veille_articles")
      .update(updateData)
      .eq("id", id)

    if (error) {
      console.error("Erreur mise à jour veille article:", error)
      return { error: error.message }
    }

    revalidatePath("/veille")
    return { success: true }
  } catch (err: any) {
    console.error("Erreur serveur mise à jour veille article:", err)
    return { error: err.message || "Une erreur inattendue est survenue." }
  }
}
