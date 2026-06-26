import { createClient } from "@/lib/supabase/server"
import type { Json, Tables } from "@/types/database"
import type {
  MissionPlanningCollaborator,
  MissionPlanningCompany,
  MissionPlanningPerson,
  MissionPlanningQuarterlyRevenue,
  MissionPlanningRow,
  MissionPlanningTimelineEvent,
  MissionPlanningTimelineEventCategory,
} from "@/components/missions/planning/mission-planning-types"

type CompanyRecord = Pick<
  Tables<"companies">,
  "id" | "name" | "sector" | "hq_location"
>

type PersonRecord = Pick<
  Tables<"persons">,
  "id" | "full_name" | "first_name" | "last_name"
>

type CollaboratorRecord = Pick<
  Tables<"collaborators">,
  | "id"
  | "employee_ref"
  | "current_title"
  | "practice"
  | "seniority"
  | "availability"
  | "person_id"
> & {
  persons: PersonRecord | PersonRecord[] | null
}

type MissionPlanningQueryRow = Pick<
  Tables<"missions">,
  | "id"
  | "title"
  | "status"
  | "start_date"
  | "end_date"
  | "role_title"
  | "practice"
  | "seniority"
  | "tjm"
  | "cjm"
  | "gross_margin_pct"
  | "company_id"
  | "collaborator_id"
  | "metadata"
> & {
  companies: CompanyRecord | CompanyRecord[] | null
  collaborators: CollaboratorRecord | CollaboratorRecord[] | null
}

type RevenueRow = Pick<
  Tables<"v_mission_quarterly_revenue">,
  | "mission_id"
  | "quarter_label"
  | "quarter_start"
  | "revenue"
  | "gross_margin"
  | "gross_margin_pct"
  | "billable_days"
>

type CollaboratorAbsenceRecord = Pick<
  Tables<"collaborator_absences">,
  "id" | "collaborator_id" | "absence_type" | "start_date" | "end_date" | "notes"
>

type ClientClosureRecord = Pick<
  Tables<"client_closures">,
  "id" | "company_id" | "label" | "start_date" | "end_date" | "notes"
>

type CalendarEventRecord = Pick<
  Tables<"calendar_events">,
  | "id"
  | "title"
  | "event_type"
  | "status"
  | "starts_at"
  | "ends_at"
  | "all_day"
  | "description"
  | "company_id"
>

const CLIENT_FOLLOW_UP_EVENT_TYPES = [
  "suivi_mission_client",
  "rdv_client_suivi",
] as const

const COLLABORATOR_FOLLOW_UP_EVENT_TYPES = [
  "suivi_mission_collab",
] as const

const TIMELINE_EVENT_TYPES = [
  ...CLIENT_FOLLOW_UP_EVENT_TYPES,
  ...COLLABORATOR_FOLLOW_UP_EVENT_TYPES,
] as const

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function isJsonRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getMetadataDate(metadata: Json, keys: string[]): string | null {
  if (!isJsonRecord(metadata)) return null

  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10)
    }
  }

  return null
}

function getDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function mapCompany(company: CompanyRecord | null): MissionPlanningCompany {
  return {
    id: company?.id ?? null,
    name: company?.name ?? "Compte non renseigné",
    sector: company?.sector ?? null,
    hqLocation: company?.hq_location ?? null,
  }
}

function mapPerson(person: PersonRecord | null): MissionPlanningPerson | null {
  if (!person) return null

  return {
    id: person.id,
    fullName: person.full_name,
    firstName: person.first_name,
    lastName: person.last_name,
  }
}

function mapCollaborator(
  collaborator: CollaboratorRecord | null
): MissionPlanningCollaborator | null {
  if (!collaborator) return null

  return {
    id: collaborator.id,
    employeeRef: collaborator.employee_ref,
    currentTitle: collaborator.current_title,
    practice: collaborator.practice,
    seniority: collaborator.seniority,
    availability: collaborator.availability,
    person: mapPerson(pickOne(collaborator.persons)),
  }
}

function mapRevenue(
  row: RevenueRow | null | undefined
): MissionPlanningQuarterlyRevenue | null {
  if (!row) return null

  return {
    quarterLabel: row.quarter_label,
    quarterStart: row.quarter_start,
    revenue: row.revenue,
    grossMargin: row.gross_margin,
    grossMarginPct: row.gross_margin_pct,
    billableDays: row.billable_days,
  }
}

