import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Returns the most recently saved model for a candidate on an opportunity.
 * Financial models are already linked to both records, so no additional
 * persistence layer is required for the Staffing entry point.
 */
export async function getFinancialModelForStaffing(
  opportunityId: string,
  candidateId: string,
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("financial_models")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("candidate_id", candidateId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read the staffing financial model: ${error.message}`)
  }

  return data?.id ?? null
}
