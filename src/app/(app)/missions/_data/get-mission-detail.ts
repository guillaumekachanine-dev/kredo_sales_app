"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getActiveFinancialReferenceByMissionId } from "@/features/financial-modeling/data/get-financial-reference"
import type { Json } from "@/types/database"
import type {
  MissionDetailViewModel,
  MissionActivityReport,
  MissionCollaborator,
  MissionCollaboratorSkill,
  MissionContact,
  MissionCompany,
  MissionCompensation,
  MissionInteraction,
  MissionSummary,
} from "@/components/missions/mission-detail/mission-detail-types"
import type {
  MissionPlanningTimelineEvent,
  MissionPlanningTimelineEventCategory,
} from "@/components/missions/planning/mission-planning-types"

export type MissionDetailResult =
  | { data: MissionDetailViewModel; error?: never }
  | { data?: never; error: string }

// ─── DB row helpers ───────────────────────────────────────────────────────────

interface DBPerson {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
}

interface DBSkill {
  id: string
  name: string
  category: string | null
}

interface DBPersonSkill {
  id: string
  level: number | null
  years: number | null
  confidence: number | null
  source: string | null
  skills: DBSkill | DBSkill[] | null
}

interface DBPersonWithSkills extends DBPerson {
  person_skills: DBPersonSkill[]
}

interface DBCollaborator {
  id: string
  person_id: string
  practice: string | null
  seniority: string | null
  entry_date: string | null
  exit_date: string | null
  status: string
  current_title: string | null
  employee_ref: string | null
  availability: string | null
  metadata: Json
  persons: DBPersonWithSkills | DBPersonWithSkills[] | null
}

interface DBContact {
  id: string
  relationship_role: string | null
  persons: DBPerson | DBPerson[] | null
}

interface DBOpportunityContact {
  role: string | null
  contacts: DBContact | DBContact[] | null
}

const CLIENT_FOLLOW_UP_EVENT_TYPES = ["suivi_mission_client", "rdv_client_suivi"] as const
const COLLAB_FOLLOW_UP_EVENT_TYPES = ["suivi_mission_collab"] as const
const TIMELINE_EVENT_TYPES = [
  ...CLIENT_FOLLOW_UP_EVENT_TYPES,
  ...COLLAB_FOLLOW_UP_EVENT_TYPES,
] as const

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function getCalendarCategory(
  eventType: string
): MissionPlanningTimelineEventCategory | null {
  if ((CLIENT_FOLLOW_UP_EVENT_TYPES as readonly string[]).includes(eventType))
    return "client_follow_up"
  if ((COLLAB_FOLLOW_UP_EVENT_TYPES as readonly string[]).includes(eventType))
    return "collaborator_follow_up"
  return null
}