async function getRevenueByMission(
  missionIds: string[]
): Promise<Map<string, MissionPlanningQuarterlyRevenue>> {
  const revenueByMission = new Map<string, MissionPlanningQuarterlyRevenue>()
  if (missionIds.length === 0) return revenueByMission

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("v_mission_quarterly_revenue")
    .select(`
      mission_id,
      quarter_label,
      quarter_start,
      revenue,
      gross_margin,
      gross_margin_pct,
      billable_days
    `)
    .in("mission_id", missionIds)
    .order("quarter_start", { ascending: false })

  if (error) {
    console.error(
      "Supabase error fetching mission quarterly revenue:",
      error.message,
      error.code,
      error.details,
      error.hint
    )
    return revenueByMission
  }

  for (const item of (data ?? []) as RevenueRow[]) {
    if (!item.mission_id || revenueByMission.has(item.mission_id)) continue
    const mappedRevenue = mapRevenue(item)
    if (mappedRevenue) revenueByMission.set(item.mission_id, mappedRevenue)
  }

  return revenueByMission
}

function pushGroupedEvent(
  target: Map<string, MissionPlanningTimelineEvent[]>,
  key: string | null | undefined,
  event: MissionPlanningTimelineEvent
) {
  if (!key) return

  const existing = target.get(key)
  if (existing) {
    existing.push(event)
    return
  }

  target.set(key, [event])
}

function buildAbsenceEvent(
  absence: CollaboratorAbsenceRecord
): MissionPlanningTimelineEvent | null {
  const startDate = getDateOnly(absence.start_date)
  if (!startDate) return null

  return {
    id: `absence-${absence.id}`,
    sourceId: absence.id,
    sourceType: "collaborator_absence",
    category: "absence",
    title: absence.absence_type,
    startDate,
    endDate: getDateOnly(absence.end_date) ?? startDate,
    allDay: true,
    status: null,
    description: absence.notes,
    companyId: null,
    collaboratorId: absence.collaborator_id,
    calendarEventId: null,
  }
}

function buildClosureEvent(
  closure: ClientClosureRecord
): MissionPlanningTimelineEvent | null {
  const startDate = getDateOnly(closure.start_date)
  if (!startDate) return null

  return {
    id: `closure-${closure.id}`,
    sourceId: closure.id,
    sourceType: "client_closure",
    category: "client_closure",
    title: closure.label,
    startDate,
    endDate: getDateOnly(closure.end_date) ?? startDate,
    allDay: true,
    status: null,
    description: closure.notes,
    companyId: closure.company_id,
    collaboratorId: null,
    calendarEventId: null,
  }
}

function getCalendarEventCategory(
  eventType: string
): MissionPlanningTimelineEventCategory | null {
  if (
    (CLIENT_FOLLOW_UP_EVENT_TYPES as readonly string[]).includes(eventType)
  ) {
    return "client_follow_up"
  }

  if (
    (COLLABORATOR_FOLLOW_UP_EVENT_TYPES as readonly string[]).includes(eventType)
  ) {
    return "collaborator_follow_up"
  }

  return null
}

function buildCalendarTimelineEvent(
  event: CalendarEventRecord
): MissionPlanningTimelineEvent | null {
  const category = getCalendarEventCategory(event.event_type)
  const startDate = getDateOnly(event.starts_at)

  if (!category || !startDate) return null

  return {
    id: `calendar-${event.id}`,
    sourceId: event.id,
    sourceType: "calendar_event",
    category,
    title: event.title,
    startDate,
    endDate: getDateOnly(event.ends_at) ?? startDate,
    allDay: event.all_day,
    status: event.status,
    description: event.description,
    companyId: event.company_id,
    collaboratorId: null,
    calendarEventId: event.id,
  }
}

async function getAbsencesByCollaborator(
  collaboratorIds: string[]
): Promise<Map<string, MissionPlanningTimelineEvent[]>> {
  const absencesByCollaborator = new Map<string, MissionPlanningTimelineEvent[]>()
  if (collaboratorIds.length === 0) return absencesByCollaborator

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("collaborator_absences")
    .select(`
      id,
      collaborator_id,
      absence_type,
      start_date,
      end_date,
      notes
    `)
    .in("collaborator_id", collaboratorIds)
    .order("start_date", { ascending: true })

  if (error) {
    console.error(
      "Supabase error fetching collaborator absences:",
      error.message,
      error.code,
      error.details,
      error.hint
    )
    return absencesByCollaborator
  }

  for (const absence of (data ?? []) as CollaboratorAbsenceRecord[]) {
    const timelineEvent = buildAbsenceEvent(absence)
    if (!timelineEvent) continue
    pushGroupedEvent(absencesByCollaborator, absence.collaborator_id, timelineEvent)
  }

  return absencesByCollaborator
}

