"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function promoteFinancialModelAction(modelId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("promote_financial_model_to_reference", {
      p_model_id: modelId,
    })

    if (error) {
      return { error: error.message || "Erreur lors de la promotion de la simulation." }
    }

    revalidatePath("/finance")
    revalidatePath("/reports")

    if (data && data.length > 0) {
      return {
        success: true,
        modelId: data[0].model_id,
        documentId: data[0].document_id,
      }
    }

    return { error: "La promotion a réussi mais aucun résumé n'a été retourné." }
  } catch (err: unknown) {
    console.error("Unhandled error in promoteFinancialModelAction:", err)
    const msg = err instanceof Error ? err.message : "Une erreur serveur inattendue est survenue."
    return { error: msg }
  }
}
