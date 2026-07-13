import { scoreAgendaItem } from "@/lib/reports/weekly-manager/scoring"
import {
  asNumber,
  buildAgendaItem,
  daysBetween,
  daysSince,
  formatDayCount,
  parseDate,
} from "./shared"

const TERMINAL_OPPORTUNITY_STAGES = new Set(["gagne", "perdu", "abandonne", "win", "lost"])

export type ActionPriorityUrgency = "critical" | "high" | "moderate"
export type ActionPriorityEntityType = "opportunity" | "mission" | "company" | "collaborator"

export type ActionPriorityItem = {
  rank: number
  entityType: ActionPriorityEntityType
  entityId: string
  entityLabel: string
  action: string
  urgency: ActionPriorityUrgency
  impactReason: string
  link: string
  score: number
}

export type ActionPrioritiesMeta = {
  accountsWithoutRecentAction: number
  oppsStagnating: number
  missionsEndingSoon: number
  craNotValidated: number
}

export type ActionPrioritiesRulesResult = {
  items: ActionPriorityItem[]
  meta: ActionPrioritiesMeta
}

export type ActionPriorityOpportunity = {
  id: string
  title: string
  stage: string | null
  companyId: string | null
  companyName: string | null
  weightedGain: number | null
  estimatedGain: number | null
  nextActionAt: string | null
  targetCloseDate: string | null
  updatedAt: string
}

export type ActionPriorityMission = {
  id: string
  title: string
  companyName: string | null
  endDate: string | null
  status: string | null
  opportunityId: string | null
}

export type ActionPriorityAlert = {
  collaboratorId: string | null
  fullName: string | null
  periodStart: string | null
  alertCraNotValidated: boolean | null
  alertLowActivity: boolean | null
  alertLowMargin: boolean | null
  alertNegativeMargin: boolean | null
}

export type ActionPriorityInteraction = {
  companyId: string | null
  opportunityId?: string | null
  occurredAt: string
}

export type ActionPriorityAccountScore = {
  companyId: string | null
  companyName: string | null
  scoreBand: string | null
  scoreValue: number | null
  lifecycleContext: string | null
}

export type ActionPriorityCalendarEvent = {
  id: string
  title: string
  startsAt: string
  companyName: string | null
  hasPreparatoryTask: boolean
}

export type BuildActionPrioritiesInput = {
  now: string
  opportunities: ActionPriorityOpportunity[]
  missions: ActionPriorityMission[]
  alerts: ActionPriorityAlert[]
  interactions: ActionPriorityInteraction[]
  accountScores: ActionPriorityAccountScore[]
  calendarEvents: ActionPriorityCalendarEvent[]
}

function urgencyFromTier(tier: ReturnType<typeof scoreAgendaItem>["tier"]): ActionPriorityUrgency {
  if (tier === "critical") return "critical"
  if (tier === "high") return "high"
  return "moderate"
}

function commercialPriorityForAmount(amount: number): "normal" | "high" | "urgent" {
  if (amount >= 75_000) return "urgent"
  if (amount >= 25_000) return "high"
  return "normal"
}

function latestInteractionByCompany(interactions: ActionPriorityInteraction[]) {
  const latest = new Map<string, string>()
  for (const interaction of interactions) {
    if (!interaction.companyId) continue
    const current = latest.get(interaction.companyId)
    if (!current || interaction.occurredAt > current) latest.set(interaction.companyId, interaction.occurredAt)
  }
  return latest
}

function latestInteractionByOpportunity(interactions: ActionPriorityInteraction[]) {
  const latest = new Map<string, string>()
  for (const interaction of interactions) {
    if (!interaction.opportunityId) continue
    const current = latest.get(interaction.opportunityId)
    if (!current || interaction.occurredAt > current) latest.set(interaction.opportunityId, interaction.occurredAt)
  }
  return latest
}

function pushScored(
  items: ActionPriorityItem[],
  input: Omit<ActionPriorityItem, "rank" | "urgency" | "score"> & {
    scoreId: string
    sourceId: string
    sourceType: "opportunity" | "mission" | "calendar_event" | "derived"
    type: "deadline" | "scheduled_event" | "alert"
    domain: "commerce" | "missions" | "consultants" | "agenda"
    temporalState: "overdue" | "today" | "upcoming" | "ongoing"
    priority: "normal" | "high" | "urgent"
    alertKind?: "deadline_at_risk" | "overdue_task" | "week_tension"
  },
) {
  const scored = scoreAgendaItem(buildAgendaItem({
    id: input.scoreId,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    type: input.type,
    title: input.entityLabel,
    domain: input.domain,
    temporalState: input.temporalState,
    priority: input.priority,
    href: input.link,
    alertKind: input.alertKind,
  }))

  items.push({
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    action: input.action,
    impactReason: input.impactReason,
    link: input.link,
    rank: 0,
    urgency: urgencyFromTier(scored.tier),
    score: scored.rank,
  })
}

