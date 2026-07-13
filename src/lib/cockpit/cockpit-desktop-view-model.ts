import { formatEuroCompact, formatPct } from "@/lib/formatters"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import type {
  CockpitAccountActivation,
  CockpitDesktopSnapshot,
  CockpitOperationalAlert,
  CockpitStatus,
} from "./cockpit-desktop-types"

const DAY_MS = 86_400_000
const RUNNING_TIMEOUT_MS = 30 * 60_000
const ADVANCED_OPPORTUNITY_STAGES = new Set(["cv_envoyes", "entretien_client", "contractualisation"])
const CLOSED_TASK_STATUSES = new Set(["done", "completed", "cancelled"])
const INACTIVE_SIGNAL_STATUSES = new Set(["dismissed", "archived", "expired"])

export type CockpitDesktopSources = {
  now: string
  companies: Array<{
    id: string
    name: string
    sector: string | null
    nextActionAt: string | null
    nextActionLabel: string | null
  }>
  scores: Array<{ companyId: string; scoreValue: number | null; confidenceScore: number | null }>
  signals: Array<{
    id: string
    companyId: string
    title: string
    recommendedAction: string | null
    status: string
    expiresAt: string | null
    urgencyScore: number | null
    detectedAt: string
  }>
  issues: Array<{
    id: string
    companyId: string
    title: string
    urgency: number
    status: string
  }>
  opportunities: Array<{
    id: string
    companyId: string | null
    title: string
    stage: string | null
    weightedGain: number | null
    nextActionAt: string | null
    nextActionLabel: string | null
    updatedAt: string
  }>
  interactions: Array<{ companyId: string | null; occurredAt: string }>
  missions: Array<{ id: string; title: string; companyId: string; endDate: string | null; status: string }>
  projects: Array<{ id: string; title: string; endDate: string | null; status: string; hasBlockedPhase?: boolean }>
  tasks: Array<{ id: string; title: string; dueDate: string | null; priority: string; status: string; entityType: string | null; entityId: string | null }>
  calendarEvents: Array<{ id: string; title: string; startsAt: string; companyId: string | null; opportunityId: string | null }>
  aiRuns: Array<{ id: string; companyId: string; runType: string; status: string; startedAt: string | null; createdAt: string }>
  trajectory: {
    points: Array<{ monthLabel: string; revenueActual: number | null; revenueTarget: number; marginActual: number | null }>
    ytdMarginTarget: number | null
  }
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function daysUntil(value: string | null, now: Date): number | null {
  const date = validDate(value)
  return date ? Math.ceil((date.getTime() - now.getTime()) / DAY_MS) : null
}

function statusForExposure(count: number): CockpitStatus {
  if (count === 0) return "success"
  return count >= 4 ? "danger" : "warning"
}

function companyHref(companyId: string) {
  return `/prospection/accounts/${companyId}`
}

function issueHref(companyId: string) {
  return companyHref(companyId)
}

function latestInteractionByCompany(rows: CockpitDesktopSources["interactions"]) {
  const latest = new Map<string, string>()
  for (const row of rows) {
    if (!row.companyId) continue
    const current = latest.get(row.companyId)
    if (!current || row.occurredAt > current) latest.set(row.companyId, row.occurredAt)
  }
  return latest
}

function isActionableSignal(signal: CockpitDesktopSources["signals"][number], now: Date) {
  if (INACTIVE_SIGNAL_STATUSES.has(signal.status)) return false
  const expiresAt = validDate(signal.expiresAt)
  return !expiresAt || expiresAt >= now
}

function isAdvancedWithoutRecentAction(
  opportunity: CockpitDesktopSources["opportunities"][number],
  now: Date,
) {
  if (!opportunity.stage || isTerminalOpportunityStage(opportunity.stage) || !ADVANCED_OPPORTUNITY_STAGES.has(opportunity.stage)) {
    return false
  }
  const actionDate = validDate(opportunity.nextActionAt)
  if (!actionDate) return true
  return now.getTime() - actionDate.getTime() > 7 * DAY_MS
}

function buildAccountsToAnimate(input: CockpitDesktopSources, now: Date): CockpitAccountActivation[] {
  const scores = new Map(input.scores.map((score) => [score.companyId, score]))
  const latestInteractions = latestInteractionByCompany(input.interactions)
  const companies = new Map(input.companies.map((company) => [company.id, company]))
  const signalsByCompany = new Map<string, CockpitDesktopSources["signals"]>()
  const issuesByCompany = new Map<string, CockpitDesktopSources["issues"]>()
  const advancedOpportunitiesByCompany = new Map<string, CockpitDesktopSources["opportunities"]>()

  for (const signal of input.signals) {
    if (!isActionableSignal(signal, now)) continue
    signalsByCompany.set(signal.companyId, [...(signalsByCompany.get(signal.companyId) ?? []), signal])
  }
  for (const issue of input.issues) {
    if (issue.status === "open" && issue.urgency >= 4) {
      issuesByCompany.set(issue.companyId, [...(issuesByCompany.get(issue.companyId) ?? []), issue])
    }
  }
  for (const opportunity of input.opportunities) {
    if (opportunity.companyId && isAdvancedWithoutRecentAction(opportunity, now)) {
      advancedOpportunitiesByCompany.set(opportunity.companyId, [...(advancedOpportunitiesByCompany.get(opportunity.companyId) ?? []), opportunity])
    }
  }

  const ranked: Array<CockpitAccountActivation & { rank: number; score: number | null }> = []
  for (const company of companies.values()) {
    const nextActionDays = daysUntil(company.nextActionAt, now)
    const score = scores.get(company.id)
    const scoreLabel = score && score.scoreValue !== null && (score.confidenceScore ?? 0) >= 40
      ? `${Math.round(score.scoreValue)}/100`
      : undefined
    const base = {
      companyId: company.id,
      companyName: company.name,
      sector: company.sector?.trim() || "Secteur non renseigné",
      scoreLabel,
      primaryAction: { label: "Ouvrir le compte", href: companyHref(company.id) },
    }

    if (nextActionDays !== null && nextActionDays < 0) {
      ranked.push({ ...base, reasonType: "overdue_action", reasonLabel: company.nextActionLabel || "Action commerciale dépassée", exposureLabel: `Échue depuis ${Math.abs(nextActionDays)} j`, rank: 0, score: score?.scoreValue ?? null })
      continue
    }
    const advanced = advancedOpportunitiesByCompany.get(company.id)?.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    if (advanced) {
      ranked.push({ ...base, reasonType: "advanced_opportunity", reasonLabel: `Opportunité avancée sans action récente : ${advanced.title}`, exposureLabel: advanced.weightedGain === null ? undefined : formatEuroCompact(advanced.weightedGain), primaryAction: { label: advanced.nextActionLabel || "Relancer l’opportunité", href: `/missions/opps/${advanced.id}/edit` }, rank: 1, score: score?.scoreValue ?? null })
      continue
    }
    const signal = signalsByCompany.get(company.id)?.toSorted((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0) || b.detectedAt.localeCompare(a.detectedAt))[0]
    if (signal) {
      ranked.push({ ...base, reasonType: "actionable_signal", reasonLabel: signal.recommendedAction || signal.title, rank: 2, score: score?.scoreValue ?? null })
      continue
    }
    const issue = issuesByCompany.get(company.id)?.toSorted((a, b) => b.urgency - a.urgency || a.title.localeCompare(b.title, "fr"))[0]
    if (issue) {
      ranked.push({ ...base, reasonType: "urgent_issue", reasonLabel: issue.title, exposureLabel: `Urgence ${issue.urgency}/5`, primaryAction: { label: "Traiter l’enjeu", href: issueHref(company.id) }, rank: 3, score: score?.scoreValue ?? null })
      continue
    }
    const lastInteraction = latestInteractions.get(company.id)
    const inactivityDays = lastInteraction ? daysUntil(lastInteraction, now) : null
    if (!lastInteraction || (inactivityDays !== null && inactivityDays <= -30)) {
      const days = lastInteraction ? Math.abs(inactivityDays ?? 0) : null
      ranked.push({ ...base, reasonType: "dormant_relationship", reasonLabel: days === null ? "Aucune interaction enregistrée" : `Relation inactive depuis ${days} j`, rank: 4, score: score?.scoreValue ?? null })
    }
  }

  return ranked
    .toSorted((a, b) => a.rank - b.rank || (b.score ?? -1) - (a.score ?? -1) || a.companyName.localeCompare(b.companyName, "fr") || a.companyId.localeCompare(b.companyId))
    .slice(0, 4)
    .map((account) => ({
      companyId: account.companyId,
      companyName: account.companyName,
      sector: account.sector,
      reasonType: account.reasonType,
      reasonLabel: account.reasonLabel,
      exposureLabel: account.exposureLabel,
      scoreLabel: account.scoreLabel,
      primaryAction: account.primaryAction,
    }))
}

function buildExposure(input: CockpitDesktopSources, now: Date) {
  const missionItems = input.missions
    .filter((mission) => mission.status === "active")
    .flatMap((mission) => {
      const days = daysUntil(mission.endDate, now)
      if (days === null || days > 30) return []
      return [{ id: `mission:${mission.id}`, label: mission.title, detail: days < 0 ? `Mission échue depuis ${Math.abs(days)} j` : `Mission à échéance dans ${days} j`, dueDate: mission.endDate as string, action: { label: "Voir la mission", href: `/missions/actives/${mission.id}` } }]
    })
  const projectItems = input.projects
    .filter((project) => project.status === "active")
    .flatMap((project) => {
      const days = daysUntil(project.endDate, now)
      if (!project.hasBlockedPhase && (days === null || days > 0)) return []
      return [{ id: `project:${project.id}`, label: project.title, detail: project.hasBlockedPhase ? "Projet à risque : phase bloquée" : `Projet en retard de ${Math.abs(days as number)} j`, dueDate: project.endDate ?? undefined, action: { label: "Voir les projets", href: "/missions/projets" } }]
    })
  const opportunityItems = input.opportunities
    .filter((opportunity) => isAdvancedWithoutRecentAction(opportunity, now))
    .map((opportunity) => ({ id: `opportunity:${opportunity.id}`, label: opportunity.title, detail: "Opportunité avancée sans prochaine action", dueDate: opportunity.nextActionAt || opportunity.updatedAt, action: { label: "Traiter l’opportunité", href: `/missions/opps/${opportunity.id}/edit` } }))
  return [...missionItems, ...projectItems, ...opportunityItems]
    .toSorted((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.id.localeCompare(b.id))
}

function buildHorizons(input: CockpitDesktopSources, now: Date) {
  const candidates = [
    ...input.missions.filter((mission) => mission.status === "active").flatMap((mission) => mission.endDate ? [{ id: `mission:${mission.id}`, label: mission.title, detail: "Échéance de mission", dueDate: mission.endDate, action: { label: "Voir la mission", href: `/missions/actives/${mission.id}` } }] : []),
    ...input.projects.filter((project) => project.status === "active").flatMap((project) => project.endDate ? [{ id: `project:${project.id}`, label: project.title, detail: "Échéance projet", dueDate: project.endDate, action: { label: "Voir les projets", href: "/missions/projets" } }] : []),
    ...input.opportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage ?? "")).flatMap((opportunity) => opportunity.nextActionAt ? [{ id: `opportunity:${opportunity.id}`, label: opportunity.title, detail: opportunity.nextActionLabel || "Prochaine action commerciale", dueDate: opportunity.nextActionAt, action: { label: "Voir l’opportunité", href: `/missions/opps/${opportunity.id}/edit` } }] : []),
  ]
  return ([30, 60, 90] as const).map((days) => ({
    days,
    label: `${days} jours`,
    items: candidates
      .filter((item) => {
        const distance = daysUntil(item.dueDate, now)
        return distance !== null && distance >= 0 && distance <= days
      })
      .toSorted((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))
      .slice(0, 5),
  }))
}