async function getClosuresByCompany(
  companyIds: string[]
): Promise<Map<string, MissionPlanningTimelineEvent[]>> {
  const closuresByCompany = new Map<string, MissionPlanningTimelineEvent[]>()
  if (companyIds.length === 0) return closuresByCompany

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_closures")
    .select(`
      id,
      company_id,
      label,
      start_date,
      end_date,
      notes
    `)
    .in("company_id", companyIds)
    .order("start_date", { ascending: true })

  if (error) {
    console.error(
      "Supabase error fetching client closures:",
      error.message,
      error.code,
      error.details,
      error.hint
    )
    return closuresByCompany
  }

  for (const closure of (data ?? []) as ClientClosureRecord[]) {
    const timelineEvent = buildClosureEvent(closure)
    if (!timelineEvent) continue
    pushGroupedEvent(closuresByCompany, closure.company_id, timelineEvent)
  }

  return closuresByCompany
}

async function getCalendarEventsByCompany(
  companyIds: string[]
): Promise<Map<string, MissionPlanningTimelineEvent[]>> {
  const eventsByCompany = new Map<string, MissionPlanningTimelineEvent[]>()
  if (companyIds.length === 0) return eventsByCompany

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("calendar_events")
    .select(`
      id,
      title,
      event_type,
      status,
      starts_at,
      ends_at,
      all_day,
      description,
      company_id
    `)
    .in("company_id", companyIds)
    .in("event_type", [...TIMELINE_EVENT_TYPES])
    .order("starts_at", { ascending: true })

  if (error) {
    console.error(
      "Supabase error fetching mission planning calendar events:",
      error.message,
      error.code,
      error.details,
      error.hint
    )
    return eventsByCompany
  }

  for (const event of (data ?? []) as CalendarEventRecord[]) {
    const timelineEvent = buildCalendarTimelineEvent(event)
    if (!timelineEvent) continue
    pushGroupedEvent(eventsByCompany, event.company_id, timelineEvent)
  }

  return eventsByCompany
}

export async function getActiveMissionsPlanning(): Promise<MissionPlanningRow[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("missions")
      .select(`
        id,
        title,
        status,
        start_date,
        end_date,
        role_title,
        practice,
        seniority,
        tjm,
        cjm,
        gross_margin_pct,
        company_id,
        collaborator_id,
        metadata,
        companies (
          id,
          name,
          sector,
          hq_location
        ),
        collaborators (
          id,
          employee_ref,
          current_title,
          practice,
          seniority,
          availability,
          person_id,
          persons (
            id,
            full_name,
            first_name,
            last_name
          )
        )
      `)
      .eq("status", "active")
      .order("start_date", { ascending: true, nullsFirst: false })

    if (error) {
      console.error(
        "Supabase error fetching active missions planning:",
        error.message,
        error.code,
        error.details,
        error.hint
      )
      return []
    }

    const missions = (data ?? []) as MissionPlanningQueryRow[]
    const missionIds = missions.map((mission) => mission.id)
    const companyIds = Array.from(
      new Set(missions.map((mission) => mission.company_id).filter(Boolean))
    ) as string[]
    const collaboratorIds = Array.from(
      new Set(missions.map((mission) => mission.collaborator_id).filter(Boolean))
    ) as string[]

    const [
      revenueByMission,
      absencesByCollaborator,
      closuresByCompany,
      calendarEventsByCompany,
    ] = await Promise.all([
      getRevenueByMission(missionIds),
      getAbsencesByCollaborator(collaboratorIds),
      getClosuresByCompany(companyIds),
      getCalendarEventsByCompany(companyIds),
    ])

    return missions.map((mission) => {
      const company = pickOne(mission.companies)
      const collaborator = pickOne(mission.collaborators)
      const timelineEvents = [
        ...(mission.collaborator_id
          ? absencesByCollaborator.get(mission.collaborator_id) ?? []
          : []),
        ...(mission.company_id
          ? closuresByCompany.get(mission.company_id) ?? []
          : []),
        ...(mission.company_id
          ? calendarEventsByCompany.get(mission.company_id) ?? []
          : []),
      ].sort((left, right) => {
        if (left.startDate === right.startDate) {
          return left.id.localeCompare(right.id)
        }
        return left.startDate.localeCompare(right.startDate)
      })

      return {
        id: mission.id,
        title: mission.title,
        status: mission.status,
        startDate: mission.start_date,
        endDate: mission.end_date,
        renewalDate: getMetadataDate(mission.metadata, [
          "renewal_date",
          "renew_date",
          "renewalDate",
          "renewal_at",
          "renewalAt",
        ]),
        roleTitle: mission.role_title,
        practice: mission.practice,
        seniority: mission.seniority,
        tjm: mission.tjm,
        cjm: mission.cjm,
        grossMarginPct: mission.gross_margin_pct,
        companyId: mission.company_id,
        collaboratorId: mission.collaborator_id,
        metadata: mission.metadata,
        company: mapCompany(company),
        collaborator: mapCollaborator(collaborator),
        lastQuarterRevenue: revenueByMission.get(mission.id) ?? null,
        timelineEvents,
      }
    })
  } catch (err) {
    console.error("Unhandled error in getActiveMissionsPlanning:", err)
    return []
  }
}
