"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  cadenceForWatchLevel,
  isAccountWatchLevel,
  normalizeAccountWatchSettings,
  type AccountWatchSettingsState,
} from "@/lib/intelligence/account-watch-settings"

type SaveAccountWatchSettingsInput = {
  isEnabled: boolean
  watchLevel: string
}

const SELECT_COLUMNS =
  "is_enabled,watch_level,cadence,last_run_at,next_run_at,last_status,last_error,updated_at"

export async function saveAccountWatchSettings(
  companyId: string,
  input: SaveAccountWatchSettingsInput,
): Promise<{ error: string | null; data: AccountWatchSettingsState | null }> {
  if (!companyId) return { error: "Compte introuvable", data: null }
  if (!isAccountWatchLevel(input.watchLevel)) {
    return { error: "Niveau de veille invalide", data: null }
  }

  const supabase = await createClient()
  const cadence = cadenceForWatchLevel(input.watchLevel)

  const { data: existing, error: existingError } = await supabase
    .from("account_watch_settings")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle()

  if (existingError) return { error: existingError.message, data: null }

  const mutation = existing
    ? supabase
        .from("account_watch_settings")
        .update({
          is_enabled: input.isEnabled,
          watch_level: input.watchLevel,
          cadence,
        })
        .eq("id", existing.id)
        .select(SELECT_COLUMNS)
        .maybeSingle()
    : supabase
        .from("account_watch_settings")
        .insert({
          company_id: companyId,
          is_enabled: input.isEnabled,
          watch_level: input.watchLevel,
          cadence,
        })
        .select(SELECT_COLUMNS)
        .maybeSingle()

  const { data, error } = await mutation

  if (error) return { error: error.message, data: null }
  if (!data) return { error: "Impossible d'enregistrer la veille du compte", data: null }

  revalidatePath(`/prospection/accounts/${companyId}`)
  return { error: null, data: normalizeAccountWatchSettings(data) }
}
