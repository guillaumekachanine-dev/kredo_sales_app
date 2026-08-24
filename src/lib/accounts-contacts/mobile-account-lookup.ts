import "server-only"

import { createClient } from "@/lib/supabase/server"

export type MobileAccountLookupEntry = {
  id: string
  name: string
  sector: string
  segment: string
  priority: string
  status: string
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
  website: string | null
  metadata: unknown
}

type ContactLookupRow = {
  company_id: string | null
  campaign_id: string | null
}

type SignalLookupRow = {
  company_id: string | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function cleanText(value: string | null | undefined, fallback = "Non renseigné") {
  return value && value.trim().length > 0 ? value.trim() : fallback
}

export async function getMobileAccountLookupData(): Promise<MobileAccountLookupEntry[]> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const [companiesResult, contactsResult, signalsResult] = await Promise.all([
    supabase
      .from<CompanyLookupRow>("companies")
      .select("id,name,sector,segment,priority,lifecycle_status,website,metadata")
      .order("name", { ascending: true })
      .limit(300),
    supabase
      .from<ContactLookupRow>("contacts")
      .select("company_id,campaign_id")
      .limit(2000),
    supabase
      .from<SignalLookupRow>("v_active_account_signals")
      .select("company_id")
      .limit(5000),
  ])

  if (companiesResult.error) throw new Error(companiesResult.error.message)
  if (contactsResult.error) throw new Error(contactsResult.error.message)
  if (signalsResult.error) throw new Error(signalsResult.error.message)

  const companies = companiesResult.data ?? []
  const contacts = contactsResult.data ?? []
  const signals = signalsResult.data ?? []

  const contactCounts = new Map<string, number>()
  const campaignCounts = new Map<string, number>()
  const signalCounts = new Map<string, number>()

  for (const contact of contacts) {
    if (!contact.company_id) continue
    contactCounts.set(contact.company_id, (contactCounts.get(contact.company_id) ?? 0) + 1)

    if (contact.campaign_id) {
      campaignCounts.set(contact.company_id, (campaignCounts.get(contact.company_id) ?? 0) + 1)
    }
  }

  for (const signal of signals) {
    if (!signal.company_id) continue
    signalCounts.set(signal.company_id, (signalCounts.get(signal.company_id) ?? 0) + 1)
  }

  return companies
    .map((company) => {
      const metadata = asRecord(company.metadata)
      const logoPath = typeof metadata.logo_path === "string" ? metadata.logo_path : null
      const campaignContactCount = campaignCounts.get(company.id) ?? 0
      const newsCount = signalCounts.get(company.id) ?? 0

      return {
        id: company.id,
        name: company.name,
        sector: cleanText(company.sector),
        segment: cleanText(company.segment, "Segment non renseigné"),
        priority: company.priority,
        status: company.lifecycle_status,
        website: company.website,
        logoPath,
        contactCount: contactCounts.get(company.id) ?? 0,
        hasCampaign: campaignContactCount > 0,
        campaignContactCount,
        hasNews: newsCount > 0,
        newsCount,
      }
    })
    .toSorted(
      (left, right) =>
        right.campaignContactCount - left.campaignContactCount
        || right.newsCount - left.newsCount
        || right.contactCount - left.contactCount
        || left.name.localeCompare(right.name),
    )
}
