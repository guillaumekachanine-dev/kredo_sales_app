import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database.types"
import {
  mapRecruitmentStatusToStage,
  type RecruitmentStageKey,
} from "@/lib/recruitment/recruitment-stages"

type Relation<T> = T | T[] | null

type CompanyRecord = {
  id: string
  name: string | null
  website: string | null
  metadata: Json | null
}

type OpportunityRecord = {
  id: string
  title: string | null
  priority: string | null
  practice: string | null
  start_date: string | null
  target_daily_rate: number | null
  company: Relation<CompanyRecord>
}

type CollaboratorRecord = {
  id: string
  current_title: string | null
  practice: string | null
  seniority: string | null
}

type PersonRecord = {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  collaborators: CollaboratorRecord[] | null
}

type CandidateRecord = {
  id: string
  status: string
  source: string | null
  seniority: string | null
  expected_daily_rate: number | null
  expected_salary: number | null
  availability: string | null
  summary: string | null
  current_title: string | null
  person: Relation<PersonRecord>
}

type PositioningRecord = {
  id: string
  status: string
  created_at: string
  updated_at: string
  proposed_at: string | null
  sent_to_client_at: string | null
  status_changed_at: string | null
  positioning_origin: string | null
  next_action: string | null
  comment: string | null
  opportunity: OpportunityRecord | null
  candidate: CandidateRecord | null
}

type CalendarEventRecord = {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  description: string | null
  candidate_id: string | null
  opportunity_id: string | null
  company_id: string | null
}

export type RecruitmentPlanningMilestoneType =
  | "identification"
  | "prequalification"
  | "manager_interview"
  | "tech_test"
  | "hiring_offer"
  | "signature"
  | "start"

export interface RecruitmentPlanningMilestone {
  key: string
  type: RecruitmentPlanningMilestoneType
  label: string
  date: string
  status: "completed" | "planned" | "cancelled"
  description: string | null
  eventId: string | null
}

export interface RecruitmentWorkspaceRow {
  id: string
  candidateId: string
  candidateName: string
  currentTitle: string | null
  seniority: string | null
  practice: string | null
  source: string | null
  candidateStatus: string
  positioningStatus: string
  stageKey: RecruitmentStageKey
  isCollaborator: boolean
  expectedSalary: number | null
  expectedDailyRate: number | null
  availability: string | null
  summary: string | null
  createdAt: string
  updatedAt: string
  proposedAt: string | null
  sentToClientAt: string | null
  nextAction: string | null
  comment: string | null
  positioningOrigin: string | null
  opportunityId: string
  opportunityTitle: string
  opportunityPriority: string | null
  opportunityStartDate: string | null
  targetDailyRate: number | null
  companyId: string | null
  clientName: string
  clientWebsite: string | null
  clientLogoPath: string | null
  planningMilestones: RecruitmentPlanningMilestone[]
}

