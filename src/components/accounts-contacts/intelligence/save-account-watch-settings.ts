"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  ACCOUNT_WATCH_CATEGORIES,
  cadenceForWatchLevel,
  isAccountWatchLevel,
  normalizeAccountWatchDetailedSettings,
  normalizeAccountWatchSettings,
  type AccountWatchCategory,
  type AccountWatchDetailedSettings,
  type AccountWatchSettingsState,
} from "@/lib/intelligence/account-watch-settings"
import type { Json } from "@/types/database"

type SaveAccountWatchSettingsInput = {
  isEnabled: boolean
  watchLevel: string
}

const SELECT_COLUMNS =
  "is_enabled,watch_level,cadence,last_run_at,next_run_at,last_status,last_error,updated_at"

const DETAILED_SELECT_COLUMNS = `${SELECT_COLUMNS},include_official_site,include_news,include_public_records,include_tenders,include_social_manual,include_jobs,include_sector_corpus,query_aliases,metadata`

export type SaveAccountWatchDetailedSettingsInput = {
  isEnabled: boolean
  watchLevel: string
  includeOfficialSite: boolean
  includeNews: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
  includeJobs: boolean
  queryAliases: string[]
  monitoredCategories: string[]
  notes: string
  depth: string
  manualSourceUrls: string[]
}

export async function loadAccountWatchDetailedSettings(
  companyId: string,
): Promise<{ error: string | null; data: AccountWatchDetailedSettings | null }> {
  if (!companyId) return { error: "Compte introuvable", data: null }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("account_watch_settings")
    .select(DETAILED_SELECT_COLUMNS)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) return { error: error.message, data: null }
  return { error: null, data: normalizeAccountWatchDetailedSettings(data) }
}

export async function saveAccountWatchDetailedSettings(
  companyId: string,
  input: SaveAccountWatchDetailedSettingsInput,
): Promise<{ error: string | null; data: AccountWatchDetailedSettings | null }> {
  if (!companyId) return { error: "Compte introuvable", data: null }
  if (!isAccountWatchLevel(input.watchLevel)) {
    return { error: "Niveau de veille invalide", data: null }
  }

  const allowedCategories = new Set<string>(
    ACCOUNT_WATCH_CATEGORIES.map((category) => category.value),
  )
  const monitoredCategories = Array.from(new Set(input.monitoredCategories))
    .filter((category): category is AccountWatchCategory => allowedCategories.has(category))
  const queryAliases = Array.from(new Set(input.queryAliases))
    .map((alias) => alias.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((alias) => alias.slice(0, 100))
  const notes = input.notes.trim().slice(0, 2_000)
  const depth = input.depth === "standard" || input.depth === "deep" ? input.depth : "balanced"
  const manualSourceUrls = Array.from(new Set(input.manualSourceUrls))
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 20)
    .map((url) => url.slice(0, 500))

  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("account_watch_settings")
    .select("id,metadata")
    .eq("company_id", companyId)
    .maybeSingle()

  if (existingError) return { error: existingError.message, data: null }

  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? existing.metadata
      : {}
  const metadata = {
    ...existingMetadata,
    monitored_categories: monitoredCategories,
    depth,
    manual_source_urls: manualSourceUrls,
    notes,
  } satisfies Json
  const values = {
    is_enabled: input.isEnabled,
    watch_level: input.watchLevel,
    cadence: cadenceForWatchLevel(input.watchLevel),
    include_official_site: input.includeOfficialSite,
    include_news: input.includeNews,
    include_public_records: input.includePublicRecords,
    include_tenders: input.includeTenders,
    include_social_manual: input.includeSocialManual,
    include_jobs: input.includeJobs,
    query_aliases: queryAliases,
    metadata,
  }

  const mutation = existing
    ? supabase
        .from("account_watch_settings")
        .update(values)
        .eq("id", existing.id)
        .select(DETAILED_SELECT_COLUMNS)
        .maybeSingle()
    : supabase
        .from("account_watch_settings")
        .insert({ company_id: companyId, ...values })
        .select(DETAILED_SELECT_COLUMNS)
        .maybeSingle()

  const { data, error } = await mutation
  if (error) return { error: error.message, data: null }
  if (!data) return { error: "Impossible d'enregistrer la veille du compte", data: null }

  revalidatePath(`/prospection/accounts/${companyId}`)
  revalidatePath("/veille")
  return { error: null, data: normalizeAccountWatchDetailedSettings(data) }
}

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
