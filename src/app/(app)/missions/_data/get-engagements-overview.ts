import "server-only"

import { createClient } from "@/lib/supabase/server"
import { buildEngagementsOverview } from "@/components/missions/dashboard/engagements-overview-utils"
import type {
  EngagementsOverviewViewModel,
  OverviewBillingMilestone,
  OverviewCalendarEventSource,
} from "@/components/missions/dashboard/engagements-overview-types"
import type { Json } from "@/types/database"

type JsonRecord = Record<string, Json | undefined>

function isJsonRecord(value: Json | null): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function nullableString(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function nullableNumber(value: Json | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseBillingMilestones(value: Json): OverviewBillingMilestone[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!isJsonRecord(item)) return []
    return [{
      label: nullableString(item.label) ?? `Jalon ${index + 1}`,
      amount: nullableNumber(item.amount),
      dueDate: nullableString(item.due_date),
      invoicedAt: nullableString(item.invoiced_at),
    }]
  })
}

function getPersonName(value: unknown): string {
  const person = Array.isArray(value) ? value[0] : value
  if (!person || typeof person !== "object") return "Collaborateur non renseigné"
  const row = person as {
    full_name?: string | null
    first_name?: string | null
    last_name?: string | null
  }
  return row.full_name?.trim()
    || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim()
    || "Collaborateur non renseigné"
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export async function getEngagementsOverview(): Promise<EngagementsOverviewViewModel> {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const calendarStart = addDays(now, -30).toISOString()
  const calendarEnd = addDays(now, 31).toISOString()

  const [
    missionsResult,
    projectsResult,
    reportsResult,
    phasesResult,
    companiesResult,
    collaboratorsResult,
    compensationsResult,
    offersResult,
    practicesResult,
    calendarResult,
  ] = await Promise.all([
    supabase
      .from("missions")
      .select("id, title, start_date, end_date, practice, company_id, collaborator_id")
      .eq("status", "active"),
    supabase
      .from("projects")
      .select("id, title, start_date_planned, end_date_planned, company_id, offer_id, billing_milestones")
      .eq("status", "active"),
    supabase
      .from("mission_activity_reports")
      .select("id, mission_id, collaborator_id, status, period_start, period_end, billable_days, business_days, tjm_snapshot")
      .gte("period_start", yearStart)
      .lte("period_start", yearEnd),
    supabase
      .from("project_phases")
      .select("id, project_id, label, status, start_date_planned, end_date_planned"),
    supabase.from("companies").select("id, name"),
    supabase
      .from("collaborators")
      .select("id, persons(full_name, first_name, last_name)"),
    supabase
      .from("collaborator_compensation")
      .select("collaborator_id, taci, effective_from, effective_to"),
    supabase.from("offers").select("id, practice_id"),
    supabase.from("offer_practices").select("id, name"),
    supabase
      .from("calendar_events")
      .select("id, mission_id, metadata, title, event_type, status, starts_at")
      .gte("starts_at", calendarStart)
      .lte("starts_at", calendarEnd)
      .or("status.is.null,status.neq.cancelled"),
  ])

  if (missionsResult.error || projectsResult.error) {
    console.error("[getEngagementsOverview] Core read failed", {
      missions: missionsResult.error?.message,
      projects: projectsResult.error?.message,
    })
    throw new Error("Impossible de charger les engagements actifs.")
  }

  const resultEntries = [
    ["CRA", reportsResult],
    ["phases projet", phasesResult],
    ["clients", companiesResult],
    ["collaborateurs", collaboratorsResult],
    ["objectifs TACI", compensationsResult],
    ["offres", offersResult],
    ["practices", practicesResult],
    ["agenda", calendarResult],
  ] as const
  const issues = resultEntries.flatMap(([label, result]) => {
    if (!result.error) return []
    console.error(`[getEngagementsOverview] ${label}:`, result.error.message)
    return [`Lecture ${label} indisponible`]
  })

  const companyById = new Map((companiesResult.data ?? []).map((row) => [row.id, row.name]))
  const practiceById = new Map((practicesResult.data ?? []).map((row) => [row.id, row.name]))
  const offerPracticeById = new Map(
    (offersResult.data ?? []).map((row) => [row.id, practiceById.get(row.practice_id) ?? null]),
  )

  const missions = (missionsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    practice: row.practice,
    companyId: row.company_id,
    companyName: companyById.get(row.company_id) ?? "Client non renseigné",
    collaboratorId: row.collaborator_id,
  }))
  const projects = (projectsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startDate: row.start_date_planned,
    endDate: row.end_date_planned,
    companyId: row.company_id,
    companyName: companyById.get(row.company_id) ?? "Client non renseigné",
    practice: row.offer_id ? offerPracticeById.get(row.offer_id) ?? null : null,
    billingMilestones: parseBillingMilestones(row.billing_milestones),
  }))
  const activeProjectIds = new Set(projects.map((project) => project.id))
  const activeMissionIds = new Set(missions.map((mission) => mission.id))

  const calendarEvents = (calendarResult.data ?? []).flatMap<OverviewCalendarEventSource>((row) => {
    if (row.mission_id && activeMissionIds.has(row.mission_id)) {
      return [{
        id: row.id,
        entityType: "mission" as const,
        entityId: row.mission_id,
        title: row.title,
        eventType: row.event_type,
        status: row.status,
        startsAt: row.starts_at,
      }]
    }
    const projectId = isJsonRecord(row.metadata) ? nullableString(row.metadata.project_id) : null
    if (!projectId || !activeProjectIds.has(projectId)) return []
    return [{
      id: row.id,
      entityType: "project" as const,
      entityId: projectId,
      title: row.title,
      eventType: row.event_type,
      status: row.status,
      startsAt: row.starts_at,
    }]
  })

  return buildEngagementsOverview({
    now,
    issues,
    missions,
    projects,
    reports: (reportsResult.data ?? []).map((row) => ({
      id: row.id,
      missionId: row.mission_id,
      collaboratorId: row.collaborator_id,
      status: row.status,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      billableDays: Number(row.billable_days),
      businessDays: Number(row.business_days),
      tjmSnapshot: Number(row.tjm_snapshot),
    })),
    collaborators: (collaboratorsResult.data ?? []).map((row) => ({
      id: row.id,
      name: getPersonName(row.persons),
    })),
    compensations: (compensationsResult.data ?? []).map((row) => ({
      collaboratorId: row.collaborator_id,
      taci: Number(row.taci),
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
    })),
    projectPhases: (phasesResult.data ?? [])
      .filter((row) => activeProjectIds.has(row.project_id))
      .map((row) => ({
        id: row.id,
        projectId: row.project_id,
        label: row.label,
        status: row.status,
        startDate: row.start_date_planned,
        endDate: row.end_date_planned,
      })),
    calendarEvents,
  })
}