function buildAlerts(input: CockpitDesktopSources, now: Date): CockpitOperationalAlert[] {
  const overdueTasks = input.tasks
    .filter((task) => !CLOSED_TASK_STATUSES.has(task.status) && task.dueDate && task.dueDate < dateKey(now) && ["urgent", "high"].includes(task.priority))
    .map((task) => ({ id: `task:${task.id}`, type: "overdue_task" as const, title: task.title, detail: `Tâche ${task.priority === "urgent" ? "urgente" : "critique"} échue`, status: "danger" as const, action: { label: "Voir dans l’agenda", href: `/agenda?taskId=${task.id}` } }))
  const urgentIssues = input.issues
    .filter((issue) => issue.status === "open" && issue.urgency >= 4)
    .map((issue) => ({ id: `issue:${issue.id}`, type: "urgent_issue" as const, title: issue.title, detail: `Enjeu urgent ${issue.urgency}/5`, status: "danger" as const, action: { label: "Ouvrir le compte", href: issueHref(issue.companyId) } }))
  const lateProjects = input.projects
    .filter((project) => project.status === "active" && (project.hasBlockedPhase || (daysUntil(project.endDate, now) ?? 1) <= 0))
    .map((project) => ({ id: `project:${project.id}`, type: "project_risk" as const, title: project.title, detail: project.hasBlockedPhase ? "Projet à risque : phase bloquée" : "Projet en retard", status: "warning" as const, action: { label: "Voir les projets", href: "/missions/projets" } }))
  const stuckRuns = input.aiRuns
    .filter((run) => run.status === "running")
    .filter((run) => {
      const started = validDate(run.startedAt || run.createdAt)
      return started !== null && now.getTime() - started.getTime() > RUNNING_TIMEOUT_MS
    })
    .map((run) => ({ id: `ai-run:${run.id}`, type: "stuck_ai_run" as const, title: `Run IA ${run.runType}`, detail: "Actif depuis plus de 30 min", status: "warning" as const, action: { label: "Ouvrir le compte", href: companyHref(run.companyId) } }))
  return [...overdueTasks, ...urgentIssues, ...lateProjects, ...stuckRuns]
    .toSorted((a, b) => a.status.localeCompare(b.status) || a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id))
    .slice(0, 8)
}

