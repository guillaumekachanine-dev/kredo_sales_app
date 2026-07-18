"use server"

import { revalidatePath } from "next/cache"
import { updateAccountSignalStatus } from "./update-account-signal-status"

export async function validateAccountSignal(signalId: string): Promise<{ error: string | null }> {
  // `qualified` est le statut persistant de validation humaine déjà autorisé
  // par account_signals_status_check ; aucune évolution de schéma n'est requise.
  const result = await updateAccountSignalStatus(signalId, "qualified")
  if (result.error || !result.companyId) return { error: result.error ?? "Signal introuvable" }

  revalidatePath(`/prospection/accounts/${result.companyId}`)
  return { error: null }
}
