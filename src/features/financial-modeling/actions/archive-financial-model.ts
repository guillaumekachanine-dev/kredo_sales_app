"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function archiveFinancialModelAction(id: string) {
  if (!id) {
    return { error: "Identifiant de simulation manquant." }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("archive_financial_model", {
      p_model_id: id,
    })

    if (error) {
      if (error.code === "LOCKED" || error.message?.includes("convertie")) {
        return { error: "Impossible d'archiver une simulation déjà convertie en mission." }
      }
      return { error: error.message || "Erreur lors de l'archivage." }
    }

    revalidatePath("/finance")

    if (data && data.length > 0) {
      return {
        success: true,
        id: data[0].id,
        status: data[0].status,
        updated_at: data[0].updated_at,
      }
    }

    return { success: true }
  } catch (err: unknown) {
    console.error("Unhandled error in archiveFinancialModelAction:", err)
    const msg = err instanceof Error ? err.message : "Une erreur serveur inattendue est survenue."
    return { error: msg }
  }
}
