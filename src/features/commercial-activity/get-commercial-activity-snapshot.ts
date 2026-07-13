import { createClient } from "@/lib/supabase/server"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { getLocalDateKey, getWeekStartDateKey } from "@/lib/agenda/agenda-temporal"
import { isIncludedNature, resolveCommercialActivityNature } from "./commercial-activity-category"
import type {
  CommercialActivityCategory,
  CommercialActivityFilters,
  CommercialActivityNature,
  CommercialActivitySnapshot,
} from "./commercial-activity-types"

type EventRow = {
  id: string
  status: string
  event_type: string
  starts_at: string
  ends_at: string
  metadata: Record<string, unknown> | null
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  candidate_id: string | null
  opportunity_candidate_id: string | null
  mission_id: string | null
}
type InteractionRow = {
  id: string
  calendar_event_id: string | null
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  type: string
  occurred_at: string
}
type OpportunityRow = {
  id: string
  company_id: string | null
  stage: string
  created_at: string
  opened_at: string | null
  closed_at: string | null
  estimated_gain: number | string | null
  acv: number | string | null
}
type OpportunityCandidateRow = {
  opportunity_id: string
  sent_to_client_at: string | null
  status: string
  status_changed_at: string | null
}
type HiringMilestoneRow = {
  step: string
  result: string
  completed_at: string | null
}
type CompanyRow = { id: string; name: string; lifecycle_status: string }

const NATURES: CommercialActivityNature[] = ["prospection", "client_active", "recruitment", "management", "internal"]
const MS_DAY = 86_400_000

