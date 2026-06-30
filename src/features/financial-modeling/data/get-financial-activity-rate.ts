import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"

type FinancialActivityRateRow = Tables<"v_financial_model_activity_rates">

export type FinancialActivityRateData = {
  row: FinancialActivityRateRow | null
  provenance: "v_financial_model_activity_rates" | null
  missingData: string[]
  isEstimate: boolean
  lot0InputMapping: {
    historicalActivityRate: number | null
  }
}

export async function getFinancialActivityRate(
  collaboratorId: string,
): Promise<FinancialActivityRateData> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("v_financial_model_activity_rates")
    .select("*")
    .eq("collaborator_id", collaboratorId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Failed to read financial activity rate for collaborator ${collaboratorId}: ${error.message}`,
    )
  }

  const missingData: string[] = []

  if (!data) {
    missingData.push("activity_rate_row")
  } else if (data.historical_activity_rate === null) {
    missingData.push("historical_activity_rate")
  }

  return {
    row: data,
    provenance: data ? "v_financial_model_activity_rates" : null,
    missingData,
    isEstimate: false,
    lot0InputMapping: {
      historicalActivityRate: data?.historical_activity_rate ?? null,
    },
  }
}
