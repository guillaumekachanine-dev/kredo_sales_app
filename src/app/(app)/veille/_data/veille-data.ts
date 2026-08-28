import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import {
  GLOBAL_WATCH_WORKFLOW_ID,
  MONTHLY_WATCH_WORKFLOW_ID,
  ON_DEMAND_DIGEST_WORKFLOW_ID,
  healthFromRun,
  parseGlobalWatchSettings,
  parseStrategicWatchAnalysisOutput,
  previousCalendarMonth,
  type GlobalWatchSettings,
  type GlobalWatchWorkflowHealth,
  type MonthlyWatchGenerationContext,
  type StrategicWatchAnalysis,
} from "@/components/veille/veille-desktop-contracts"

export type VeilleDigest = Database["public"]["Tables"]["veille_digests"]["Row"]
export type VeilleArticle = Database["public"]["Tables"]["veille_articles"]["Row"]
export type SectorNews = Database["public"]["Tables"]["sector_news"]["Row"]
export type SectorEvent = Database["public"]["Tables"]["sector_events"]["Row"]

async function getAuthenticatedWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, workspaceId: null as string | null }
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .maybeSingle()
  return { supabase, workspaceId: profile?.workspace_id ?? null }
}

export async function getGlobalWatchSettings(): Promise<GlobalWatchSettings> {
  const { supabase, workspaceId } = await getAuthenticatedWorkspace()
  if (!workspaceId) return parseGlobalWatchSettings(null)
  const { data } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .maybeSingle()
  return parseGlobalWatchSettings(data?.settings)
}

export async function getGlobalWatchWorkflowHealth(): Promise<GlobalWatchWorkflowHealth> {
  const { supabase, workspaceId } = await getAuthenticatedWorkspace()
  if (!workspaceId || !GLOBAL_WATCH_WORKFLOW_ID) {
    return healthFromRun({ workflowId: GLOBAL_WATCH_WORKFLOW_ID, run: null })
  }
  // Le widget de santé reflète le dernier run de veille globale, qu'il soit
  // programmé (`GLOBAL_WATCH_WORKFLOW_ID`, écrit par le cron) ou déclenché par un
  // utilisateur (`ON_DEMAND_DIGEST_WORKFLOW_ID`). Les deux restent distincts dans
  // le journal /automations — c'est seulement l'indicateur « OK / Erreur / En
  // cours » de l'en-tête Veille qui les agrège.
  const { data } = await supabase
    .from("ai_intelligence_runs")
    .select("id, status, created_at, completed_at, error_message")
    .eq("workspace_id", workspaceId)
    .in("run_type", [GLOBAL_WATCH_WORKFLOW_ID, ON_DEMAND_DIGEST_WORKFLOW_ID])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return healthFromRun({ workflowId: GLOBAL_WATCH_WORKFLOW_ID, run: data })
}

function mapStrategicWatchAnalysis(row: {
  id: string
  title: string
  status: Database["public"]["Enums"]["intelligence_document_status"]
  period_start: string | null
  period_end: string | null
  created_at: string
  updated_at: string
  version_number: number
  current_content_json: Database["public"]["Tables"]["intelligence_documents"]["Row"]["current_content_json"]
}): StrategicWatchAnalysis {
  const content = parseStrategicWatchAnalysisOutput(row.current_content_json)
  const analysisKind = content?.schemaVersion === 2
    ? "manual_custom"
    : row.period_start && row.period_end
      ? "monthly"
      : "manual_custom"

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versionNumber: row.version_number,
    analysisKind,
    content,
  }
}

export async function getStrategicWatchAnalysisHistory(limit = 12): Promise<StrategicWatchAnalysis[]> {
  const { supabase, workspaceId } = await getAuthenticatedWorkspace()
  if (!workspaceId) return []
  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id, title, status, period_start, period_end, created_at, updated_at, version_number, current_content_json")
    .eq("workspace_id", workspaceId)
    .eq("document_type", "strategic_watch_analysis")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("[veille] strategic analysis history:", error.message)
    return []
  }
  return (data ?? []).map(mapStrategicWatchAnalysis)
}

export async function getLatestStrategicWatchAnalysis(): Promise<StrategicWatchAnalysis | null> {
  const rows = await getStrategicWatchAnalysisHistory(1)
  return rows[0] ?? null
}