export function buildCockpitDesktopSnapshot(input: CockpitDesktopSources): CockpitDesktopSnapshot {
  const now = validDate(input.now) ?? new Date(0)
  const exposure = buildExposure(input, now)
  const actualPoints = input.trajectory.points.filter((point) => point.revenueActual !== null)
  const ytdRevenueActual = actualPoints.length ? actualPoints.reduce((total, point) => total + (point.revenueActual ?? 0), 0) : null
  const ytdRevenueTarget = actualPoints.length ? actualPoints.reduce((total, point) => total + point.revenueTarget, 0) : null
  const ytdMarginRows = actualPoints.filter((point) => point.marginActual !== null)
  const ytdMarginActual = ytdMarginRows.length
    ? ytdMarginRows.reduce((total, point) => total + (point.marginActual ?? 0), 0) / ytdMarginRows.length
    : null
  const weightedPipeline = input.opportunities
    .filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage ?? ""))
    .reduce((total, opportunity) => total + (opportunity.weightedGain ?? 0), 0)
  const today: CockpitDesktopSnapshot["today"] = [
    ...input.calendarEvents
      .filter((event) => dateKey(validDate(event.startsAt) ?? new Date(0)) === dateKey(now))
      .map((event) => ({
        id: `event:${event.id}`,
        title: event.title,
        moment: validDate(event.startsAt)?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        action: { label: "Ouvrir l’agenda", href: `/agenda?eventId=${event.id}` },
      })),
    ...input.tasks
      .filter((task) => !CLOSED_TASK_STATUSES.has(task.status) && task.dueDate === dateKey(now))
      .map((task) => ({
        id: `task:${task.id}`,
        title: task.title,
        detail: task.priority,
        action: { label: "Ouvrir l’agenda", href: `/agenda?taskId=${task.id}` },
      })),
  ]

  return {
    kpis: [
      { id: "revenue-ytd", label: "CA YTD", value: formatEuroCompact(ytdRevenueActual), detail: ytdRevenueTarget === null ? undefined : `plan ${formatEuroCompact(ytdRevenueTarget)}`, status: ytdRevenueActual === null ? "neutral" : "success" },
      { id: "margin-ytd", label: "Marge YTD", value: formatPct(ytdMarginActual), detail: input.trajectory.ytdMarginTarget === null ? undefined : `plan ${formatPct(input.trajectory.ytdMarginTarget)}`, status: ytdMarginActual === null ? "neutral" : ytdMarginActual >= (input.trajectory.ytdMarginTarget ?? Infinity) ? "success" : "warning" },
      { id: "weighted-pipeline", label: "Pipe pondéré", value: formatEuroCompact(weightedPipeline), detail: `${input.opportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage ?? "")).length} opportunité(s) active(s)`, status: weightedPipeline > 0 ? "neutral" : "warning" },
      { id: "exposure-30d", label: "Exposition à 30 jours", value: String(exposure.length), detail: exposure.length ? "Décisions à préparer" : "Aucune décision détectée", status: statusForExposure(exposure.length) },
    ],
    accountsToAnimate: buildAccountsToAnimate(input, now),
    trajectory: { points: input.trajectory.points, ytdRevenueActual, ytdRevenueTarget, ytdMarginActual, ytdMarginTarget: input.trajectory.ytdMarginTarget },
    horizons: buildHorizons(input, now),
    today: today
      .toSorted((a, b) => (a.moment ?? "99:99").localeCompare(b.moment ?? "99:99") || a.title.localeCompare(b.title, "fr") || a.id.localeCompare(b.id))
      .slice(0, 3),
    alerts: buildAlerts(input, now),
  }
}