function parseDate(value: string, label: string) {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} invalide`)
  return parsed
}

function shiftPeriod(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - duration), to: from }
}

export function getCommercialActivityGrain(from: string, to: string): CommercialActivitySnapshot["range"]["grain"] {
  const days = (parseDate(to, "Fin").getTime() - parseDate(from, "Début").getTime()) / MS_DAY
  if (days <= 31) return "day"
  if (days <= 180) return "week"
  return "month"
}

export function getCommercialActivityDurationHours(startsAt: string, endsAt: string): number | null {
  const duration = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000
  return Number.isFinite(duration) && duration >= 0 ? duration : null
}

export function percentageComparison(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  const value = ((current - previous) / previous) * 100
  return Number.isFinite(value) ? value : null
}

function isWithin(value: string | null, from: Date, to: Date) {
  if (!value) return false
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) && parsed >= from.getTime() && parsed < to.getTime()
}

function normalizeNumber(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Interactions enrich outcomes; a linked calendar event is never a second activity. */
export function isStandaloneInteractionActivity(calendarEventId: string | null) {
  return calendarEventId === null
}

export function rankCommercialActivityAccounts(accounts: CommercialActivitySnapshot["accounts"]) {
  return [...accounts]
    .sort((left, right) => right.completedActivities - left.completedActivities || right.completedHours - left.completedHours)
    .slice(0, 10)
}

function getBucketKey(value: string, grain: CommercialActivitySnapshot["range"]["grain"]) {
  const day = getLocalDateKey(value, AGENDA_V1_TIMEZONE)
  if (grain === "day") return day
  if (grain === "week") return getWeekStartDateKey(day)
  return `${day.slice(0, 7)}-01`
}

function labelBucket(key: string, grain: CommercialActivitySnapshot["range"]["grain"]) {
  const date = new Date(`${key}T12:00:00Z`)
  if (grain === "day") return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
  if (grain === "week") return `S. ${getWeekStartDateKey(key).slice(8)}`
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date)
}

function incrementDateKey(key: string, grain: CommercialActivitySnapshot["range"]["grain"]) {
  const date = new Date(`${key}T00:00:00Z`)
  if (grain === "day") date.setUTCDate(date.getUTCDate() + 1)
  if (grain === "week") date.setUTCDate(date.getUTCDate() + 7)
  if (grain === "month") date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function makeBucketKeys(from: string, to: string, grain: CommercialActivitySnapshot["range"]["grain"]) {
  const first = grain === "day" ? getLocalDateKey(from, AGENDA_V1_TIMEZONE) : getBucketKey(from, grain)
  const last = getBucketKey(new Date(new Date(to).getTime() - 1).toISOString(), grain)
  const keys: string[] = []
  for (let cursor = first; cursor <= last; cursor = incrementDateKey(cursor, grain)) keys.push(cursor)
  return keys
}

function categoryForEvent(event: EventRow, companyLifecycle: string | null): CommercialActivityCategory {
  return resolveCommercialActivityNature({
    metadata: event.metadata,
    eventType: event.event_type,
    missionId: event.mission_id,
    opportunityId: event.opportunity_id,
    candidateId: event.candidate_id,
    opportunityCandidateId: event.opportunity_candidate_id,
    companyLifecycle,
  })
}

async function resolveWorkspaceId() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Authentification requise")
  const { data: profile, error } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).single()
  if (error || !profile?.workspace_id) throw new Error("Espace de travail introuvable")
  return { supabase, workspaceId: profile.workspace_id }
}

export async function getCommercialActivitySnapshot(filters: CommercialActivityFilters): Promise<CommercialActivitySnapshot> {
  const currentFrom = parseDate(filters.from, "Début")
  const currentTo = parseDate(filters.to, "Fin")
  if (currentFrom >= currentTo) throw new Error("La période doit avoir une fin postérieure au début")
  const previous = shiftPeriod(currentFrom, currentTo)
  const { supabase, workspaceId } = await resolveWorkspaceId()
  const queryFrom = previous.from.toISOString()
  const queryTo = currentTo.toISOString()

  const [eventsResult, interactionsResult, opportunitiesResult, candidatesResult, milestonesResult] = await Promise.all([
    supabase.from("calendar_events").select("id,status,event_type,starts_at,ends_at,metadata,company_id,contact_id,opportunity_id,candidate_id,opportunity_candidate_id,mission_id").eq("workspace_id", workspaceId).gte("starts_at", queryFrom).lt("starts_at", queryTo),
    supabase.from("interactions").select("id,calendar_event_id,company_id,contact_id,opportunity_id,type,occurred_at").eq("workspace_id", workspaceId).gte("occurred_at", queryFrom).lt("occurred_at", queryTo),
    supabase.from("opportunities").select("id,company_id,stage,created_at,opened_at,closed_at,estimated_gain,acv").eq("workspace_id", workspaceId).or(`created_at.gte.${currentFrom.toISOString()},closed_at.gte.${currentFrom.toISOString()}`).lt("created_at", queryTo),
    supabase.from("opportunity_candidates").select("opportunity_id,sent_to_client_at,status,status_changed_at").eq("workspace_id", workspaceId).or(`sent_to_client_at.gte.${currentFrom.toISOString()},status_changed_at.gte.${currentFrom.toISOString()}`),
    supabase.from("candidate_hiring_milestones").select("step,result,completed_at").eq("workspace_id", workspaceId).gte("completed_at", currentFrom.toISOString()).lt("completed_at", currentTo.toISOString()),
  ])

  for (const result of [eventsResult, interactionsResult, opportunitiesResult, candidatesResult, milestonesResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const events = (eventsResult.data ?? []) as unknown as EventRow[]
  const interactions = (interactionsResult.data ?? []) as unknown as InteractionRow[]
  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityRow[]
  const candidateRows = (candidatesResult.data ?? []) as unknown as OpportunityCandidateRow[]
  const milestones = (milestonesResult.data ?? []) as unknown as HiringMilestoneRow[]
  const companyIds = Array.from(new Set([...events.map((event) => event.company_id), ...interactions.map((interaction) => interaction.company_id), ...opportunities.map((opportunity) => opportunity.company_id)].filter((id): id is string => Boolean(id))))
  const companiesResult = companyIds.length > 0
    ? await supabase.from("companies").select("id,name,lifecycle_status").eq("workspace_id", workspaceId).in("id", companyIds)
    : { data: [], error: null }
  if (companiesResult.error) throw new Error(companiesResult.error.message)
  const companies = new Map(((companiesResult.data ?? []) as unknown as CompanyRow[]).map((company) => [company.id, company]))

  const grain = getCommercialActivityGrain(filters.from, filters.to)
  const buckets = new Map(makeBucketKeys(filters.from, filters.to, grain).map((key) => [key, {
    key,
    label: labelBucket(key, grain),
    completedCount: 0,
    plannedCount: 0,
    completedHours: 0,
    plannedHours: 0,
    byNature: {} as CommercialActivitySnapshot["timeline"][number]["byNature"],
  }]))

  let unclassifiedEvents = 0
  let eventsWithoutCompany = 0
  let invalidDurationEvents = 0
  const activityByPeriod = {
    current: { completed: 0, planned: 0, hours: 0, accounts: new Set<string>() },
    previous: { completed: 0, planned: 0, hours: 0, accounts: new Set<string>() },
  }
  const accountRows = new Map<string, CommercialActivitySnapshot["accounts"][number]>()

  for (const event of events) {
    if (event.status === "cancelled") continue
    const period = isWithin(event.starts_at, currentFrom, currentTo) ? "current" : "previous"
    const company = event.company_id ? companies.get(event.company_id) : undefined
    const category = categoryForEvent(event, company?.lifecycle_status ?? null)
    if (period === "current" && category === "unclassified") unclassifiedEvents += 1
    if (period === "current" && !event.company_id) eventsWithoutCompany += 1
    const duration = getCommercialActivityDurationHours(event.starts_at, event.ends_at)
    if (duration === null) {
      if (period === "current") invalidDurationEvents += 1
      continue
    }
    if (!isIncludedNature(category, filters.nature)) continue
    const target = activityByPeriod[period]
    const isCompleted = event.status === "completed"
    const isScheduled = event.status === "scheduled"
    if (!isCompleted && !isScheduled) continue
    if (isCompleted) {
      target.completed += 1
      target.hours += duration
    } else {
      target.planned += 1
    }
    if (event.company_id) target.accounts.add(event.company_id)
    if (period !== "current") continue
    const bucket = buckets.get(getBucketKey(event.starts_at, grain))
    if (!bucket) continue
    if (isCompleted) {
      bucket.completedCount += 1
      bucket.completedHours += duration
      if (category !== "unclassified") {
        const existing = bucket.byNature[category] ?? { count: 0, hours: 0 }
        bucket.byNature[category] = { count: existing.count + 1, hours: existing.hours + duration }
      }
      if (event.company_id && company) {
        const row = accountRows.get(event.company_id) ?? { companyId: company.id, companyName: company.name, completedActivities: 0, completedHours: 0, contactsReached: 0, outcomesCount: 0, lastActivityAt: null }
        row.completedActivities += 1
        row.completedHours += duration
        row.lastActivityAt = !row.lastActivityAt || row.lastActivityAt < event.starts_at ? event.starts_at : row.lastActivityAt
        accountRows.set(event.company_id, row)
      }
    } else {
      bucket.plannedCount += 1
      bucket.plannedHours += duration
    }
  }

  let interactionsWithoutRelation = 0
  const currentInteractions = interactions.filter((interaction) => isWithin(interaction.occurred_at, currentFrom, currentTo))
  for (const interaction of interactions) {
    const period = isWithin(interaction.occurred_at, currentFrom, currentTo) ? "current" : "previous"
    if (!interaction.company_id && !interaction.contact_id && !interaction.opportunity_id && period === "current") interactionsWithoutRelation += 1
    // An interaction with a calendar_event_id is never added to activity volume or duration.
    if (!interaction.calendar_event_id && interaction.company_id) activityByPeriod[period].accounts.add(interaction.company_id)
    if (period === "current" && interaction.company_id && interaction.contact_id) {
      const company = companies.get(interaction.company_id)
      if (company) {
        const row = accountRows.get(company.id) ?? { companyId: company.id, companyName: company.name, completedActivities: 0, completedHours: 0, contactsReached: 0, outcomesCount: 0, lastActivityAt: null }
        row.contactsReached += 1
        accountRows.set(company.id, row)
      }
    }
  }

  const currentOpportunities = opportunities.filter((opportunity) => isWithin(opportunity.created_at, currentFrom, currentTo) || isWithin(opportunity.closed_at, currentFrom, currentTo))
  const prospectMeetings = currentInteractions.filter((interaction) => interaction.type === "rdv_client" && companies.get(interaction.company_id ?? "")?.lifecycle_status === "prospect").length
  const needsCreated = currentOpportunities.filter((opportunity) => isWithin(opportunity.created_at, currentFrom, currentTo) || isWithin(opportunity.opened_at, currentFrom, currentTo)).length
  const proposalsOrDefenses = currentInteractions.filter((interaction) => interaction.type === "proposition").length
  const cvsSent = candidateRows.filter((candidate) => isWithin(candidate.sent_to_client_at, currentFrom, currentTo)).length
  const candidateOrClientInterviews = currentInteractions.filter((interaction) => interaction.type === "entretien_client").length
    + candidateRows.filter((candidate) => candidate.status === "entretien_realise" && isWithin(candidate.status_changed_at, currentFrom, currentTo)).length
    + milestones.filter((milestone) => milestone.step === "entretien_manager" && milestone.result === "valide").length
  const opportunitiesWon = currentOpportunities.filter((opportunity) => opportunity.stage === "gagne" && isWithin(opportunity.closed_at, currentFrom, currentTo)).length
  const signatures = currentInteractions.filter((interaction) => interaction.type === "signature").length
    + milestones.filter((milestone) => milestone.step === "signature" && milestone.result === "valide").length
  const wonValue = currentOpportunities
    .filter((opportunity) => opportunity.stage === "gagne" && isWithin(opportunity.closed_at, currentFrom, currentTo))
    .reduce((total, opportunity) => total + normalizeNumber(opportunity.estimated_gain ?? opportunity.acv), 0)

  for (const interaction of currentInteractions) {
    if (!interaction.company_id) continue
    const company = companies.get(interaction.company_id)
    if (!company) continue
    const row = accountRows.get(company.id)
    if (!row) continue
    if (["rdv_client", "proposition", "envoi_cv", "entretien_client", "signature"].includes(interaction.type)) row.outcomesCount += 1
  }

  const distribution = NATURES.map((nature) => ({
    nature,
    count: Array.from(buckets.values()).reduce((total, bucket) => total + (bucket.byNature[nature]?.count ?? 0), 0),
    hours: Array.from(buckets.values()).reduce((total, bucket) => total + (bucket.byNature[nature]?.hours ?? 0), 0),
    sharePct: 0,
  }))
  const distributionTotal = distribution.reduce((total, item) => total + item.count, 0)
  for (const item of distribution) item.sharePct = distributionTotal === 0 ? 0 : (item.count / distributionTotal) * 100

  return {
    range: { from: filters.from, to: filters.to, grain },
    summary: {
      completedActivities: activityByPeriod.current.completed,
      plannedActivities: activityByPeriod.current.planned,
      completedHours: activityByPeriod.current.hours,
      activeAccounts: activityByPeriod.current.accounts.size,
      comparison: {
        completedActivitiesPct: percentageComparison(activityByPeriod.current.completed, activityByPeriod.previous.completed),
        completedHoursPct: percentageComparison(activityByPeriod.current.hours, activityByPeriod.previous.hours),
        activeAccountsPct: percentageComparison(activityByPeriod.current.accounts.size, activityByPeriod.previous.accounts.size),
      },
    },
    timeline: Array.from(buckets.values()),
    distribution,
    outcomes: { prospectMeetings, needsCreated, proposalsOrDefenses, cvsSent, candidateOrClientInterviews, opportunitiesWon, signatures, wonValue },
    accounts: rankCommercialActivityAccounts(Array.from(accountRows.values())),
    quality: { unclassifiedEvents, eventsWithoutCompany, interactionsWithoutRelation, invalidDurationEvents },
  }
}
