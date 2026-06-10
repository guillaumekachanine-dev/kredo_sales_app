import { createClient } from "@/lib/supabase/server"
import type { Json, Tables } from "@/types/database"
import type {
  MissionPlanningCollaborator,
  MissionPlanningCompany,
  MissionPlanningPerson,
  MissionPlanningQuarterlyRevenue,
  MissionPlanningRow,
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
  | "taci"
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
        taci,
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
    const revenueByMission = await getRevenueByMission(missions.map((mission) => mission.id))

    return missions.map((mission) => {
      const company = pickOne(mission.companies)
      const collaborator = pickOne(mission.collaborators)

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
        taci: mission.taci,
        grossMarginPct: mission.gross_margin_pct,
        companyId: mission.company_id,
        collaboratorId: mission.collaborator_id,
        metadata: mission.metadata,
        company: mapCompany(company),
        collaborator: mapCollaborator(collaborator),
        lastQuarterRevenue: revenueByMission.get(mission.id) ?? null,
      }
    })
  } catch (err) {
    console.error("Unhandled error in getActiveMissionsPlanning:", err)
    return []
  }
}