function normalizePersonName(person: DBPerson): string {
  return (
    person.full_name ||
    `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
    "Sans nom"
  )
}

// ─── Fetchers parallèles ──────────────────────────────────────────────────────

async function fetchCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<MissionCompany | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, description, sector, segment, website, employee_count, revenue, priority, hq_location, metadata"
    )
    .eq("id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[getMissionDetail] fetchCompany:", error.message)
    return null
  }
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    sector: data.sector,
    segment: data.segment,
    website: data.website,
    employee_count: data.employee_count,
    revenue: data.revenue,
    priority: data.priority,
    hq_location: data.hq_location,
    metadata: data.metadata,
  }
}

async function fetchCollaborator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collaboratorId: string
): Promise<MissionCollaborator | null> {
  const { data, error } = await supabase
    .from("collaborators")
    .select(`
      id,
      person_id,
      practice,
      seniority,
      entry_date,
      exit_date,
      status,
      current_title,
      employee_ref,
      availability,
      metadata,
      persons (
        id,
        full_name,
        first_name,
        last_name,
        primary_email,
        phone,
        person_skills (
          id,
          level,
          years,
          confidence,
          source,
          skills (
            id,
            name,
            category
          )
        )
      )
    `)
    .eq("id", collaboratorId)
    .maybeSingle()

  if (error) {
    console.error("[getMissionDetail] fetchCollaborator:", error.message)
    return null
  }
  if (!data) return null

  const raw = data as unknown as DBCollaborator
  const personRaw = pickOne(raw.persons)

  const skills: MissionCollaboratorSkill[] = (personRaw?.person_skills ?? [])
    .map((ps) => {
      const skill = pickOne(ps.skills)
      if (!skill) return null
      return {
        id: ps.id,
        level: ps.level,
        years: ps.years,
        confidence: ps.confidence,
        source: ps.source,
        skill: { id: skill.id, name: skill.name, category: skill.category },
      }
    })
    .filter((s): s is MissionCollaboratorSkill => s !== null)
    .sort((a, b) => {
      const lDiff = (b.level ?? 0) - (a.level ?? 0)
      if (lDiff !== 0) return lDiff
      return (b.years ?? 0) - (a.years ?? 0)
    })

  const person: MissionCollaborator["person"] = personRaw
    ? {
        id: personRaw.id,
        full_name: personRaw.full_name,
        first_name: personRaw.first_name,
        last_name: personRaw.last_name,
        primary_email: personRaw.primary_email,
        phone: personRaw.phone,
      }
    : null

  return {
    id: raw.id,
    practice: raw.practice,
    seniority: raw.seniority,
    entry_date: raw.entry_date,
    exit_date: raw.exit_date,
    status: raw.status,
    current_title: raw.current_title,
    employee_ref: raw.employee_ref,
    availability: raw.availability,
    metadata: raw.metadata ?? {},
    person,
    skills,
  }
}

async function fetchContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mission: MissionSummary
): Promise<MissionContact[]> {
  const metadata = (mission.metadata || {}) as Record<string, unknown>
  const contactIds = metadata.contact_ids as string[] | undefined

  if (contactIds && contactIds.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select(`id, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone)`)
      .in("id", contactIds)

    if (data) {
      const raw = data as unknown as DBContact[]
      return raw
        .map((c) => {
          const p = pickOne(c.persons)
          if (!p) return null
          return {
            id: c.id,
            fullName: normalizePersonName(p),
            role: c.relationship_role,
            email: p.primary_email,
            phone: p.phone,
          }
        })
        .filter((c): c is MissionContact => c !== null)
    }
  }

  if (mission.opportunity_id) {
    const { data } = await supabase
      .from("opportunity_contacts")
      .select(`role, contacts(id, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone))`)
      .eq("opportunity_id", mission.opportunity_id)

    if (data) {
      const raw = data as unknown as DBOpportunityContact[]
      const result: MissionContact[] = raw
        .map((oc) => {
          const contact = pickOne(oc.contacts)
          if (!contact) return null
          const p = pickOne(contact.persons)
          if (!p) return null
          return {
            id: contact.id,
            fullName: normalizePersonName(p),
            role: oc.role || contact.relationship_role,
            email: p.primary_email,
            phone: p.phone,
          }
        })
        .filter((c): c is MissionContact => c !== null)
      if (result.length > 0) return result
    }
  }

  if (mission.company_id) {
    const { data } = await supabase
      .from("contacts")
      .select(`id, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone)`)
      .eq("company_id", mission.company_id)

    if (data) {
      return (data as unknown as DBContact[])
        .map((c) => {
          const p = pickOne(c.persons)
          if (!p) return null
          return {
            id: c.id,
            fullName: normalizePersonName(p),
            role: c.relationship_role,
            email: p.primary_email,
            phone: p.phone,
          }
        })
        .filter((c): c is MissionContact => c !== null)
    }
  }

  return []
}

async function fetchActivityReports(
  supabase: Awaited<ReturnType<typeof createClient>>,
  missionId: string
): Promise<MissionActivityReport[]> {
  const { data, error } = await supabase
    .from("mission_activity_reports")
    .select(
      "id, period_start, period_end, status, billable_days, non_billable_days, business_days, pto_days, sick_days, activity_rate_percent, tjm_snapshot, cjm_snapshot"
    )
    .eq("mission_id", missionId)
    .order("period_start", { ascending: false })

  if (error) {
    console.error("[getMissionDetail] fetchActivityReports:", error.message)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    period_start: r.period_start,
    period_end: r.period_end,
    status: r.status,
    billable_days: r.billable_days,
    non_billable_days: r.non_billable_days,
    business_days: r.business_days,
    pto_days: r.pto_days,
    sick_days: r.sick_days,
    activity_rate_percent: r.activity_rate_percent,
    tjm_snapshot: r.tjm_snapshot,
    cjm_snapshot: r.cjm_snapshot,
  }))
}

async function fetchInteractions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mission: MissionSummary
): Promise<MissionInteraction[]> {
  if (mission.opportunity_id) {
    const { data } = await supabase
      .from("interactions")
      .select("id, type, summary, details, occurred_at, next_action")
      .eq("opportunity_id", mission.opportunity_id)
      .order("occurred_at", { ascending: false })

    if (data && data.length > 0) return data
  }

  if (mission.company_id) {
    const { data } = await supabase
      .from("interactions")
      .select("id, type, summary, details, occurred_at, next_action")
      .eq("company_id", mission.company_id)
      .order("occurred_at", { ascending: false })

    if (data) return data
  }

  return []
}

async function fetchCompensation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collaboratorId: string
): Promise<MissionCompensation | null> {
  const { data } = await supabase
    .from("collaborator_compensation")
    .select("gross_annual, charges_rate, working_days_per_year, taci")
    .eq("collaborator_id", collaboratorId)
    .is("effective_to", null)
    .maybeSingle()

  if (!data) return null

  return {
    gross_annual: data.gross_annual != null ? Number(data.gross_annual) : null,
    charges_rate: data.charges_rate != null ? Number(data.charges_rate) : null,
    working_days_per_year:
      data.working_days_per_year != null
        ? Number(data.working_days_per_year)
        : null,
    taci: data.taci != null ? Number(data.taci) : null,
  }
}

async function fetchCompanyContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<Array<{ id: string; fullName: string; role: string | null }>> {
  const { data, error } = await supabase
    .from("contacts")
    .select(`id, relationship_role, persons(id, full_name, first_name, last_name)`)
    .eq("company_id", companyId)

  if (error) {
    console.error("[getMissionDetail] fetchCompanyContacts:", error.message)
    return []
  }

  return (data ?? []).map((cc) => {
    const p = pickOne(cc.persons as DBPerson | DBPerson[] | null)
    return {
      id: cc.id,
      fullName: p
        ? normalizePersonName(p)
        : "Contact sans nom",
      role: cc.relationship_role,
    }
  })
}

async function fetchPlanningEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mission: MissionSummary
): Promise<MissionPlanningTimelineEvent[]> {
  const events: MissionPlanningTimelineEvent[] = []

  // 1. Événements de calendrier liés directement à la mission (filtre prioritaire)
  //    Fallback : événements liés au compte sans mission_id rattaché
  if (mission.company_id) {
    const { data: calEvents } = await supabase
      .from("calendar_events")
      .select("id, title, event_type, status, starts_at, ends_at, all_day, description, company_id, mission_id")
      .in("event_type", [...TIMELINE_EVENT_TYPES])
      .or(
        `mission_id.eq.${mission.id},and(company_id.eq.${mission.company_id},mission_id.is.null)`
      )
      .order("starts_at", { ascending: true })

    for (const ev of calEvents ?? []) {
      const category = getCalendarCategory(ev.event_type)
      const startDate = getDateOnly(ev.starts_at)
      if (!category || !startDate) continue

      events.push({
        id: `calendar-${ev.id}`,
        sourceId: ev.id,
        sourceType: "calendar_event",
        category,
        title: ev.title,
        startDate,
        endDate: getDateOnly(ev.ends_at) ?? startDate,
        allDay: ev.all_day,
        status: ev.status,
        description: ev.description,
        companyId: ev.company_id,
        collaboratorId: null,
        calendarEventId: ev.id,
      })
    }
  }

  // 2. Absences du collaborateur
  if (mission.collaborator_id) {
    const { data: absences } = await supabase
      .from("collaborator_absences")
      .select("id, collaborator_id, absence_type, start_date, end_date, notes")
      .eq("collaborator_id", mission.collaborator_id)
      .order("start_date", { ascending: true })

    for (const abs of absences ?? []) {
      const startDate = getDateOnly(abs.start_date)
      if (!startDate) continue
      events.push({
        id: `absence-${abs.id}`,
        sourceId: abs.id,
        sourceType: "collaborator_absence",
        category: "absence",
        title: abs.absence_type,
        startDate,
        endDate: getDateOnly(abs.end_date) ?? startDate,
        allDay: true,
        status: null,
        description: abs.notes,
        companyId: null,
        collaboratorId: abs.collaborator_id,
        calendarEventId: null,
      })
    }
  }

  // 3. Fermetures site client
  if (mission.company_id) {
    const { data: closures } = await supabase
      .from("client_closures")
      .select("id, company_id, label, start_date, end_date, notes")
      .eq("company_id", mission.company_id)
      .order("start_date", { ascending: true })

    for (const cl of closures ?? []) {
      const startDate = getDateOnly(cl.start_date)
      if (!startDate) continue
      events.push({
        id: `closure-${cl.id}`,
        sourceId: cl.id,
        sourceType: "client_closure",
        category: "client_closure",
        title: cl.label,
        startDate,
        endDate: getDateOnly(cl.end_date) ?? startDate,
        allDay: true,
        status: null,
        description: cl.notes,
        companyId: cl.company_id,
        collaboratorId: null,
        calendarEventId: null,
      })
    }
  }

  return events.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// ─── Entrée publique ──────────────────────────────────────────────────────────

export async function getMissionDetail(missionId: string): Promise<MissionDetailResult> {
  if (!missionId || missionId.trim() === "") {
    return { error: "L'identifiant de la mission est manquant." }
  }

  try {
    const supabase = await createClient()

    const { data: missionRow, error: missionError } = await supabase
      .from("missions")
      .select(
        "id, title, status, start_date, end_date, role_title, practice, seniority, tjm, cjm, gross_margin_pct, billing_condition, description, metadata, opportunity_id, collaborator_id, company_id, external_ref"
      )
      .eq("id", missionId)
      .maybeSingle()

    if (missionError) {
      console.error("[getMissionDetail] mission fetch:", missionError.message)
      return { error: `Erreur base de données : ${missionError.message}` }
    }
    if (!missionRow) return { error: "Mission introuvable." }

    const mission = missionRow as unknown as MissionSummary

    const [
      company,
      collaborator,
      contacts,
      activityReports,
      interactions,
      companyContacts,
      compensation,
      planningEvents,
      financialReference,
    ] = await Promise.all([
      mission.company_id ? fetchCompany(supabase, mission.company_id) : Promise.resolve(null),
      fetchCollaborator(supabase, mission.collaborator_id),
      fetchContacts(supabase, mission),
      fetchActivityReports(supabase, mission.id),
      fetchInteractions(supabase, mission),
      mission.company_id ? fetchCompanyContacts(supabase, mission.company_id) : Promise.resolve([]),
      fetchCompensation(supabase, mission.collaborator_id),
      fetchPlanningEvents(supabase, mission),
      getActiveFinancialReferenceByMissionId(missionId),
    ])

    return {
      data: {
        mission,
        company,
        collaborator,
        contacts,
        activityReports,
        planningEvents,
        interactions,
        companyContacts,
        compensation,
        financialReference,
      },
    }
  } catch (err) {
    console.error("[getMissionDetail] unhandled error:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}

// ─── Re-export pour compatibilité avec les anciens imports ───────────────────
export type { MissionDetailViewModel } from "@/components/missions/mission-detail/mission-detail-types"