export async function getMonthlyWatchGenerationContext(reference = new Date()): Promise<MonthlyWatchGenerationContext> {
  const { supabase, workspaceId } = await getAuthenticatedWorkspace()
  const period = previousCalendarMonth(reference)
  const emptyInput = {
    schemaVersion: 1 as const,
    periodStart: period.start,
    periodEnd: period.end,
    digestIds: [],
    articleIds: [],
    requestedAt: reference.toISOString(),
    triggerMode: "manual" as const,
  }
  if (!workspaceId) return { input: emptyInput, isAlreadyCovered: false, activeRun: null, latestRun: null }

  const [digestsResult, documentResult, runsResult] = await Promise.all([
    supabase
      .from("veille_digests")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("digest_date", period.start)
      .lte("digest_date", period.end)
      .order("digest_date", { ascending: true }),
    supabase
      .from("intelligence_documents")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("document_type", "strategic_watch_analysis")
      .eq("period_start", period.start)
      .eq("period_end", period.end)
      .neq("status", "archived")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_intelligence_runs")
      .select("id, status, created_at, error_message")
      .eq("workspace_id", workspaceId)
      .eq("run_type", MONTHLY_WATCH_WORKFLOW_ID)
      .order("created_at", { ascending: false })
      .limit(1),
  ])

  const digestIds = (digestsResult.data ?? []).map((row) => row.id)
  const articleResult = digestIds.length > 0
    ? await supabase
        .from("veille_articles")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("digest_id", digestIds)
        .is("superseded_at", null)
        .order("selection_rank", { ascending: true })
    : { data: [] as Array<{ id: string }>, error: null }
  const latestRunRow = runsResult.data?.[0] ?? null
  const latestRun = latestRunRow
    ? {
        id: latestRunRow.id,
        status: latestRunRow.status,
        createdAt: latestRunRow.created_at,
        errorMessage: latestRunRow.error_message,
      }
    : null

  return {
    input: {
      ...emptyInput,
      digestIds,
      articleIds: (articleResult.data ?? []).map((row) => row.id),
    },
    isAlreadyCovered: Boolean(documentResult.data),
    activeRun: latestRun && (latestRun.status === "queued" || latestRun.status === "running")
      ? { id: latestRun.id, status: latestRun.status, createdAt: latestRun.createdAt }
      : null,
    latestRun,
  }
}

export async function getLatestVeilleDigest() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data: data as VeilleDigest | null, error }
}

export async function getVeilleArticles(digestId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_articles")
    .select("*")
    .eq("digest_id", digestId)
    .is("superseded_at", null)
    .order("selection_rank", { ascending: true })

  return { data: (data || []) as VeilleArticle[], error }
}

export async function getAllVeilleArticles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_articles")
    .select("*")
    .is("superseded_at", null)
    .order("published_at", { ascending: false })
    .order("selection_rank", { ascending: true })

  return { data: (data || []) as VeilleArticle[], error }
}


/**
 * Articles de plusieurs briefings en un seul appel — le flux « Actualités »
 * mobile est transverse aux digests, contrairement au lecteur desktop qui reste
 * centré sur le digest sélectionné. Même projection que `getVeilleArticles`.
 */
export async function getVeilleArticlesForDigests(digestIds: string[]) {
  if (digestIds.length === 0) return { data: [] as VeilleArticle[], error: null }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_articles")
    .select("*")
    .in("digest_id", digestIds)
    .is("superseded_at", null)
    .order("published_at", { ascending: false })
    .order("selection_rank", { ascending: true })

  return { data: (data || []) as VeilleArticle[], error }
}

export async function getPastVeilleDigests(limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("veille_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(limit)

  return { data: (data || []) as VeilleDigest[], error }
}

export async function getSectorNews(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sector_news")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit)

  return { data: (data || []) as SectorNews[], error }
}

export async function getSectorEvents(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sector_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit)

  return { data: (data || []) as SectorEvent[], error }
}

export type CompanyContextStats = {
  id: string
  name: string
  sector: string | null
  lifecycle_status: string
  website: string | null
  logoPath: string | null
  contactsCount: number
  interactionsCount: number
  docsCount: number
}

export async function getCompaniesContextStats(): Promise<{ data: CompanyContextStats[]; error: unknown }> {
  try {
    const supabase = await createClient()
    
    // 1. Fetch companies
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id, name, sector, lifecycle_status, website, meta_logo_path")
      
    if (compError) return { data: [], error: compError }
    if (!companies) return { data: [], error: null }
    
    // 2. Fetch contacts counts
    const { data: contactsData } = await supabase
      .from("contacts")
      .select("company_id")
      
    // 3. Fetch interactions counts
    const { data: interactionsData } = await supabase
      .from("interactions")
      .select("company_id")

    // 4. Fetch intelligence documents counts
    const { data: docLinksData } = await supabase
      .from("intelligence_document_links")
      .select("entity_id")
      .eq("entity_type", "company")

    // Map counts
    const contactsMap: Record<string, number> = {}
    contactsData?.forEach(c => {
      if (c.company_id) contactsMap[c.company_id] = (contactsMap[c.company_id] || 0) + 1
    })
    
    const interactionsMap: Record<string, number> = {}
    interactionsData?.forEach(i => {
      if (i.company_id) interactionsMap[i.company_id] = (interactionsMap[i.company_id] || 0) + 1
    })

    const docsMap: Record<string, number> = {}
    docLinksData?.forEach(d => {
      if (d.entity_id) docsMap[d.entity_id] = (docsMap[d.entity_id] || 0) + 1
    })

    const mapped: CompanyContextStats[] = companies.map(c => {
      const logoPath = typeof c.meta_logo_path === "string" ? c.meta_logo_path : null

      return {
        id: c.id,
        name: c.name,
        sector: c.sector,
        lifecycle_status: c.lifecycle_status,
        website: c.website,
        logoPath: logoPath,
        contactsCount: contactsMap[c.id] || 0,
        interactionsCount: interactionsMap[c.id] || 0,
        docsCount: docsMap[c.id] || 0
      }
    })

    return { data: mapped, error: null }
  } catch (err) {
    console.error("Error in getCompaniesContextStats:", err)
    return { data: [], error: err }
  }
}

