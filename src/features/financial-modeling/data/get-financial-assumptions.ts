import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"

type FinancialAssumptionSetRow = Tables<"financial_assumption_sets">
type FinancialChargeRateRow = Tables<"financial_charge_rates">

export type FinancialAssumptionsData = {
  assumptionSet: FinancialAssumptionSetRow | null
  chargeRates: FinancialChargeRateRow[]
  provenance: {
    assumptionSet: "financial_assumption_sets" | null
    chargeRates: "financial_charge_rates" | null
  }
  missingData: string[]
  isEstimate: boolean
  lot0InputMapping: {
    currency: string | null
    countryCode: string | null
    defaultForecastActivityRate: number | null
    annualWorkingDays: number | null
    chargeRatesByEmploymentStatus: Record<
      string,
      {
        chargesRate: number
        source: string
        isEstimate: boolean
      }
    >
  }
}

export async function getFinancialAssumptions(): Promise<FinancialAssumptionsData> {
  const supabase = await createClient()

  const { data: assumptionSet, error: assumptionSetError } = await supabase
    .from("financial_assumption_sets")
    .select("*")
    .eq("is_default", true)
    .is("valid_to", null)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (assumptionSetError) {
    throw new Error(
      `Failed to read financial assumption sets: ${assumptionSetError.message}`,
    )
  }

  let chargeRates: FinancialChargeRateRow[] = []

  if (assumptionSet) {
    const { data: chargeRatesData, error: chargeRatesError } = await supabase
      .from("financial_charge_rates")
      .select("*")
      .eq("assumption_set_id", assumptionSet.id)
      .order("employment_status", { ascending: true })

    if (chargeRatesError) {
      throw new Error(
        `Failed to read financial charge rates: ${chargeRatesError.message}`,
      )
    }

    chargeRates = chargeRatesData ?? []
  }

  const missingData: string[] = []

  if (!assumptionSet) {
    missingData.push("default_assumption_set")
  }

  if (assumptionSet && chargeRates.length === 0) {
    missingData.push("charge_rates")
  }

  const chargeRatesByEmploymentStatus = Object.fromEntries(
    chargeRates.map((chargeRate) => [
      chargeRate.employment_status,
      {
        chargesRate: chargeRate.charges_rate,
        source: chargeRate.source,
        isEstimate: chargeRate.is_estimate,
      },
    ]),
  )

  return {
    assumptionSet,
    chargeRates,
    provenance: {
      assumptionSet: assumptionSet ? "financial_assumption_sets" : null,
      chargeRates: assumptionSet ? "financial_charge_rates" : null,
    },
    missingData,
    isEstimate: chargeRates.some((chargeRate) => chargeRate.is_estimate),
    lot0InputMapping: {
      currency: assumptionSet?.currency ?? null,
      countryCode: assumptionSet?.country_code ?? null,
      defaultForecastActivityRate: assumptionSet?.default_activity_rate ?? null,
      annualWorkingDays: assumptionSet?.default_working_days ?? null,
      chargeRatesByEmploymentStatus,
    },
  }
}
