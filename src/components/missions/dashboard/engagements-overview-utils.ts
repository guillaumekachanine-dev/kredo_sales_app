import type {
  ActivityWatchItem,
  BuildEngagementsOverviewInput,
  EngagementMilestone,
  EngagementMilestoneSourceType,
  EngagementsOverviewViewModel,
  OverviewActivityReportSource,
  OverviewCompensationSource,
  OverviewMissionSource,
  RevenueBreakdownItem,
} from "./engagements-overview-types"

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
] as const

const DAY_MS = 86_400_000
const UNDISCLOSED_PRACTICE = "Non renseigné"
const UNDISCLOSED_CLIENT = "Client non renseigné"

type RevenueFact = {
  date: string
  amount: number
  source: "assistanceTechnique" | "projects"
  practice: string
  client: string
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const candidate = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null
}

function dayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

function currentDateOnly(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function monthKey(value: string): string {
  return value.slice(0, 7)
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function cleanLabel(value: string | null | undefined, fallback: string): string {
  const label = value?.trim()
  return label ? label : fallback
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function aggregateBreakdown(
  facts: RevenueFact[],
  dimension: "practice" | "client",
  total: number,
): RevenueBreakdownItem[] {
  const sums = new Map<string, number>()
  for (const fact of facts) {
    const label = fact[dimension]
    sums.set(label, (sums.get(label) ?? 0) + fact.amount)
  }

  const sorted = [...sums.entries()]
    .map(([label, value]) => ({
      id: normalizeToken(label) || "non-renseigne",
      label,
      value,
      percentage: total > 0 ? roundOne((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"))

  if (sorted.length <= 6) return sorted

  const visible = sorted.slice(0, 5)
  const otherValue = sorted.slice(5).reduce((sum, item) => sum + item.value, 0)
  return [
    ...visible,
    {
      id: "autres",
      label: "Autres",
      value: otherValue,
      percentage: total > 0 ? roundOne((otherValue / total) * 100) : 0,
    },
  ]
}

export function buildRevenueOverview({
  now,
  missions,
  projects,
  reports,
}: Pick<BuildEngagementsOverviewInput, "now" | "missions" | "projects" | "reports">) {
  const year = now.getFullYear()
  const today = currentDateOnly(now)
  const missionById = new Map(missions.map((mission) => [mission.id, mission]))
  const facts: RevenueFact[] = []

  for (const report of reports) {
    const mission = missionById.get(report.missionId)
    const periodStart = dateOnly(report.periodStart)
    const periodEnd = dateOnly(report.periodEnd)
    if (
      !mission ||
      report.status !== "validated" ||
      !periodStart ||
      !periodEnd ||
      Number(periodStart.slice(0, 4)) !== year ||
      periodEnd > today
    ) {
      continue
    }

    facts.push({
      date: periodStart,
      amount: report.billableDays * report.tjmSnapshot,
      source: "assistanceTechnique",
      practice: cleanLabel(mission.practice, UNDISCLOSED_PRACTICE),
      client: cleanLabel(mission.companyName, UNDISCLOSED_CLIENT),
    })
  }

  for (const project of projects) {
    for (const milestone of project.billingMilestones) {
      const invoicedAt = dateOnly(milestone.invoicedAt)
      if (
        !invoicedAt ||
        Number(invoicedAt.slice(0, 4)) !== year ||
        invoicedAt > today ||
        milestone.amount === null ||
        !Number.isFinite(milestone.amount)
      ) {
        continue
      }

      facts.push({
        date: invoicedAt,
        amount: milestone.amount,
        source: "projects",
        practice: cleanLabel(project.practice, UNDISCLOSED_PRACTICE),
        client: cleanLabel(project.companyName, UNDISCLOSED_CLIENT),
      })
    }
  }

  const assistanceTechnique = facts
    .filter((fact) => fact.source === "assistanceTechnique")
    .reduce((sum, fact) => sum + fact.amount, 0)
  const projectRevenue = facts
    .filter((fact) => fact.source === "projects")
    .reduce((sum, fact) => sum + fact.amount, 0)
  const total = assistanceTechnique + projectRevenue

  const monthly = MONTH_LABELS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`
    const monthlyFacts = facts.filter((fact) => monthKey(fact.date) === key)
    return {
      month: `${key}-01`,
      label,
      assistanceTechnique: monthlyFacts
        .filter((fact) => fact.source === "assistanceTechnique")
        .reduce((sum, fact) => sum + fact.amount, 0),
      projects: monthlyFacts
        .filter((fact) => fact.source === "projects")
        .reduce((sum, fact) => sum + fact.amount, 0),
      isFuture: index > now.getMonth(),
    }
  })

  return {
    total,
    assistanceTechnique,
    projects: projectRevenue,
    monthly,
    byPractice: aggregateBreakdown(facts, "practice", total),
    byClient: aggregateBreakdown(facts, "client", total),
  }
}

function currentCompensation(
  collaboratorId: string,
  compensations: OverviewCompensationSource[],
  today: string,
): OverviewCompensationSource | null {
  return compensations
    .filter((row) => (
      row.collaboratorId === collaboratorId &&
      row.effectiveFrom <= today &&
      (row.effectiveTo === null || row.effectiveTo >= today)
    ))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
}

function latestFullyValidatedMonth(
  reports: OverviewActivityReportSource[],
  missionById: Map<string, OverviewMissionSource>,
  year: number,
  today: string,
): string | null {
  const byMonth = new Map<string, OverviewActivityReportSource[]>()
  for (const report of reports) {
    const periodStart = dateOnly(report.periodStart)
    const periodEnd = dateOnly(report.periodEnd)
    if (
      !missionById.has(report.missionId) ||
      !periodStart ||
      !periodEnd ||
      Number(periodStart.slice(0, 4)) !== year ||
      periodEnd > today
    ) {
      continue
    }
    const key = monthKey(periodStart)
    byMonth.set(key, [...(byMonth.get(key) ?? []), report])
  }

  return [...byMonth.entries()]
    .filter(([, rows]) => rows.length > 0 && rows.every((row) => row.status === "validated"))
    .map(([key]) => key)
    .sort((a, b) => b.localeCompare(a))[0] ?? null
}

export function buildActivityOverview({
  now,
  missions,
  reports,
  collaborators,
  compensations,
}: Pick<
  BuildEngagementsOverviewInput,
  "now" | "missions" | "reports" | "collaborators" | "compensations"
>) {
  const year = now.getFullYear()
  const today = currentDateOnly(now)
  const missionById = new Map(missions.map((mission) => [mission.id, mission]))
  const collaboratorById = new Map(collaborators.map((row) => [row.id, row]))
  const eligibleReports = reports.filter((report) => {
    const periodStart = dateOnly(report.periodStart)
    const periodEnd = dateOnly(report.periodEnd)
    return Boolean(
      missionById.has(report.missionId) &&
      report.status === "validated" &&
      periodStart &&
      periodEnd &&
      Number(periodStart.slice(0, 4)) === year &&
      periodEnd <= today,
    )
  })

  const totalBillable = eligibleReports.reduce((sum, report) => sum + report.billableDays, 0)
  const totalBusiness = eligibleReports.reduce((sum, report) => sum + report.businessDays, 0)
  const weightedYtdRate = totalBusiness > 0 ? roundOne((totalBillable / totalBusiness) * 100) : null

  const monthlyTrend = MONTH_LABELS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`
    const rows = eligibleReports.filter((report) => monthKey(report.periodStart) === key)
    const businessDays = rows.reduce((sum, report) => sum + report.businessDays, 0)
    const billableDays = rows.reduce((sum, report) => sum + report.billableDays, 0)
    return {
      month: `${key}-01`,
      label,
      rate: businessDays > 0 ? roundOne((billableDays / businessDays) * 100) : null,
      isFuture: index > now.getMonth(),
    }
  })

  const latestValidatedMonth = latestFullyValidatedMonth(reports, missionById, year, today)
  const watchlist: ActivityWatchItem[] = []

  if (latestValidatedMonth) {
    const rowsByCollaborator = new Map<string, OverviewActivityReportSource[]>()
    for (const report of eligibleReports) {
      if (monthKey(report.periodStart) !== latestValidatedMonth) continue
      rowsByCollaborator.set(report.collaboratorId, [
        ...(rowsByCollaborator.get(report.collaboratorId) ?? []),
        report,
      ])
    }

    for (const [collaboratorId, rows] of rowsByCollaborator) {
      const businessDays = rows.reduce((sum, report) => sum + report.businessDays, 0)
      if (businessDays <= 0) continue
      const billableDays = rows.reduce((sum, report) => sum + report.billableDays, 0)
      const compensation = currentCompensation(collaboratorId, compensations, today)
      if (!compensation) continue

      const rate = roundOne((billableDays / businessDays) * 100)
      const targetRate = roundOne(compensation.taci * 100)
      const clientWeights = new Map<string, number>()
      for (const report of rows) {
        const companyName = cleanLabel(
          missionById.get(report.missionId)?.companyName,
          UNDISCLOSED_CLIENT,
        )
        clientWeights.set(companyName, (clientWeights.get(companyName) ?? 0) + report.businessDays)
      }
      const companyName = [...clientWeights.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))[0]?.[0] ?? UNDISCLOSED_CLIENT

      watchlist.push({
        collaboratorId,
        name: cleanLabel(collaboratorById.get(collaboratorId)?.name, "Collaborateur non renseigné"),
        companyName,
        rate,
        targetRate,
        gapPoints: roundOne(rate - targetRate),
      })
    }
  }

  return {
    weightedYtdRate,
    monthlyTrend,
    latestValidatedMonth,
    watchlist: watchlist
      .filter((item) => item.gapPoints < 0)
      .sort((a, b) => a.gapPoints - b.gapPoints || a.name.localeCompare(b.name, "fr"))
      .slice(0, 5),
  }
}

type MilestoneCandidate = EngagementMilestone & {
  dedupeCategory: string
}

function calendarCategory(title: string, eventType: string): string {
  const value = normalizeToken(`${eventType} ${title}`)
  if (/livraison finale|fin |cloture/.test(value)) return "end"
  if (/demarrage|kick off|kickoff/.test(value)) return "start"
  if (/factur/.test(value)) return "billing"
  if (/soutenance/.test(value)) return "soutenance"
  if (/recette/.test(value)) return "recette"
  return `event-${normalizeToken(title)}`
}

function sourceLabel(sourceType: EngagementMilestoneSourceType): string {
  switch (sourceType) {
    case "mission_start": return "Démarrage de mission"
    case "mission_end": return "Fin de mission"
    case "project_start": return "Démarrage de projet"
    case "project_end": return "Fin de projet"
    case "project_phase": return "Phase projet"
    case "billing_milestone": return "Jalon de facturation"
    case "calendar_event": return "Événement"
  }
}

export function buildMilestonesOverview({
  now,
  missions,
  projects,
  projectPhases,
  calendarEvents,
}: Pick<
  BuildEngagementsOverviewInput,
  "now" | "missions" | "projects" | "projectPhases" | "calendarEvents"
>) {
  const today = currentDateOnly(now)
  const todayNumber = dayNumber(today)
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const candidates: MilestoneCandidate[] = []

  const addCandidate = ({
    id,
    sourceType,
    date,
    title,
    companyName,
    detail,
    entityType,
    entityId,
    dedupeCategory,
    overdueEligible = false,
  }: Omit<MilestoneCandidate, "date" | "urgency"> & {
    date: string | null
    overdueEligible?: boolean
  }) => {
    const normalizedDate = dateOnly(date)
    if (!normalizedDate) return
    const distance = dayNumber(normalizedDate) - todayNumber
    if (distance < 0 && !overdueEligible) return
    if (distance > 30) return
    candidates.push({
      id,
      sourceType,
      date: normalizedDate,
      title,
      companyName: cleanLabel(companyName, UNDISCLOSED_CLIENT),
      detail: distance < 0 && (sourceType === "mission_end" || sourceType === "project_end")
        ? "À clôturer"
        : detail ?? sourceLabel(sourceType),
      urgency: distance < 0 ? "overdue" : distance <= 7 ? "soon" : "normal",
      entityType,
      entityId,
      dedupeCategory,
    })
  }

  for (const mission of missions) {
    addCandidate({
      id: `mission-start-${mission.id}`,
      sourceType: "mission_start",
      date: mission.startDate,
      title: mission.title,
      companyName: mission.companyName,
      entityType: "mission",
      entityId: mission.id,
      dedupeCategory: "start",
    })
    addCandidate({
      id: `mission-end-${mission.id}`,
      sourceType: "mission_end",
      date: mission.endDate,
      title: mission.title,
      companyName: mission.companyName,
      entityType: "mission",
      entityId: mission.id,
      dedupeCategory: "end",
      overdueEligible: true,
    })
  }

  for (const project of projects) {
    addCandidate({
      id: `project-start-${project.id}`,
      sourceType: "project_start",
      date: project.startDate,
      title: project.title,
      companyName: project.companyName,
      entityType: "project",
      entityId: project.id,
      dedupeCategory: "start",
    })
    addCandidate({
      id: `project-end-${project.id}`,
      sourceType: "project_end",
      date: project.endDate,
      title: project.title,
      companyName: project.companyName,
      entityType: "project",
      entityId: project.id,
      dedupeCategory: "end",
      overdueEligible: true,
    })

    project.billingMilestones.forEach((milestone, index) => {
      if (milestone.invoicedAt) return
      const label = cleanLabel(milestone.label, `Jalon ${index + 1}`)
      addCandidate({
        id: `billing-${project.id}-${index}`,
        sourceType: "billing_milestone",
        date: milestone.dueDate,
        title: label,
        companyName: project.companyName,
        detail: "Jalon non facturé",
        entityType: "project",
        entityId: project.id,
        dedupeCategory: "billing",
        overdueEligible: true,
      })
    })
  }

  for (const phase of projectPhases) {
    const project = projectById.get(phase.projectId)
    if (!project) continue
    addCandidate({
      id: `phase-start-${phase.id}`,
      sourceType: "project_phase",
      date: phase.startDate,
      title: phase.label,
      companyName: project.companyName,
      detail: "Démarrage de phase",
      entityType: "project",
      entityId: project.id,
      dedupeCategory: `phase-start-${phase.id}`,
      overdueEligible: phase.status === "planned",
    })
    addCandidate({
      id: `phase-end-${phase.id}`,
      sourceType: "project_phase",
      date: phase.endDate,
      title: phase.label,
      companyName: project.companyName,
      detail: "Livraison de phase",
      entityType: "project",
      entityId: project.id,
      dedupeCategory: `phase-end-${phase.id}`,
      overdueEligible: phase.status !== "completed",
    })
  }

  for (const event of calendarEvents) {
    if (event.status === "cancelled") continue
    const mission = event.entityType === "mission"
      ? missions.find((row) => row.id === event.entityId)
      : null
    const project = event.entityType === "project" ? projectById.get(event.entityId) : null
    const engagement = mission ?? project
    if (!engagement) continue
    addCandidate({
      id: `calendar-${event.id}`,
      sourceType: "calendar_event",
      date: event.startsAt,
      title: event.title,
      companyName: engagement.companyName,
      detail: event.eventType.replaceAll("_", " "),
      entityType: event.entityType,
      entityId: event.entityId,
      dedupeCategory: calendarCategory(event.title, event.eventType),
      overdueEligible: event.status === "scheduled",
    })
  }

  const deduplicated = new Map<string, MilestoneCandidate>()
  for (const candidate of candidates) {
    const key = [
      candidate.entityType,
      candidate.entityId,
      candidate.date,
      candidate.dedupeCategory,
    ].join(":")
    if (!deduplicated.has(key)) deduplicated.set(key, candidate)
  }

  const milestones = [...deduplicated.values()].map((item) => ({
    id: item.id,
    sourceType: item.sourceType,
    date: item.date,
    title: item.title,
    companyName: item.companyName,
    detail: item.detail,
    urgency: item.urgency,
    entityType: item.entityType,
    entityId: item.entityId,
  }))
  const endingWithin60Days = [
    ...missions.map((mission) => mission.endDate),
    ...projects.map((project) => project.endDate),
  ].filter((value) => {
    const date = dateOnly(value)
    if (!date) return false
    const distance = dayNumber(date) - todayNumber
    return distance >= 0 && distance <= 60
  }).length

  return {
    next30Days: milestones
      .filter((item) => item.urgency !== "overdue")
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "fr")),
    overdue: milestones
      .filter((item) => item.urgency === "overdue")
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "fr")),
    endingWithin60Days,
  }
}

export function buildEngagementsOverview(
  input: BuildEngagementsOverviewInput,
): EngagementsOverviewViewModel {
  const issues = input.issues ?? []
  return {
    generatedAt: input.now.toISOString(),
    year: input.now.getFullYear(),
    status: issues.length > 0 ? "partial" : "complete",
    issues,
    portfolio: {
      activeMissions: input.missions.length,
      activeProjects: input.projects.length,
    },
    revenue: buildRevenueOverview(input),
    activity: buildActivityOverview(input),
    milestones: buildMilestonesOverview(input),
  }
}
