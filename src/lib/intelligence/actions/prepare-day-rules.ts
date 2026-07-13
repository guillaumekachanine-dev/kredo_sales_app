import { getLocalDateKey, getTodayDateKey } from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { daysSince, parseDate } from "./shared"

export type PrepareDayPreparedness = "ready" | "needs_prep" | "no_context"

export type PrepareDayEvent = {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  eventType: string
  context: {
    companyName?: string
    companyLifecycle?: string
    contactName?: string
    contactRole?: string
    candidateName?: string
    candidateStep?: string
    lastInteractionDaysAgo?: number
    linkedOpportunityTitle?: string
  }
  preparedness: PrepareDayPreparedness
}

export type PrepareDayTaskDue = {
  id: string
  title: string
  priority: string
  isOverdue: boolean
  entityLabel?: string
}

export type PrepareDayAlert = {
  type: "cra_overdue" | "opp_deadline" | "mission_ending"
  message: string
  entityId: string
  link: string
}

export type PrepareDayRulesResult = {
  date: string
  events: PrepareDayEvent[]
  tasksDue: PrepareDayTaskDue[]
  alerts: PrepareDayAlert[]
}

export type PrepareDaySourceEvent = {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  eventType: string
  companyId: string | null
  companyName: string | null
  companyLifecycle: string | null
  contactName: string | null
  contactRole: string | null
  candidateId: string | null
  candidateName: string | null
  candidateStep: string | null
  opportunityId: string | null
  opportunityTitle: string | null
}

export type PrepareDaySourceTask = {
  id: string
  title: string
  priority: string
  status: string
  dueDate: string | null
  entityType: string | null
  entityId: string | null
  entityLabel?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
}

export type PrepareDayInteraction = {
  companyId: string | null
  occurredAt: string
}

export type BuildPrepareDayInput = {
  now: string
  timezone?: string
  events: PrepareDaySourceEvent[]
  tasks: PrepareDaySourceTask[]
  interactions: PrepareDayInteraction[]
}

function latestInteractionByCompany(interactions: PrepareDayInteraction[]) {
  const latest = new Map<string, string>()
  for (const interaction of interactions) {
    if (!interaction.companyId) continue
    const current = latest.get(interaction.companyId)
    if (!current || interaction.occurredAt > current) latest.set(interaction.companyId, interaction.occurredAt)
  }
  return latest
}

function preparednessForEvent(
  event: PrepareDaySourceEvent,
  latestCompanyInteraction: Map<string, string>,
  now: Date,
): { preparedness: PrepareDayPreparedness; daysAgo?: number } {
  if (!event.companyId && !event.candidateId) return { preparedness: "no_context" }
  if (!event.companyId) return { preparedness: "ready" }

  const daysAgo = daysSince(latestCompanyInteraction.get(event.companyId), now)
  if (daysAgo !== null && daysAgo < 7) return { preparedness: "ready", daysAgo }
  return { preparedness: "needs_prep", daysAgo: daysAgo ?? undefined }
}

export function buildPrepareDay(input: BuildPrepareDayInput): PrepareDayRulesResult {
  const timezone = input.timezone ?? AGENDA_V1_TIMEZONE
  const now = parseDate(input.now) ?? new Date()
  const today = getTodayDateKey(input.now, timezone)
  const latestCompanyInteraction = latestInteractionByCompany(input.interactions)

  const events = input.events
    .filter((event) => getLocalDateKey(event.startsAt, timezone) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 10)
    .map<PrepareDayEvent>((event) => {
      const readiness = preparednessForEvent(event, latestCompanyInteraction, now)
      return {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        eventType: event.eventType,
        context: {
          companyName: event.companyName ?? undefined,
          companyLifecycle: event.companyLifecycle ?? undefined,
          contactName: event.contactName ?? undefined,
          contactRole: event.contactRole ?? undefined,
          candidateName: event.candidateName ?? undefined,
          candidateStep: event.candidateStep ?? undefined,
          lastInteractionDaysAgo: readiness.daysAgo,
          linkedOpportunityTitle: event.opportunityTitle ?? undefined,
        },
        preparedness: readiness.preparedness,
      }
    })

  const tasksDue = input.tasks
    .filter((task) => task.status !== "done" && task.status !== "completed" && task.dueDate !== null && task.dueDate <= today)
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
      return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4) || (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    })
    .slice(0, 10)
    .map<PrepareDayTaskDue>((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      isOverdue: Boolean(task.dueDate && task.dueDate < today),
      entityLabel: task.entityLabel ?? undefined,
    }))

  const alerts = input.tasks
    .filter((task) => task.status !== "done" && task.status !== "completed" && task.dueDate !== null && task.dueDate <= today)
    .flatMap<PrepareDayAlert>((task) => {
      const type = task.entityType ?? task.linkedEntityType
      const id = task.entityId ?? task.linkedEntityId
      if (!id) return []
      if (type === "opportunity") {
        return [{
          type: "opp_deadline",
          message: `Échéance opportunité à traiter : ${task.title}`,
          entityId: id,
          link: `/missions/opps/${id}`,
        }]
      }
      if (type === "mission") {
        return [{
          type: "mission_ending",
          message: `Point mission à traiter : ${task.title}`,
          entityId: id,
          link: `/missions/actives/${id}`,
        }]
      }
      if (task.title.toLowerCase().includes("cra")) {
        return [{
          type: "cra_overdue",
          message: `CRA à traiter : ${task.title}`,
          entityId: id,
          link: "/consultants/activite-conges",
        }]
      }
      return []
    })
    .slice(0, 10)

  return { date: today, events, tasksDue, alerts }
}
