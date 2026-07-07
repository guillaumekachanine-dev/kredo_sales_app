import { createClient } from "@/lib/supabase/server"

export type MobileAccountLookupEntry = {
  id: string
  name: string
  sector: string
  segment: string
  priority: string
  status: string
  score: number | null
  website: string | null
  logoPath: string | null
  contactCount: number
  hasCampaign: boolean
  campaignContactCount: number
  hasNews: boolean
  newsCount: number
}

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null }

type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ReadQuery<T>
  limit(count: number): ReadQuery<T>
}

type ReadTable<T> = {
  select(columns: string): ReadQuery<T>
}

type LooseSupabaseClient = {
  from<T>(table: string): ReadTable<T>
}

type CompanyLookupRow = {
  id: string
  name: string
  sector: string | null
  segment: string | null
  priority: string
  lifecycle_status: string
  legacy_folio_score: number | string | null
  website: string | null
  metadata: unknown
}

type ContactLookupRow = {
  company_id: string | null
  campaign_id: string | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function nestedRecord(source: JsonRecord, key: string): JsonRecord {
  return asRecord(source[key])
}

function nestedTextArray(source: JsonRecord, path: string[]): string[] {
  let cursor: unknown = source
  for (const part of path) {
    cursor = asRecord(cursor)[part]
  }
  return Array.isArray(cursor) ? cursor.filter((item): item is string => typeof item === "string") : []
}

function cleanText(value: string | null | undefined, fallback = "Non renseigné") {
  return value && value.trim().length > 0 ? value.trim() : fallback
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function getMobileAccountLookupData(): Promise<MobileAccountLookupEntry[]> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const [companiesResult, contactsResult] = await Promise.all([
    supabase
      .from<CompanyLookupRow>("companies")
      .select("id,name,sector,segment,priority,lifecycle_status,legacy_folio_score,website,metadata")
      .order("legacy_folio_score", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(300),
    supabase
      .from<ContactLookupRow>("contacts")
      .select("company_id,campaign_id")
      .limit(2000),
  ])

  if (companiesResult.error) throw new Error(companiesResult.error.message)
  if (contactsResult.error) throw new Error(contactsResult.error.message)

  const companies = companiesResult.data ?? []
  const contacts = contactsResult.data ?? []

  const contactCounts = new Map<string, number>()
  const campaignCounts = new Map<string, number>()

  for (const contact of contacts) {
    if (!contact.company_id) continue
    contactCounts.set(contact.company_id, (contactCounts.get(contact.company_id) ?? 0) + 1)

    if (contact.campaign_id) {
      campaignCounts.set(contact.company_id, (campaignCounts.get(contact.company_id) ?? 0) + 1)
    }
  }

  return companies
    .map((company) => {
      const metadata = asRecord(company.metadata)
      const logoPath = typeof metadata.logo_path === "string" ? metadata.logo_path : null
      const recentNews = nestedTextArray(
        nestedRecord(metadata, "analysis_data"),
        ["signaux", "actualites_recentes"],
      )
      const campaignContactCount = campaignCounts.get(company.id) ?? 0

      return {
        id: company.id,
        name: company.name,
        sector: cleanText(company.sector),
        segment: cleanText(company.segment, "Segment non renseigné"),
        priority: company.priority,
        status: company.lifecycle_status,
        score: toNumber(company.legacy_folio_score),
        website: company.website,
        logoPath,
        contactCount: contactCounts.get(company.id) ?? 0,
        hasCampaign: campaignContactCount > 0,
        campaignContactCount,
        hasNews: recentNews.length > 0,
        newsCount: recentNews.length,
      }
    })
    .toSorted(
      (left, right) =>
        (right.score ?? 0) - (left.score ?? 0)
        || right.campaignContactCount - left.campaignContactCount
        || right.newsCount - left.newsCount
        || right.contactCount - left.contactCount
        || left.name.localeCompare(right.name),
    )
}