export function buildActionPriorities(input: BuildActionPrioritiesInput): ActionPrioritiesRulesResult {
  const now = parseDate(input.now) ?? new Date()
  const latestCompanyInteraction = latestInteractionByCompany(input.interactions)
  const latestOpportunityInteraction = latestInteractionByOpportunity(input.interactions)
  const items: ActionPriorityItem[] = []

  let oppsStagnating = 0
  for (const opportunity of input.opportunities) {
    if (opportunity.stage && TERMINAL_OPPORTUNITY_STAGES.has(opportunity.stage)) continue

    const latestTouch = latestOpportunityInteraction.get(opportunity.id) ?? (opportunity.companyId ? latestCompanyInteraction.get(opportunity.companyId) : undefined)
    const daysWithoutTouch = daysSince(latestTouch ?? opportunity.updatedAt, now)
    const daysToClose = opportunity.targetCloseDate ? daysBetween(now, opportunity.targetCloseDate) : Number.POSITIVE_INFINITY
    const nextActionDate = parseDate(opportunity.nextActionAt)
    const isNextActionOverdue = Boolean(nextActionDate && nextActionDate <= now)
    const isStagnating = (daysWithoutTouch ?? 0) > 15
    if (!isStagnating && daysToClose > 7 && !isNextActionOverdue) continue

    if (isStagnating) oppsStagnating += 1
    const amount = asNumber(opportunity.weightedGain ?? opportunity.estimatedGain)
    const companyPart = opportunity.companyName ? ` · ${opportunity.companyName}` : ""
    const temporalState = isNextActionOverdue ? "overdue" : daysToClose <= 7 ? "today" : "upcoming"
    const touchLabel = daysWithoutTouch === null ? "aucune interaction récente" : `dernier contact il y a ${daysWithoutTouch} jours`
    pushScored(items, {
      scoreId: `action-priority:opportunity:${opportunity.id}`,
      sourceId: opportunity.id,
      sourceType: daysToClose <= 7 ? "derived" : "opportunity",
      type: daysToClose <= 7 ? "alert" : "deadline",
      domain: "commerce",
      temporalState,
      priority: commercialPriorityForAmount(amount),
      alertKind: "deadline_at_risk",
      entityType: "opportunity",
      entityId: opportunity.id,
      entityLabel: `${opportunity.title}${companyPart}`,
      action: isNextActionOverdue
        ? `Traiter la prochaine action en retard — ${touchLabel}`
        : daysToClose <= 7
          ? `Sécuriser le closing — échéance ${formatDayCount(Math.max(0, daysToClose))}`
          : `Relancer — ${touchLabel}`,
      impactReason: amount > 0 ? `Pipe pondéré ${Math.round(amount / 1000)} k€` : `Stade ${opportunity.stage ?? "non qualifié"}`,
      link: `/missions/opps/${opportunity.id}`,
    })
  }

  let missionsEndingSoon = 0
  for (const mission of input.missions) {
    if (mission.status && mission.status !== "active") continue
    const daysToEnd = mission.endDate ? daysBetween(now, mission.endDate) : Number.POSITIVE_INFINITY
    if (daysToEnd > 60) continue
    missionsEndingSoon += 1
    pushScored(items, {
      scoreId: `action-priority:mission:${mission.id}`,
      sourceId: mission.id,
      sourceType: "mission",
      type: "deadline",
      domain: "missions",
      temporalState: daysToEnd <= 30 ? "today" : "upcoming",
      priority: daysToEnd <= 30 ? "urgent" : "high",
      entityType: "mission",
      entityId: mission.id,
      entityLabel: mission.companyName ? `${mission.title} · ${mission.companyName}` : mission.title,
      action: `Anticiper la fin de mission — ${formatDayCount(Math.max(0, daysToEnd))}`,
      impactReason: mission.opportunityId ? "Renouvellement ou suite déjà identifié à vérifier" : "Aucune suite liée à la mission",
      link: `/missions/actives/${mission.id}`,
    })
  }

  let craNotValidated = 0
  for (const alert of input.alerts) {
    if (!alert.collaboratorId) continue
    if (alert.alertCraNotValidated) {
      craNotValidated += 1
      pushScored(items, {
        scoreId: `action-priority:cra:${alert.collaboratorId}:${alert.periodStart ?? "current"}`,
        sourceId: alert.collaboratorId,
        sourceType: "derived",
        type: "alert",
        domain: "consultants",
        temporalState: "overdue",
        priority: "high",
        alertKind: "overdue_task",
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: alert.fullName ?? "Collaborateur",
        action: "Faire valider le CRA en retard",
        impactReason: alert.periodStart ? `Période ${alert.periodStart.slice(0, 7)}` : "CRA non validé",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    }
    if (alert.alertNegativeMargin || alert.alertLowMargin || alert.alertLowActivity) {
      pushScored(items, {
        scoreId: `action-priority:profitability:${alert.collaboratorId}:${alert.periodStart ?? "current"}`,
        sourceId: alert.collaboratorId,
        sourceType: "derived",
        type: "alert",
        domain: "consultants",
        temporalState: alert.alertNegativeMargin ? "today" : "upcoming",
        priority: alert.alertNegativeMargin ? "urgent" : "high",
        alertKind: "deadline_at_risk",
        entityType: "collaborator",
        entityId: alert.collaboratorId,
        entityLabel: alert.fullName ?? "Collaborateur",
        action: alert.alertNegativeMargin ? "Corriger la marge négative" : "Analyser l'activité ou la marge faible",
        impactReason: alert.alertNegativeMargin ? "Marge négative détectée" : alert.alertLowMargin ? "Marge sous le seuil" : "Activité sous le seuil",
        link: `/consultants/activite-conges?collaborator=${alert.collaboratorId}`,
      })
    }
  }

  let accountsWithoutRecentAction = 0
  for (const score of input.accountScores) {
    if (!score.companyId || !["A", "B"].includes(score.scoreBand ?? "")) continue
    const latestTouch = latestCompanyInteraction.get(score.companyId)
    const inactiveDays = daysSince(latestTouch, now)
    if (inactiveDays !== null && inactiveDays <= 30) continue
    accountsWithoutRecentAction += 1
    pushScored(items, {
      scoreId: `action-priority:account:${score.companyId}`,
      sourceId: score.companyId,
      sourceType: "derived",
      type: "alert",
      domain: "commerce",
      temporalState: "upcoming",
      priority: score.scoreBand === "A" ? "urgent" : "high",
      alertKind: "week_tension",
      entityType: "company",
      entityId: score.companyId,
      entityLabel: score.companyName ?? "Compte",
      action: inactiveDays === null ? "Planifier une action commerciale — aucun contact récent" : `Reprendre contact — inactif depuis ${inactiveDays} jours`,
      impactReason: `Compte bande ${score.scoreBand}${score.scoreValue !== null ? ` · score ${Math.round(score.scoreValue ?? 0)}` : ""}`,
      link: `/prospection/accounts/${score.companyId}`,
    })
  }

  for (const event of input.calendarEvents) {
    if (event.hasPreparatoryTask) continue
    const daysToEvent = daysBetween(now, event.startsAt)
    if (daysToEvent < 0 || daysToEvent > 7) continue
    pushScored(items, {
      scoreId: `action-priority:event:${event.id}`,
      sourceId: event.id,
      sourceType: "calendar_event",
      type: "scheduled_event",
      domain: "agenda",
      temporalState: daysToEvent === 0 ? "today" : "upcoming",
      priority: daysToEvent === 0 ? "high" : "normal",
      entityType: "company",
      entityId: event.id,
      entityLabel: event.companyName ? `${event.title} · ${event.companyName}` : event.title,
      action: "Préparer le rendez-vous — aucune tâche associée",
      impactReason: `Événement ${formatDayCount(Math.max(0, daysToEvent))}`,
      link: `/agenda?eventId=${event.id}`,
    })
  }

  const sorted = items
    .sort((a, b) => b.score - a.score || a.entityLabel.localeCompare(b.entityLabel, "fr"))
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return {
    items: sorted,
    meta: {
      accountsWithoutRecentAction,
      oppsStagnating,
      missionsEndingSoon,
      craNotValidated,
    },
  }
}
