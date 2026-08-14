"use server"

import { revalidatePath } from "next/cache"
import { updateAccountSignalStatus } from "./update-account-signal-status"

/**
 * Dismisses a specific account signal by setting its status to 'dismissed'.
 * Revalidates the account details page afterwards.
 */
export async function dismissAccountSignal(
  signalId: string,
): Promise<{ error: string | null }> {
  const result = await updateAccountSignalStatus(signalId, "dismissed")
  if (result.error || !result.companyId) return { error: result.error ?? "Signal introuvable" }

  revalidatePath(`/prospection/accounts/${result.companyId}`)
  revalidatePath("/veille")
  return { error: null }
}