function pickOne<T>(value: Relation<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function buildFullName(person: PersonRecord | null) {
  const composed = `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim()
  return person?.full_name?.trim() || composed || "Candidat non renseigné"
}

function extractLogoPath(metadata: Json | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const record = metadata as Record<string, unknown>
  return typeof record.logo_path === "string" ? record.logo_path : null
}

function toMilestoneStatus(
  dateValue: string,
  rawStatus?: string | null,
): "completed" | "planned" | "cancelled" {
  if (rawStatus === "cancelled") return "cancelled"
  if (rawStatus === "completed") return "completed"
  return new Date(dateValue).getTime() > Date.now() ? "planned" : "completed"
}

function matchesAny(text: string, values: readonly string[]) {
  return values.some((value) => text.includes(value))
}

function eventText(event: CalendarEventRecord) {
  return `${event.title} ${event.description ?? ""}`.toLowerCase()
}

function takeFirstMatchingEvent(
  events: CalendarEventRecord[],
  usedIds: Set<string>,
  predicate: (event: CalendarEventRecord, normalizedText: string) => boolean,
) {
  const event = events.find((item) => !usedIds.has(item.id) && predicate(item, eventText(item)))
  if (event) usedIds.add(event.id)
  return event ?? null
}

function buildPlanningMilestones(
  row: Omit<RecruitmentWorkspaceRow, "planningMilestones">,
  scopedEvents: CalendarEventRecord[],
): RecruitmentPlanningMilestone[] {
  const milestones: RecruitmentPlanningMilestone[] = [
    {
      key: `${row.id}-identification`,
      type: "identification",
      label: "Identification",
      date: row.createdAt,
      status: toMilestoneStatus(row.createdAt),
      description: row.comment || "Profil identifié sur le besoin.",
      eventId: null,
    },
  ]
  const usedIds = new Set<string>()

  const prequalification = takeFirstMatchingEvent(
    scopedEvents,
    usedIds,
    (event, text) =>
      event.event_type === "preparation_candidat" ||
      (event.event_type === "entretien_candidat" &&
        matchesAny(text, ["prequal", "préqual", "qualif", "fit", "culture", "sourcing"])),
  )

  if (prequalification) {
    milestones.push({
      key: `${row.id}-prequalification`,
      type: "prequalification",
      label: "Préqualification",
      date: prequalification.starts_at,
      status: toMilestoneStatus(prequalification.starts_at, prequalification.status),
      description: prequalification.description,
      eventId: prequalification.id,
    })
  }

  const managerInterview = takeFirstMatchingEvent(
    scopedEvents,
    usedIds,
    (event, text) =>
      event.event_type === "entretien_rh" ||
      matchesAny(text, ["manager", "rh", "practice"]),
  )

  if (managerInterview) {
    milestones.push({
      key: `${row.id}-manager`,
      type: "manager_interview",
      label: "Entretien manager",
      date: managerInterview.starts_at,
      status: toMilestoneStatus(managerInterview.starts_at, managerInterview.status),
      description: managerInterview.description,
      eventId: managerInterview.id,
    })
  }

  const techTest = takeFirstMatchingEvent(
    scopedEvents,
    usedIds,
    (_, text) => matchesAny(text, ["tech", "test", "coding", "case", "assessment"]),
  )

  if (techTest) {
    milestones.push({
      key: `${row.id}-tech`,
      type: "tech_test",
      label: "Tests techniques",
      date: techTest.starts_at,
      status: toMilestoneStatus(techTest.starts_at, techTest.status),
      description: techTest.description,
      eventId: techTest.id,
    })
  }

  const hiringOffer = takeFirstMatchingEvent(
    scopedEvents,
    usedIds,
    (_, text) => matchesAny(text, ["offre", "proposition", "proposal", "embauche"]),
  )

  if (hiringOffer) {
    milestones.push({
      key: `${row.id}-offer`,
      type: "hiring_offer",
      label: "Proposition d'embauche",
      date: hiringOffer.starts_at,
      status: toMilestoneStatus(hiringOffer.starts_at, hiringOffer.status),
      description: hiringOffer.description,
      eventId: hiringOffer.id,
    })
  }

  const signature = takeFirstMatchingEvent(
    scopedEvents,
    usedIds,
    (_, text) => matchesAny(text, ["signature", "contrat", "contract"]),
  )

  if (signature) {
    milestones.push({
      key: `${row.id}-signature`,
      type: "signature",
      label: "Signature",
      date: signature.starts_at,
      status: toMilestoneStatus(signature.starts_at, signature.status),
      description: signature.description,
      eventId: signature.id,
    })
  }

  if (row.opportunityStartDate) {
    milestones.push({
      key: `${row.id}-start`,
      type: "start",
      label: "Démarrage",
      date: row.opportunityStartDate,
      status: toMilestoneStatus(row.opportunityStartDate),
      description: `Démarrage prévu sur ${row.opportunityTitle}.`,
      eventId: null,
    })
  }

  return milestones.sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  )
}

export async function getRecruitmentWorkspace() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("opportunity_candidates")
    .select(`
      id,
      status,
      created_at,
      updated_at,
      proposed_at,
      sent_to_client_at,
      status_changed_at,
      positioning_origin,
      next_action,
      comment,
      opportunity:opportunities (
        id,
        title,
        priority,
        practice,
        start_date,
        target_daily_rate,
        company:companies (
          id,
          name,
          website,
          metadata
        )
      ),
      candidate:candidates (
        id,
        status,
        source,
        seniority,
        expected_daily_rate,
        expected_salary,
        availability,
        summary,
        current_title,
        person:persons (
          id,
          first_name,
          last_name,
          full_name,
          collaborators (
            id,
            current_title,
            practice,
            seniority
          )
        )
      )
    `)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("[recruitment] Failed to load recruitment workspace:", error)
    return [] as RecruitmentWorkspaceRow[]
  }

  const positionings = (data ?? []) as unknown as PositioningRecord[]
  const candidateIds = [...new Set(positionings.map((item) => item.candidate?.id).filter(Boolean))] as string[]
  const candidatePositioningCount = new Map<string, number>()

  positionings.forEach((item) => {
    const candidateId = item.candidate?.id
    if (!candidateId) return
    candidatePositioningCount.set(
      candidateId,
      (candidatePositioningCount.get(candidateId) ?? 0) + 1,
    )
  })

  let eventsByCandidate = new Map<string, CalendarEventRecord[]>()

  if (candidateIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("calendar_events")
      .select(
        "id, title, event_type, status, starts_at, ends_at, description, candidate_id, opportunity_id, company_id",
      )
      .in("candidate_id", candidateIds)
      .order("starts_at", { ascending: true })

    if (eventsError) {
      console.error("[recruitment] Failed to load candidate events:", eventsError)
    } else {
      eventsByCandidate = (eventsData ?? []).reduce<Map<string, CalendarEventRecord[]>>(
        (acc, event) => {
          if (!event.candidate_id) return acc
          const current = acc.get(event.candidate_id) ?? []
          current.push(event as CalendarEventRecord)
          acc.set(event.candidate_id, current)
          return acc
        },
        new Map<string, CalendarEventRecord[]>(),
      )
    }
  }

  return positionings.flatMap((item) => {
    const candidate = item.candidate
    const person = pickOne(candidate?.person ?? null)
    const collaborator = person?.collaborators?.[0] ?? null
    const opportunity = item.opportunity
    const company = pickOne(opportunity?.company ?? null)

    if (!candidate || !opportunity) return []

    const candidateId = candidate.id
    const companyId = company?.id ?? null
    const isCollaborator =
      normalizeText(candidate.source) === "collaborateur" || Boolean(collaborator)

    const baseRow = {
      id: item.id,
      candidateId,
      candidateName: buildFullName(person),
      currentTitle: candidate.current_title ?? collaborator?.current_title ?? null,
      seniority: collaborator?.seniority ?? candidate.seniority ?? null,
      practice: opportunity.practice ?? collaborator?.practice ?? null,
      source: candidate.source,
      candidateStatus: candidate.status,
      positioningStatus: item.status,
      stageKey: mapRecruitmentStatusToStage(item.status),
      isCollaborator,
      expectedSalary: candidate.expected_salary,
      expectedDailyRate: candidate.expected_daily_rate,
      availability: candidate.availability,
      summary: candidate.summary,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      proposedAt: item.proposed_at,
      sentToClientAt: item.sent_to_client_at,
      nextAction: item.next_action,
      comment: item.comment,
      positioningOrigin: item.positioning_origin,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title?.trim() || "Besoin sans titre",
      opportunityPriority: opportunity.priority,
      opportunityStartDate: opportunity.start_date,
      targetDailyRate: opportunity.target_daily_rate,
      companyId,
      clientName: company?.name?.trim() || "Client inconnu",
      clientWebsite: company?.website ?? null,
      clientLogoPath: extractLogoPath(company?.metadata ?? null),
    } satisfies Omit<RecruitmentWorkspaceRow, "planningMilestones">

    const scopedEvents = (eventsByCandidate.get(candidateId) ?? []).filter((event) => {
      if (event.opportunity_id && event.opportunity_id === opportunity.id) return true
      if (!event.opportunity_id && event.company_id && event.company_id === companyId) return true
      if (!event.opportunity_id && !event.company_id) {
        return (candidatePositioningCount.get(candidateId) ?? 0) === 1
      }
      return false
    })

    return [
      {
        ...baseRow,
        planningMilestones: buildPlanningMilestones(baseRow, scopedEvents),
      },
    ]
  })
}
