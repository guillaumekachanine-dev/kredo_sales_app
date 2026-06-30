"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { calculateFinancialModel } from "../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../domain/financial-model.schema"
import { mapFormStateToDb } from "../persistence/map-financial-model-snapshot"
import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"
import type { Json } from "@/types/database.types"

export async function saveFinancialModelAction(state: FinancialModelFormState) {
  try {
    // 1. Validate input
    const issues = validateFinancialModelInput(state.input)
    if (issues.length > 0) {
      return {
        error: `Données de simulation non calculables : ${issues.map((i) => i.message).join(" · ")}`,
      }
    }

    // 2. Perform server-side calculation
    const result = calculateFinancialModel(state.input)

    // 3. Map to database snapshot structure
    const { model, expenses } = mapFormStateToDb(state, result)

    // 4. Save via transactional RPC
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("save_financial_model_snapshot", {
      p_model_id: (state.id || undefined) as unknown as string,
      p_expected_updated_at: (state.expected_updated_at || undefined) as unknown as string,
      p_model: model as unknown as Json,
      p_expenses: expenses as unknown as Json,
    })

    if (error) {
      // Return business/optimistic conflict messages clearly
      if (error.code === "LOCKED" || error.message?.includes("verrouillé")) {
        return { error: "Cette simulation est verrouillée et ne peut plus être modifiée." }
      }
      if (error.code === "VERSION_CONFLICT" || error.message?.includes("Conflit de mise à jour")) {
        return { error: "Conflit de version : cette simulation a été modifiée par un autre utilisateur." }
      }
      return { error: error.message || "Erreur lors de la sauvegarde." }
    }

    // 5. Revalidate dashboards
    revalidatePath("/finance")

    if (data && data.length > 0) {
      return {
        success: true,
        id: data[0].id,
        status: data[0].status,
        updated_at: data[0].updated_at,
      }
    }

    return { error: "La sauvegarde a réussi mais aucun résumé n'a été retourné." }
  } catch (err: unknown) {
    console.error("Unhandled error in saveFinancialModelAction:", err)
    const msg = err instanceof Error ? err.message : "Une erreur serveur inattendue est survenue."
    return { error: msg }
  }
}
