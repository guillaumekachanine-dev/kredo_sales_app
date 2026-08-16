import "server-only"

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
  sectorId: string | null
  sectorAttachment: string | null
  segment: string
  segmentId: string | null
  tier: string | null
  regimeAchat: string | null
  revenue: string
  location: string
  sizeBand: string | null
  priority: string
  status: string
  analysisStep: string | null
  hasDedicatedWatch: boolean
  score: number | null
  website: string | null
  contactCount: number
  emailCount: number
  summary: string
  description: string | null
  logoPath: string | null
  taskCount: number
  employeeCount: number | null
  /** ADR-0019 — profondeur de traitement : mapped | noted | qualified | active */
  depthLevel: string
  /** ADR-0019 — ce qui a fait naître la fiche (competitive_map, scan, manual…) */
  origin: string
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

export type TaxonomySegmentOption = {
  id: string
  name: string
  slug: string
  level: string | null
  parentId: string | null
}

export type AccountsContactsData = {
  stats: AccountsContactsStats
  accounts: AccountRow[]
  /**
   * ADR-0019 D-3 — comptes `depth_level='mapped'` (citations issues d'une
   * cartographie concurrentielle). Toujours séparés de `accounts` : ils
   * n'entrent jamais dans les stats, les filtres taxonomiques ni les
   * combobox — la scission se fait ici, à la source, pour que tout
   * consommateur de `accounts` en hérite sans avoir à répéter le filtre.
   */
  mappedAccounts: AccountRow[]
  contacts: ContactRow[]
  /**
   * Tableau des IDs de comptes ayant une étude.
   * Transmis sous forme de tableau simple pour la sérialisation RSC.
   */
  studyIds: string[]
  sectors: SectorStudyRow[]
  taxonomySegments: TaxonomySegmentOption[]
}

// ─── Types internes Supabase ───────────────────────────────────────────────────

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null; count: number | null }

type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): ReadQuery<T>
  in(column: string, values: (string | number)[]): ReadQuery<T>
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
 */
type AccountViewRow = {
  id: string
  name: string
  sector: string | null
  segment: string | null
  sector_id: string | null
  segment_id: string | null
  sector_name: string | null
  segment_name: string | null
  tier: string | null
  regime_achat: string | null
  relation_type: string | null
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
  sector_attachment_name: string | null
  has_dedicated_watch: boolean | null
  has_client_analysis: boolean | null
  has_sector_analysis: boolean | null
  has_process_diagnostic: boolean | null
  has_roadmap: boolean | null
  has_legacy_analysis: boolean | null
  has_legacy_sector: boolean | null
  has_account_issues: boolean | null
  has_commercial_strategy: boolean | null
  depth_level: string | null
  origin: string | null
}

type TaskQueryRow = {
  id: string
  entity_id: string | null
  entity_type: string | null
}

