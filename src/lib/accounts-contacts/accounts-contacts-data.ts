import { createClient } from "@/lib/supabase/server"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"

export type AccountsContactsStats = {
  companies: number
  contacts: number
  emails: number
  studies: number
  highPriority: number
}

export type AccountRow = {
  id: string
  name: string
  sector: string
  segment: string
  location: string
  priority: string
  status: string
  score: number | null
  website: string | null
  contactCount: number
  emailCount: number
  summary: string
}

export type ContactRow = {
  id: string
  personId: string | null
  companyId: string | null
  companyName: string
  companySector: string
  fullName: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  jobTitle: string
  relationshipRole: string | null
  status: string
}

export type StudyRow = {
  id: string
  companyName: string
  sector: string
  segment: string
  score: number | null
  growthTrend: string
  digitalMaturity: string
  sectorTrends: string
  competitors: string[]
  summary: string
}

export type SectorStudyRow = {
  sector: string
  companies: number
  contacts: number
  avgScore: number | null
  topCompanies: string[]
}

export type AccountsContactsData = {
  stats: AccountsContactsStats
  accounts: AccountRow[]
  contacts: ContactRow[]
  studies: StudyRow[]
  sectors: SectorStudyRow[]
}

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null; count: number | null }

type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ReadQuery<T>
  limit(count: number): ReadQuery<T>
  not(column: string, operator: string, value: string): ReadQuery<T>
}

type ReadTable<T> = {
  select(columns: string, options?: { count?: "exact"; head?: boolean }): ReadQuery<T>
}

type LooseSupabaseClient = {
  from<T>(table: string): ReadTable<T>
}

type CompanyQueryRow = {
  id: string
  name: string
  sector: string | null
  hq_location: string | null
  priority: string
  lifecycle_status: string
  ai_score: number | string | null
  website: string | null
  description: string | null
  metadata: unknown
}

type PersonRelation = {
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
  linkedin_url: string | null
}

type CompanyRelation = {
  id: string
  name: string
  sector: string | null
}

