"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/**
 * Dismisses a specific account signal by setting its status to 'dismissed'.
 * Revalidates the account details page afterwards.
 */
export async function dismissAccountSignal(
  signalId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: row, error: updateError } = await supabase
    .from("account_signals")
    .update({ status: "dismissed" })
    .eq("id", signalId)
    .select("company_id")
    .maybeSingle()

  if (updateError) return { error: updateError.message }
  if (!row) return { error: "Signal introuvable" }

  revalidatePath(`/prospection/accounts/${row.company_id}`)
  return { error: null }
}