type TaxonomyQueryRow = {
  id: string
  name: string
  slug: string
  level: string | null
  parent_id: string | null
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

function logOptionalEnrichmentError(source: string, error: SupabaseError | null) {
  if (error) {
    console.error(`[accounts-contacts] optional enrichment "${source}" failed:`, error.message)
  }
}

function getLatestAnalysisStep(row: AccountViewRow, sectorAttachment: string | null): string | null {
  if (row.has_roadmap) return "Roadmap commerciale"
  if (row.has_commercial_strategy) return "Stratégie commerciale"
  if (row.has_account_issues || row.has_process_diagnostic) return "Cartographie des enjeux"
  if (row.has_sector_analysis || row.has_legacy_sector || sectorAttachment) return "Intelligence sectorielle"
  if (row.has_client_analysis || row.has_legacy_analysis) return "Connaissance compte"
  return null
}

function buildAccount(row: AccountViewRow, contactCount: number, taskCount: number): AccountRow {
  const importedContacts = Number(row.nb_contacts ?? 0) || 0
  const importedEmails  = Number(row.nb_with_email ?? 0) || 0
  const sectorAttachment = row.sector_attachment_name?.trim() || null

  const resolvedSector = row.sector_id ? cleanText(row.sector_name, "Non renseigné") : "Non renseigné"
  const resolvedSegment = row.segment_id ? cleanText(row.segment_name, "Segment non renseigné") : "Segment non renseigné"
  const resolvedStatus = row.relation_type || row.lifecycle_status || "prospect"

  return {
    id: row.id,
    name: row.name,
    sector: resolvedSector,
    sectorId: row.sector_id ?? null,
    sectorAttachment,
    segment: resolvedSegment,
    segmentId: row.segment_id ?? null,
    tier: row.tier ?? null,
    regimeAchat: row.regime_achat ?? null,
    revenue: cleanText(row.revenue),
    location: cleanText(row.hq_location),
    sizeBand: row.size_band ?? null,
    priority: row.priority,
    status: resolvedStatus,
    analysisStep: getLatestAnalysisStep(row, sectorAttachment),
    hasDedicatedWatch: row.has_dedicated_watch === true,
    score: toNumber(row.legacy_folio_score),
    website: row.website,
    contactCount: Math.max(contactCount, importedContacts),
    emailCount: importedEmails,
    summary: cleanText(row.description, "Aucune synthèse disponible."),
    description: row.description,
    logoPath: row.logo_path,
    taskCount,
    employeeCount: row.employee_count,
    depthLevel: row.depth_level ?? "noted",
    origin: row.origin ?? "manual",
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

  // Migration 067 : sector_id / segment_id / sector_name / segment_name / tier
  // / regime_achat / relation_type / depth_level / origin viennent désormais de
  // la vue. La seconde requête `companies` jointe en JavaScript qui les
  // récupérait défaisait l'audit de performance Lot 5, et ses deux `limit`
  // divergeaient (300 sur la vue, 1000 sur companies).
  const [
    accountsResult,
    contactsResult,
    tasksResult,
    taxonomyResult,
  ] = await Promise.all([
    supabase
      .from<AccountViewRow>("v_crm_account_list")
      .select("id,name,sector,segment,revenue,employee_count,size_band,hq_location,priority,lifecycle_status,legacy_folio_score,website,description,logo_path,nb_contacts,nb_with_email,has_study,sector_attachment_name,has_dedicated_watch,has_client_analysis,has_sector_analysis,has_process_diagnostic,has_roadmap,has_legacy_analysis,has_legacy_sector,has_account_issues,has_commercial_strategy,sector_id,segment_id,sector_name,segment_name,tier,regime_achat,relation_type,depth_level,origin")
      .order("legacy_folio_score", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(1000),
    supabase
      .from<ContactQueryRow>("contacts")
      .select("id,person_id,company_id,job_title,relationship_role,relationship_level,status,department,persons(full_name,first_name,last_name,primary_email,phone,linkedin_url),is_priority,manager_contact_id,campaign_id,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from<TaskQueryRow>("tasks")
      .select("id,entity_id,entity_type")
      .limit(2000),
    supabase
      .from<TaxonomyQueryRow>("sector_intelligence")
      .select("id,name,slug,level,parent_id")
      .order("name", { ascending: true }),
  ])

  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (contactsResult.error) throw new Error(contactsResult.error.message)
  logOptionalEnrichmentError("tasks", tasksResult.error)
  logOptionalEnrichmentError("sector_intelligence", taxonomyResult.error)

  const rawAccounts = accountsResult.data ?? []
  const rawContacts = contactsResult.data ?? []
  const rawTasks    = tasksResult.error ? [] : (tasksResult.data ?? [])
  const rawTaxonomy = taxonomyResult.error ? [] : (taxonomyResult.data ?? [])

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
      sector: cleanText(row.sector_name || row.sector),
      website: row.website,
      logoPath: row.logo_path,
    })
  }

  const allAccounts = rawAccounts
    .map((row) => buildAccount(row, contactCounts.get(row.id) ?? 0, taskCounts.get(row.id) ?? 0))
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.contactCount - a.contactCount || a.name.localeCompare(b.name))

  // ADR-0019 D-3 : un compte `mapped` est une citation, pas un compte réel —
  // il n'entre jamais dans les stats du header, les combobox commerciales ni
  // les filtres taxonomiques. Scission unique ici : `accounts` en aval
  // (stats, sectors, studyIds, filtres URL) reste implicitement propre.
  const accounts = allAccounts.filter((account) => account.depthLevel !== "mapped")
  const mappedAccounts = allAccounts.filter((account) => account.depthLevel === "mapped")

  if (mappedAccounts.length > 0) {
    const mappedIds = mappedAccounts.map((a) => a.id)
    const [entriesRes, factsRes] = await Promise.all([
      supabase
        .from<{ company_id: string; category: string; profile_json: Record<string, unknown> }>("competitive_map_entries")
        .select("company_id, category, profile_json")
        .in("company_id", mappedIds),
      supabase
        .from<{ target_id: string; fact_type: string; value_json: Record<string, unknown>; value_text: string }>("account_facts")
        .select("target_id, fact_type, value_json, value_text")
        .eq("target_type", "company")
        .eq("is_current", true)
        .in("target_id", mappedIds),
    ])

    const entriesByCompany = new Map<string, { category: string; profile_json: Record<string, unknown> }>()
    if (entriesRes.data) {
      for (const e of entriesRes.data) {
        if (!entriesByCompany.has(e.company_id)) {
          entriesByCompany.set(e.company_id, e)
        }
      }
    }

    const factsByCompany = new Map<string, { revenueMeur?: number | null }>()
    if (factsRes.data) {
      for (const f of factsRes.data) {
        if (f.fact_type === "revenue_estimate" && f.value_json) {
          const meur = (f.value_json as { amountMeur?: number | null })?.amountMeur
          factsByCompany.set(f.target_id, { revenueMeur: meur })
        }
      }
    }

    for (const acc of mappedAccounts) {
      const entry = entriesByCompany.get(acc.id)
      const fact = factsByCompany.get(acc.id)
      const profileJson = entry?.profile_json ?? {}

      // 1. Catégorie (tier)
      if (!acc.tier || acc.tier === "Non renseigné") {
        if (entry?.category) {
          acc.tier = entry.category
        } else if (profileJson.categorie) {
          acc.tier = String(profileJson.categorie)
        }
      }

      // 2. Chiffre d'affaires (revenue)
      if (!acc.revenue || acc.revenue === "Non renseigné") {
        if (fact?.revenueMeur !== null && fact?.revenueMeur !== undefined) {
          acc.revenue = `${fact.revenueMeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`
        } else if (profileJson.ca_meur) {
          acc.revenue = `${Number(profileJson.ca_meur).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`
        }
      }

      // 3. Siège (location)
      if (!acc.location || acc.location === "Non renseigné") {
        const loc =
          (profileJson.siege as string) ||
          (profileJson.location as string) ||
          (profileJson.branche_retenue as string) ||
          (profileJson.groupe as string)
        if (loc) {
          acc.location = loc.length > 40 ? `${loc.slice(0, 37)}...` : loc
        }
      }
    }
  }

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

  const taxonomySegments: TaxonomySegmentOption[] = rawTaxonomy.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    level: item.level,
    parentId: item.parent_id,
  }))

  return {
    stats,
    accounts,
    mappedAccounts,
    contacts,
    studyIds,
    sectors: buildSectorRows(accounts),
    taxonomySegments,
  }
}

