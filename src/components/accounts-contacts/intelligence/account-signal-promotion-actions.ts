"use server"

import "server-only"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type AccountSignalPromotionDestination = "sector_signal" | "playbook"

export type AccountSignalPromotionOption = {
  id: string
  name: string
  isCompanySector: boolean
  hasPlaybook: boolean
}

type PromotionContext = {
  userId: string
  workspaceId: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createServiceClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function getPromotionContext(): Promise<
  | { data: PromotionContext; error: null }
  | { data: null; error: string }
> {
  const sessionClient = await createClient()
  const { data: authData, error: authError } = await sessionClient.auth.getUser()
  if (authError || !authData.user) return { data: null, error: "Non authentifié" }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", authData.user.id)
    .maybeSingle()

  if (profileError || !profile?.workspace_id) {
    return { data: null, error: "Accès au workspace refusé" }
  }

  return {
    data: { userId: authData.user.id, workspaceId: profile.workspace_id },
    error: null,
  }
}

function hasPlaybookContent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return Object.values(value).some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item))
}

export async function loadAccountSignalPromotionOptions(
  companyId: string,
): Promise<{
  options: AccountSignalPromotionOption[]
  companySectorId: string | null
  error: string | null
}> {
  if (!companyId) return { options: [], companySectorId: null, error: "Compte introuvable" }

  const context = await getPromotionContext()
  if (!context.data) return { options: [], companySectorId: null, error: context.error }

  const sessionClient = await createClient()
  const [{ data: company, error: companyError }, { data: sectors, error: sectorsError }] = await Promise.all([
    sessionClient
      .from("companies")
      .select("segment_id,sector_id")
      .eq("id", companyId)
      .eq("workspace_id", context.data.workspaceId)
      .maybeSingle(),
    sessionClient
      .from("v_sector_knowledge_resolved")
      .select("segment_id,segment_name,playbook")
      .eq("workspace_id", context.data.workspaceId)
      .order("segment_name", { ascending: true }),
  ])

  if (companyError || !company) {
    return { options: [], companySectorId: null, error: companyError?.message ?? "Compte introuvable" }
  }
  if (sectorsError) {
    return { options: [], companySectorId: null, error: sectorsError.message }
  }

  const companySectorId = company.segment_id ?? company.sector_id ?? null
  const options = (sectors ?? [])
    .filter((sector) => sector.segment_id && sector.segment_name)
    .map((sector) => ({
      id: sector.segment_id!,
      name: sector.segment_name!,
      isCompanySector: sector.segment_id === companySectorId,
      hasPlaybook: hasPlaybookContent(sector.playbook),
    }))

  return { options, companySectorId, error: null }
}

export async function promoteAccountSignal(
  signalId: string,
  destination: AccountSignalPromotionDestination,
  sectorId: string,
): Promise<{ success: boolean; duplicate?: boolean; error: string | null }> {
  if (!signalId || !sectorId) {
    return { success: false, error: "Signal ou destination introuvable" }
  }

  const context = await getPromotionContext()
  if (!context.data) return { success: false, error: context.error }

  const serviceClient = getServiceClient()
  if (!serviceClient) return { success: false, error: "Configuration Supabase incomplète" }

  const [{ data: signal, error: signalError }, { data: target, error: targetError }] = await Promise.all([
    serviceClient
      .from("account_signals")
      .select("id,workspace_id,company_id,signal_category,signal_type,title,summary,event_at,detected_at,relevance_score,urgency_score,primary_source_id,intelligence_sources(source_name,source_url)")
      .eq("id", signalId)
      .eq("workspace_id", context.data.workspaceId)
      .maybeSingle(),
    serviceClient
      .from("sector_intelligence")
      .select("id")
      .eq("id", sectorId)
      .eq("workspace_id", context.data.workspaceId)
      .maybeSingle(),
  ])

  if (signalError || !signal) {
    return { success: false, error: signalError?.message ?? "Signal introuvable" }
  }
  if (targetError || !target) {
    return { success: false, error: targetError?.message ?? "Destination sectorielle introuvable" }
  }

  if (destination === "playbook") {
    const { error } = await serviceClient
      .from("sector_playbook_signals")
      .insert({
        workspace_id: context.data.workspaceId,
        sector_id: sectorId,
        account_signal_id: signal.id,
        promoted_by: context.data.userId,
      })

    if (error?.code === "23505") {
      return { success: true, duplicate: true, error: null }
    }
    if (error) return { success: false, error: error.message }
  } else {
    const source = Array.isArray(signal.intelligence_sources)
      ? signal.intelligence_sources[0]
      : signal.intelligence_sources
    const { error } = await serviceClient
      .from("sector_news")
      .insert({
        workspace_id: context.data.workspaceId,
        sector_id: sectorId,
        source_account_signal_id: signal.id,
        title: signal.title,
        summary: signal.summary,
        source: source?.source_name ?? "Veille compte KREDO",
        url: source?.source_url ?? null,
        published_at: signal.event_at ?? signal.detected_at,
        relevance_score: signal.relevance_score,
        tags: [signal.signal_category, signal.signal_type, "promotion_compte"],
        is_trigger_event: signal.urgency_score >= 0.75,
      })

    if (error?.code === "23505") {
      return { success: true, duplicate: true, error: null }
    }
    if (error) return { success: false, error: error.message }
  }

  revalidatePath("/veille")
  revalidatePath("/prospection/approche-sectorielle")
  return { success: true, error: null }
}
