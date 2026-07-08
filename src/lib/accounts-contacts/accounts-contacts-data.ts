import { createClient } from "@/lib/supabase/server"

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
  revenue: string
  location: string
  priority: string
  status: string
  score: number | null
  website: string | null
  contactCount: number
  emailCount: number
  summary: string
  logoPath: string | null
  taskCount: number
  employeeCount: number | null
  /** Pré-calculé serveur-side depuis la vue — évite studies.some() côté client */
  hasStudy: boolean
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
  relationshipLevel: string | null
  status: string
  department: string | null
  managerContactId: string | null
  isPriority?: boolean | null
  campaignId: string | null
  logoPath: string | null
  website: string | null
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
  /**
   * Tableau des IDs de comptes ayant une étude.
   * Transmis sous forme de tableau simple pour la sérialisation RSC.
   */
  studyIds: string[]
  sectors: SectorStudyRow[]
}

// ─── Types internes Supabase ───────────────────────────────────────────────────

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

/**
 * Ligne issue de la vue v_crm_account_list (projection légère sans metadata complet).
 * Les champs logo_path, nb_contacts, nb_with_email et has_study sont extraits
 * côté Postgres — seules les valeurs scalaires traversent le réseau.
 */
type AccountViewRow = {
  id: string
  name: string
  sector: string | null
  segment: string | null
  revenue: string | null
  employee_count: number | null
  size_band: string | null
  hq_location: string | null
  priority: string
  lifecycle_status: string
  legacy_folio_score: number | string | null
  website: string | null
  description: string | null
  logo_path: string | null
  nb_contacts: number | null
  nb_with_email: number | null
  has_study: boolean | null
}

type TaskQueryRow = {
  id: string
  entity_id: string | null
  entity_type: string | null
}

type PersonRelation = {
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
  linkedin_url: string | null
}

type CompanyMapValue = {
  name: string
  sector: string
  website: string | null
  logoPath: string | null
}

type ContactQueryRow = {
  id: string
  person_id: string
  company_id: string | null
  job_title: string | null
  relationship_role: string | null
  relationship_level: string | null
  status: string
  department: string | null
  persons: PersonRelation | PersonRelation[] | null
  is_priority?: boolean | null
  manager_contact_id?: string | null
  campaign_id?: string | null
  created_at?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
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

function buildAccount(row: AccountViewRow, contactCount: number, taskCount: number): AccountRow {
  const importedContacts = Number(row.nb_contacts ?? 0) || 0
  const importedEmails  = Number(row.nb_with_email ?? 0) || 0

  return {
    id: row.id,
    name: row.name,
    sector: cleanText(row.sector),
    segment: cleanText(row.segment, "Segment non renseigné"),
    revenue: cleanText(row.revenue),
    location: cleanText(row.hq_location),
    priority: row.priority,
    status: row.lifecycle_status,
    score: toNumber(row.legacy_folio_score),
    website: row.website,
    contactCount: Math.max(contactCount, importedContacts),
    emailCount: importedEmails,
    summary: cleanText(row.description, "Aucune synthèse disponible."),
    logoPath: row.logo_path,
    taskCount,
    employeeCount: row.employee_count,
    hasStudy: row.has_study === true,
  }
}

function buildContact(row: ContactQueryRow, companyById: Map<string, CompanyMapValue>): ContactRow {
  const person = firstRelation(row.persons)
  const company = row.company_id ? companyById.get(row.company_id) : null
  const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
  const managerContactId = row.manager_contact_id ?? null

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
    relationshipLevel: row.relationship_level ?? null,
    status: row.status,
    department: row.department,
    managerContactId,
    isPriority: row.is_priority ?? false,
    campaignId: row.campaign_id ?? null,
    logoPath: company?.logoPath ?? null,
    website: company?.website ?? null,
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

export async function getAccountsContactsData(): Promise<AccountsContactsData> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient

  const [accountsResult, contactsResult, tasksResult] = await Promise.all([
    supabase
      .from<AccountViewRow>("v_crm_account_list")
      .select("id,name,sector,segment,revenue,employee_count,size_band,hq_location,priority,lifecycle_status,legacy_folio_score,website,description,logo_path,nb_contacts,nb_with_email,has_study")
      .order("legacy_folio_score", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(300),
    supabase
      .from<ContactQueryRow>("contacts")
      .select("id,person_id,company_id,job_title,relationship_role,relationship_level,status,department,persons(full_name,first_name,last_name,primary_email,phone,linkedin_url),is_priority,manager_contact_id,campaign_id,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from<TaskQueryRow>("tasks")
      .select("id,entity_id,entity_type")
      .limit(2000),
  ])

  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (contactsResult.error) throw new Error(contactsResult.error.message)

  const rawAccounts = accountsResult.data ?? []
  const rawContacts = contactsResult.data ?? []
  const rawTasks    = tasksResult.data ?? []

  // Comptage contacts par entreprise (depuis les contacts chargés)
  const contactCounts = new Map<string, number>()
  for (const contact of rawContacts) {
    if (contact.company_id) {
      contactCounts.set(contact.company_id, (contactCounts.get(contact.company_id) ?? 0) + 1)
    }
  }

  // Comptage tâches par entreprise
  const taskCounts = new Map<string, number>()
  for (const task of rawTasks) {
    if (task.entity_id && (task.entity_type === "company" || !task.entity_type)) {
      taskCounts.set(task.entity_id, (taskCounts.get(task.entity_id) ?? 0) + 1)
    }
  }

  // Map companyId → infos légères pour la construction des contacts
  const companyById = new Map<string, CompanyMapValue>()
  for (const row of rawAccounts) {
    companyById.set(row.id, {
      name: row.name,
      sector: cleanText(row.sector),
      website: row.website,
      logoPath: row.logo_path,
    })
  }

  const accounts = rawAccounts
    .map((row) => buildAccount(row, contactCounts.get(row.id) ?? 0, taskCounts.get(row.id) ?? 0))
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.contactCount - a.contactCount || a.name.localeCompare(b.name))

  const contacts = rawContacts
    .map((row) => buildContact(row, companyById))
    .toSorted((a, b) => a.companyName.localeCompare(b.companyName) || a.fullName.localeCompare(b.fullName))

  // Liste d'IDs ayant une étude
  const studyIds = accounts.filter((a) => a.hasStudy).map((a) => a.id)

  const stats = {
    companies: accountsResult.count ?? accounts.length,
    contacts: contactsResult.count ?? contacts.length,
    emails: contacts.filter((contact) => Boolean(contact.email)).length,
    studies: studyIds.length,
    highPriority: accounts.filter((account) => account.priority === "haute").length,
  }

  // Full datasets are returned unsliced. Filtering and device-aware display
  // limits are applied client-side (small volumes: ~96 companies / ~643 contacts).
  return {
    stats,
    accounts,
    contacts,
    studyIds,
    sectors: buildSectorRows(accounts),
  }
}
