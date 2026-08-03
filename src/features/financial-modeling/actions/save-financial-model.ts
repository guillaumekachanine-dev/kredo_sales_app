"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import { calculateFinancialModel } from "../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../domain/financial-model.schema"
import { buildFinancialModelTitle } from "../domain/financial-modeling-launch-preset"
import { mapFormStateToDb } from "../persistence/map-financial-model-snapshot"
import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"

type SaveFinancialModelSnapshotArgs = Omit<
  Database["public"]["Functions"]["save_financial_model_snapshot"]["Args"],
  "p_model_id" | "p_expected_updated_at"
> & {
  /**
   * PostgreSQL accepts NULL for these optional identifiers, but the Supabase type
   * generator currently models them as required strings in TypeScript. Keep this
   * adapter local so the runtime payload still sends all four RPC keys explicitly.
   */
  p_model_id: string | null
  p_expected_updated_at: string | null
}

type DatabaseWithNullableSaveFinancialModelSnapshotArgs = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Omit<Database["public"]["Functions"], "save_financial_model_snapshot"> & {
      save_financial_model_snapshot: Omit<
        Database["public"]["Functions"]["save_financial_model_snapshot"],
        "Args"
      > & {
        Args: SaveFinancialModelSnapshotArgs
      }
    }
  }
}

function saveFinancialModelSnapshotRpc(
  supabase: SupabaseClient<Database>,
  args: SaveFinancialModelSnapshotArgs,
) {
  const typedSupabase =
    supabase as SupabaseClient<DatabaseWithNullableSaveFinancialModelSnapshotArgs>

  return typedSupabase.rpc("save_financial_model_snapshot", args)
}

function usesDefaultSimulationTitle(title: string): boolean {
  const normalizedTitle = title.trim().toLocaleLowerCase("fr-FR")

  return normalizedTitle === "nouvelle simulation"
    || normalizedTitle === "simulation mobile"
    || normalizedTitle.startsWith("simulation financière —")
}

async function resolveLinkedSimulationTitle(
  supabase: SupabaseClient<Database>,
  state: FinancialModelFormState,
): Promise<string> {
  if (
    !usesDefaultSimulationTitle(state.title)
    || !state.companyId
    || !state.opportunityId
    || !state.resourceLabel.trim()
  ) {
    return state.title
  }

  const [companyResult, opportunityResult] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", state.companyId)
      .maybeSingle(),
    supabase
      .from("opportunities")
      .select("title")
      .eq("id", state.opportunityId)
      .maybeSingle(),
  ])

  return buildFinancialModelTitle({
    companyName: companyResult.data?.name,
    consultantName: state.resourceLabel,
    opportunityTitle: opportunityResult.data?.title,
  }) ?? state.title
}

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

    // 3. Resolve the canonical linked title when the UI still uses a default title
    const supabase = await createClient()
    const stateWithResolvedTitle: FinancialModelFormState = {
      ...state,
      title: await resolveLinkedSimulationTitle(supabase, state),
    }

    // 4. Map to database snapshot structure
    const { model, expenses } = mapFormStateToDb(stateWithResolvedTitle, result)

    // 5. Save via transactional RPC
    const { data, error } = await saveFinancialModelSnapshotRpc(supabase, {
      p_model_id: state.id ?? null,
      p_expected_updated_at: state.expected_updated_at ?? null,
      p_model: model as Json,
      p_expenses: expenses as Json,
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

    // 6. Revalidate dashboards
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
