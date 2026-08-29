import "server-only"

import { createClient } from "@/lib/supabase/server"
import { buildEngagementsActivityAnalytics } from "@/components/missions/engagements/engagements-activity-utils"
import type {
  ActivityClosureSource,
  ActivityMissionSource,
  ActivityReportSource,
  EngagementsActivityAnalytics,
} from "@/components/missions/engagements/engagements-activity-types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader dédié à la vue « Activité & congés » du shell Engagements (Desktop).
//
//  Ne charge QUE ce dont la vue a besoin (HANDOFF §15) :
//   • missions AT actives (mêmes lignes que /missions/actives : status = 'active')
//   • leurs CRA de l'année civile en cours
//   • les fermetures de sites des clients concernés
//
//  N'ouvre JAMAIS `collaborator_compensation` (rémunération confidentielle) ni
//  `collaborator_absences` : la donnée d'absence imprévue exploitée est
//  `mission_activity_reports.sick_days`, seule à porter les snapshots TJM/CJM.
// ─────────────────────────────────────────────────────────────────────────────

interface DBPerson {
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

interface DBCompany {
  id: string
  name: string | null
}

interface DBMissionRow {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
  gross_margin_pct: number | null
  tjm: number | null
  cjm: number | null
  company_id: string | null
  companies: DBCompany | DBCompany[] | null
  collaborators:
    | { persons: DBPerson | DBPerson[] | null }
    | { persons: DBPerson | DBPerson[] | null }[]
    | null
}

interface DBReportRow {
  id: string
  mission_id: string
  period_start: string
  period_end: string
  status: string
  billable_days: number | null
  business_days: number | null
  pto_days: number | null
  sick_days: number | null
  non_billable_days: number | null
  activity_rate_percent: number | null
  tjm_snapshot: number | null
  cjm_snapshot: number | null
}

interface DBClosureRow {
  id: string
  company_id: string | null
  label: string
  start_date: string
  end_date: string
  is_recurring: boolean | null
  companies: DBCompany | DBCompany[] | null
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function personName(person: DBPerson | null): string {
  if (!person) return "Collaborateur non renseigné"
  return (
    person.full_name?.trim() ||
    `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
    "Collaborateur non renseigné"
  )
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function getEngagementsActivityAnalytics(): Promise<EngagementsActivityAnalytics> {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data: missionRows, error: missionsError } = await supabase
    .from("missions")
    .select(
      `
      id,
      title,
      start_date,
      end_date,
      gross_margin_pct,
      tjm,
      cjm,
      company_id,
      companies ( id, name ),
      collaborators ( persons ( full_name, first_name, last_name ) )
    `,
    )
    .eq("status", "active")
    .order("start_date", { ascending: false })

  if (missionsError) {
    console.error("[getEngagementsActivityAnalytics] missions", missionsError.message)
    return buildEngagementsActivityAnalytics({
      now,
      issues: ["Lecture des missions actives indisponible"],
      missions: [],
      reports: [],
      closures: [],
    })
  }

  const missions = ((missionRows as unknown as DBMissionRow[]) ?? []).map(
    (row): ActivityMissionSource => {
      const company = pickOne(row.companies)
      const collaborator = pickOne(row.collaborators)
      const person = pickOne(collaborator?.persons ?? null)
      return {
        id: row.id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        companyId: row.company_id,
        companyName: company?.name ?? "Client non renseigné",
        collaboratorName: person ? personName(person) : null,
        grossMarginPct: row.gross_margin_pct === null ? null : Number(row.gross_margin_pct),
        tjm: num(row.tjm),
        cjm: num(row.cjm),
      }
    },
  )

  const missionIds = missions.map((mission) => mission.id)
  const companyIds = Array.from(
    new Set(missions.map((mission) => mission.companyId).filter((id): id is string => Boolean(id))),
  )

  const [reportsResult, closuresResult] = await Promise.all([
    missionIds.length
      ? supabase
          .from("mission_activity_reports")
          .select(
            `
            id,
            mission_id,
            period_start,
            period_end,
            status,
            billable_days,
            business_days,
            pto_days,
            sick_days,
            non_billable_days,
            activity_rate_percent,
            tjm_snapshot,
            cjm_snapshot
          `,
          )
          .in("mission_id", missionIds)
          .gte("period_start", yearStart)
          .lte("period_start", yearEnd)
          .order("period_start", { ascending: true })
      : Promise.resolve({ data: [] as DBReportRow[], error: null }),
    companyIds.length
      ? supabase
          .from("client_closures")
          .select(
            `
            id,
            company_id,
            label,
            start_date,
            end_date,
            is_recurring,
            companies ( id, name )
          `,
          )
          .in("company_id", companyIds)
          .gte("end_date", yearStart)
          .lte("start_date", yearEnd)
          .order("start_date", { ascending: true })
      : Promise.resolve({ data: [] as DBClosureRow[], error: null }),
  ])

  const issues: string[] = []
  if (reportsResult.error) {
    console.error("[getEngagementsActivityAnalytics] CRA", reportsResult.error.message)
    issues.push("Lecture des CRA indisponible")
  }
  if (closuresResult.error) {
    console.error("[getEngagementsActivityAnalytics] closures", closuresResult.error.message)
    issues.push("Lecture des fermetures clients indisponible")
  }

  const reports = ((reportsResult.data as unknown as DBReportRow[]) ?? []).map(
    (row): ActivityReportSource => ({
      id: row.id,
      missionId: row.mission_id,
      periodStart: row.period_start.slice(0, 10),
      periodEnd: row.period_end.slice(0, 10),
      status: row.status,
      billableDays: num(row.billable_days),
      businessDays: num(row.business_days),
      ptoDays: num(row.pto_days),
      sickDays: num(row.sick_days),
      nonBillableDays: num(row.non_billable_days),
      activityRatePercent:
        row.activity_rate_percent === null ? null : Number(row.activity_rate_percent),
      tjmSnapshot: num(row.tjm_snapshot),
      cjmSnapshot: num(row.cjm_snapshot),
    }),
  )

  const closures = ((closuresResult.data as unknown as DBClosureRow[]) ?? []).map(
    (row): ActivityClosureSource => ({
      id: row.id,
      companyId: row.company_id,
      companyName: pickOne(row.companies)?.name ?? "Client non renseigné",
      label: row.label,
      startDate: row.start_date.slice(0, 10),
      endDate: row.end_date.slice(0, 10),
      isRecurring: Boolean(row.is_recurring),
    }),
  )

  return buildEngagementsActivityAnalytics({ now, issues, missions, reports, closures })
}
