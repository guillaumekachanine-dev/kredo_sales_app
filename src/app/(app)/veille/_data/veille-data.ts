import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type VeilleDigest = Database["public"]["Tables"]["veille_digests"]["Row"]
export type VeilleArticle = Database["public"]["Tables"]["veille_articles"]["Row"]
export type SectorNews = Database["public"]["Tables"]["sector_news"]["Row"]
export type SectorEvent = Database["public"]["Tables"]["sector_events"]["Row"]

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

export async function getCompaniesContextStats(): Promise<{ data: CompanyContextStats[]; error: any }> {
  try {
    const supabase = await createClient()
    
    // 1. Fetch companies
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id, name, sector, lifecycle_status, website, metadata")
      
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
      const metadata = c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata) ? c.metadata as Record<string, any> : {}
      const logoPath = typeof metadata.logo_path === "string" ? metadata.logo_path : null

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
  status: string
  category: string
  type: string
  recommendedAction: string | null
  recommendedPracticeId: string | null
  companyId: string
  company: {
    id: string
    name: string
    website: string | null
    logoPath: string | null
  }
  primarySource: {
    id: string
    source_name: string
    source_url: string | null
  } | null
}

export async function getWatchedAccountsSignals(): Promise<{ data: WatchedAccountSignal[]; error: any }> {
  try {
    const supabase = await createClient()

    // 1. Get enabled watch settings
    const { data: watchSettings, error: watchError } = await supabase
      .from("account_watch_settings")
      .select("company_id")
      .eq("is_enabled", true)

    if (watchError) return { data: [], error: watchError }
    if (!watchSettings || watchSettings.length === 0) return { data: [], error: null }

    const companyIds = watchSettings.map(w => w.company_id).filter(Boolean)

    // 2. Get signals
    const { data: signals, error: signalsError } = await supabase
      .from("account_signals")
      .select(`
        id,
        title,
        summary,
        global_score,
        urgency_score,
        confidence_score,
        detected_at,
        status,
        signal_category,
        signal_type,
        recommended_action,
        recommended_practice_id,
        company_id,
        companies(id, name, website, metadata),
        intelligence_sources(id, source_name, source_url)
      `)
      .in("company_id", companyIds)
      .neq("status", "dismissed")
      .order("global_score", { ascending: false })
      .order("detected_at", { ascending: false })

    if (signalsError) return { data: [], error: signalsError }

    const mapped: WatchedAccountSignal[] = (signals || []).map(row => {
      const companyRow = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const sourceRow = Array.isArray(row.intelligence_sources) ? row.intelligence_sources[0] : row.intelligence_sources

      const metadata = companyRow?.metadata && typeof companyRow.metadata === "object" && !Array.isArray(companyRow.metadata) 
        ? companyRow.metadata as Record<string, any> 
        : {}
      const logoPath = typeof metadata.logo_path === "string" ? metadata.logo_path : null

      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        globalScore: row.global_score ?? 0,
        urgencyScore: row.urgency_score ?? 0,
        confidenceScore: row.confidence_score ?? 0,
        detectedAt: row.detected_at,
        status: row.status,
        category: row.signal_category,
        type: row.signal_type,
        recommendedAction: row.recommended_action,
        recommendedPracticeId: row.recommended_practice_id,
        companyId: row.company_id,
        company: companyRow ? {
          id: companyRow.id,
          name: companyRow.name,
          website: companyRow.website,
          logoPath
        } : { id: row.company_id, name: "Compte inconnu", website: null, logoPath: null },
        primarySource: sourceRow ? {
          id: sourceRow.id,
          source_name: sourceRow.source_name,
          source_url: sourceRow.source_url
        } : null
      }
    })

    return { data: mapped, error: null }
  } catch (err) {
    console.error("Error in getWatchedAccountsSignals:", err)
    return { data: [], error: err }
  }
}

