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