type ContactQueryRow = {
  id: string
  person_id: string
  company_id: string | null
  job_title: string | null
  relationship_role: string | null
  status: string
  persons: PersonRelation | PersonRelation[] | null
  companies: CompanyRelation | CompanyRelation[] | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function nestedRecord(source: JsonRecord, key: string): JsonRecord {
  return asRecord(source[key])
}

function nestedText(source: JsonRecord, path: string[]): string {
  let cursor: unknown = source
  for (const part of path) {
    cursor = asRecord(cursor)[part]
  }
  return typeof cursor === "string" && cursor.trim().length > 0 ? cursor.trim() : ""
}

function nestedTextArray(source: JsonRecord, path: string[]): string[] {
  let cursor: unknown = source
  for (const part of path) {
    cursor = asRecord(cursor)[part]
  }
  return Array.isArray(cursor) ? cursor.filter((item): item is string => typeof item === "string") : []
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function cleanText(value: string | null | undefined, fallback = "Non renseigné") {
  return value && value.trim().length > 0 ? value.trim() : fallback
}

function getContactStats(metadata: unknown) {
  const stats = nestedRecord(asRecord(metadata), "contact_stats")
  return {
    contacts: Number(stats.nb_contacts ?? 0) || 0,
    emails: Number(stats.nb_with_email ?? 0) || 0,
  }
}

function getStudy(metadata: unknown) {
  return nestedRecord(asRecord(metadata), "analysis_data")
}

function buildAccount(row: CompanyQueryRow, contactCount: number): AccountRow {
  const metadata = asRecord(row.metadata)
  const importedStats = getContactStats(row.metadata)
  const study = getStudy(row.metadata)

  return {
    id: row.id,
    name: row.name,
    sector: cleanText(row.sector),
    segment: cleanText(metadata.segment as string | null, "Segment non renseigné"),
    location: cleanText(row.hq_location),
    priority: row.priority,
    status: row.lifecycle_status,
    score: toNumber(row.ai_score),
    website: row.website,
    contactCount: Math.max(contactCount, importedStats.contacts),
    emailCount: importedStats.emails,
    summary: cleanText(row.description, nestedText(study, ["synthese_consultant"]) || "Aucune synthèse disponible."),
  }
}

function buildStudy(row: CompanyQueryRow): StudyRow | null {
  const metadata = asRecord(row.metadata)
  const study = getStudy(row.metadata)
  if (Object.keys(study).length === 0) return null

  return {
    id: row.id,
    companyName: row.name,
    sector: cleanText(row.sector),
    segment: cleanText(metadata.segment as string | null, "Segment non renseigné"),
    score: toNumber(row.ai_score),
    growthTrend: nestedText(study, ["signaux", "tendance_croissance"]) || "Non renseigné",
    digitalMaturity: nestedText(study, ["signaux", "indices_maturite_digitale"]) || "Non renseigné",
    sectorTrends: nestedText(study, ["contexte_sectoriel", "tendances_sectorielles"]) || "Non renseigné",
    competitors: nestedTextArray(study, ["contexte_sectoriel", "concurrents_identifies"]),
    summary: nestedText(study, ["synthese_consultant"]) || "Aucune synthèse disponible.",
  }
}

function buildContact(row: ContactQueryRow): ContactRow {
  const person = firstRelation(row.persons)
  const company = firstRelation(row.companies)
  const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()

  return {
    id: row.id,
    personId: row.person_id,
    companyId: row.company_id,
    companyName: cleanText(company?.name, "Entreprise non liée"),
    companySector: cleanText(company?.sector),
    fullName: cleanText(person?.full_name, fallbackName || "Contact sans nom"),
    firstName: person?.first_name?.trim() ?? "",
    lastName: person?.last_name?.trim() ?? "",
    email: person?.primary_email ?? null,
    phone: person?.phone ?? null,
    linkedinUrl: person?.linkedin_url ?? null,
    jobTitle: cleanText(row.job_title, ""),
    relationshipRole: row.relationship_role ?? null,
    status: row.status,
  }
}

function buildSectorRows(accounts: AccountRow[]) {
  const buckets = new Map<string, AccountRow[]>()
  for (const account of accounts) {
    const key = account.sector || "Non renseigné"
    buckets.set(key, [...(buckets.get(key) ?? []), account])
  }

  return [...buckets.entries()]
    .map(([sector, rows]) => {
      const scores = rows.map((row) => row.score).filter((score): score is number => score !== null)
      return {
        sector,
        companies: rows.length,
        contacts: rows.reduce((sum, row) => sum + row.contactCount, 0),
        avgScore: scores.length > 0 ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
        topCompanies: rows
          .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 3)
          .map((row) => row.name),
      }
    })
    .sort((a, b) => b.companies - a.companies)
}

function topForDevice<T>(rows: T[], device: DashboardDevice, desktopLimit: number, mobileLimit: number) {
  return rows.slice(0, device === "mobile" ? mobileLimit : desktopLimit)
}

export async function getAccountsContactsData(device: DashboardDevice): Promise<AccountsContactsData> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const [companiesResult, contactsResult] = await Promise.all([
    supabase
      .from<CompanyQueryRow>("companies")
      .select("id,name,sector,hq_location,priority,lifecycle_status,ai_score,website,description,metadata", { count: "exact" })
      .order("ai_score", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(300),
    supabase
      .from<ContactQueryRow>("contacts")
      .select("id,person_id,company_id,job_title,relationship_role,status,persons(full_name,first_name,last_name,primary_email,phone,linkedin_url),companies(id,name,sector)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  if (companiesResult.error) throw new Error(companiesResult.error.message)
  if (contactsResult.error) throw new Error(contactsResult.error.message)

  const companies = companiesResult.data ?? []
  const rawContacts = contactsResult.data ?? []
  const contactCounts = new Map<string, number>()

  for (const contact of rawContacts) {
    if (contact.company_id) {
      contactCounts.set(contact.company_id, (contactCounts.get(contact.company_id) ?? 0) + 1)
    }
  }

  const accounts = companies
    .map((company) => buildAccount(company, contactCounts.get(company.id) ?? 0))
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.contactCount - a.contactCount || a.name.localeCompare(b.name))

  const contacts = rawContacts
    .map(buildContact)
    .toSorted((a, b) => a.companyName.localeCompare(b.companyName) || a.fullName.localeCompare(b.fullName))

  const studies = companies
    .map(buildStudy)
    .filter((study): study is StudyRow => study !== null)
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.companyName.localeCompare(b.companyName))

  const stats = {
    companies: companiesResult.count ?? accounts.length,
    contacts: contactsResult.count ?? contacts.length,
    emails: contacts.filter((contact) => Boolean(contact.email)).length,
    studies: studies.length,
    highPriority: accounts.filter((account) => account.priority === "haute").length,
  }

  return {
    stats,
    accounts: topForDevice(accounts, device, 120, 30),
    contacts: topForDevice(contacts, device, 160, 40),
    studies: topForDevice(studies, device, 120, 30),
    sectors: topForDevice(buildSectorRows(accounts), device, 20, 10),
  }
}