export type WatchedAccountSignal = {
  id: string
  title: string
  summary: string | null
  globalScore: number
  urgencyScore: number
  confidenceScore: number
  detectedAt: string
  publishedAt?: string
  status: string
  category: string
  type: string
  recommendedAction: string | null
  analysis?: string | null
  recommendedPracticeId: string | null
  companyId: string
  primarySourceId?: string | null
  company: {
    id: string
    name: string
    website: string | null
    logoPath: string | null
    cadence?: string | null
  }
  primarySource: {
    id: string
    source_name: string
    source_url: string | null
  } | null
}

export async function getWatchedCompanyIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("account_watch_settings")
    .select("company_id")
    .eq("is_enabled", true)
  if (error) {
    console.error("[veille] watched company ids:", error.message)
    return []
  }
  return Array.from(new Set((data ?? []).map((row) => row.company_id).filter(Boolean)))
}

export async function getWatchedAccountsSignals(): Promise<{ data: WatchedAccountSignal[]; error: unknown }> {
  try {
    const supabase = await createClient()

    // 1. Get enabled watch settings
    const { data: watchSettings, error: watchError } = await supabase
      .from("account_watch_settings")
      .select("company_id, cadence")
      .eq("is_enabled", true)

    if (watchError) return { data: [], error: watchError }
    if (!watchSettings || watchSettings.length === 0) return { data: [], error: null }

    const companyIds = watchSettings.map(w => w.company_id).filter(Boolean)
    const cadenceMap: Record<string, string> = {}
    watchSettings.forEach(w => {
      if (w.company_id && w.cadence) cadenceMap[w.company_id] = w.cadence
    })

    // 2. Get signals
    const { data: signals, error: signalsError } = await supabase
      .from("v_active_account_signals")
      .select(`
        id,
        title,
        summary,
        global_score,
        urgency_score,
        confidence_score,
        detected_at,
        event_at,
        status,
        signal_category,
        signal_type,
        recommended_action,
        score_justification,
        recommended_practice_id,
        company_id,
        primary_source_id,
        companies(id, name, website, meta_logo_path),
        intelligence_sources(id, source_name, source_url)
      `)
      .in("company_id", companyIds)
      .order("global_score", { ascending: false })
      .order("detected_at", { ascending: false })

    if (signalsError) return { data: [], error: signalsError }

    const mapped: WatchedAccountSignal[] = (signals || []).flatMap(row => {
      const companyRow = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const sourceRow = Array.isArray(row.intelligence_sources) ? row.intelligence_sources[0] : row.intelligence_sources

      if (!row.id || !row.company_id || !row.title || !row.detected_at || !row.status || !row.signal_category || !row.signal_type) {
        return []
      }

      const logoPath = typeof companyRow?.meta_logo_path === "string" ? companyRow.meta_logo_path : null
      const companyId = row.company_id

      return [{
        id: row.id,
        title: row.title,
        summary: row.summary,
        globalScore: row.global_score ?? 0,
        urgencyScore: row.urgency_score ?? 0,
        confidenceScore: row.confidence_score ?? 0,
        detectedAt: row.detected_at,
        publishedAt: row.event_at ?? row.detected_at,
        status: row.status,
        category: row.signal_category,
        type: row.signal_type,
        recommendedAction: row.recommended_action,
        analysis: row.score_justification,
        recommendedPracticeId: row.recommended_practice_id,
        companyId: row.company_id,
        primarySourceId: row.primary_source_id ?? null,
        company: companyRow ? {
          id: companyRow.id,
          name: companyRow.name,
          website: companyRow.website,
          logoPath,
          cadence: cadenceMap[companyRow.id] ?? "weekly"
        } : { id: companyId, name: "Compte inconnu", website: null, logoPath: null, cadence: cadenceMap[companyId] ?? "weekly" },
        primarySource: sourceRow ? {
          id: sourceRow.id,
          source_name: sourceRow.source_name,
          source_url: sourceRow.source_url
        } : null
      }]
    })

    return { data: mapped, error: null }
  } catch (err) {
    console.error("Error in getWatchedAccountsSignals:", err)
    return { data: [], error: err }
  }
}
