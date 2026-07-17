import type {
  BuildEngagementsPortfolioInput,
  ClientExposureItem,
  EngagementPortfolioPoint,
  EngagementRunwayRow,
  MarginBridge,
  ProductionHeatmapRow,
  PortfolioActivityReportSource,
} from "./engagements-portfolio-types"

const DAY_MS = 86_400_000
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const candidate = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null
}

function todayOnly(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function dayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

function roundOne(value: number): number { return Math.round(value * 10) / 10 }
function monthKey(value: string | null): string | null { return value?.slice(0, 7) ?? null }
function label(value: string | null, fallback: string): string { return value?.trim() || fallback }
function token(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }

export function eligibleValidatedReports(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "reports">): PortfolioActivityReportSource[] {
  const today = todayOnly(input.now)
  const ids = new Set(input.missions.map((mission) => mission.id))
  return input.reports.filter((report) => ids.has(report.missionId) && report.status === "validated" && report.periodEnd <= today && report.periodStart.slice(0, 4) === String(input.now.getFullYear()))
}

export function buildPortfolioPoints(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects" | "reports">): EngagementPortfolioPoint[] {
  const today = todayOnly(input.now)
  const todayNumber = dayNumber(today)
  const reportGroups = new Map<string, PortfolioActivityReportSource[]>()
  for (const report of eligibleValidatedReports(input)) reportGroups.set(report.missionId, [...(reportGroups.get(report.missionId) ?? []), report])
  const timing = (value: string | null) => {
    const endDate = dateOnly(value)
    const daysUntilEnd = endDate ? dayNumber(endDate) - todayNumber : null
    return { endDate, daysUntilEnd, overdue: daysUntilEnd !== null && daysUntilEnd < 0, endingWithin30Days: daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30, endingWithin60Days: daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 60 }
  }
  return [
    ...input.missions.map((mission) => {
      const rows = reportGroups.get(mission.id) ?? []
      const revenueYtd = rows.reduce((sum, row) => sum + row.billableDays * row.tjmSnapshot, 0)
      const cost = rows.reduce((sum, row) => sum + row.billableDays * row.cjmSnapshot, 0)
      const actualMarginPct = revenueYtd > 0 ? roundOne(((revenueYtd - cost) / revenueYtd) * 100) : null
      return { id: mission.id, type: "mission" as const, title: mission.title, companyId: mission.companyId, companyName: label(mission.companyName, "Client non renseigné"), practice: mission.practice, revenueYtd, actualMarginPct, targetMarginPct: mission.grossMarginPct, marginGapPct: actualMarginPct !== null && mission.grossMarginPct !== null ? roundOne(actualMarginPct - mission.grossMarginPct) : null, startDate: dateOnly(mission.startDate), ...timing(mission.endDate) }
    }),
    ...input.projects.map((project) => {
      const revenueYtd = project.billingMilestones.reduce((sum, milestone) => {
        const invoicedAt = dateOnly(milestone.invoicedAt)
        return invoicedAt && invoicedAt <= today && invoicedAt.slice(0, 4) === String(input.now.getFullYear()) && milestone.amount !== null ? sum + milestone.amount : sum
      }, 0)
      return { id: project.id, type: "project" as const, title: project.title, companyId: project.companyId, companyName: label(project.companyName, "Client non renseigné"), practice: project.practice, revenueYtd, actualMarginPct: project.actualMarginPct, targetMarginPct: project.targetMarginPct, marginGapPct: project.actualMarginPct !== null && project.targetMarginPct !== null ? roundOne(project.actualMarginPct - project.targetMarginPct) : null, startDate: dateOnly(project.startDate), ...timing(project.endDate) }
    }),
  ]
}

export function buildClientExposure(points: EngagementPortfolioPoint[]): { clients: ClientExposureItem[]; concentration: { firstClientPct: number; top3ClientsPct: number } } {
  const total = points.reduce((sum, point) => sum + point.revenueYtd, 0)
  const groups = new Map<string, EngagementPortfolioPoint[]>()
  for (const point of points) groups.set(point.companyId, [...(groups.get(point.companyId) ?? []), point])
  const clients = [...groups.entries()].map(([companyId, engagements]) => {
    const revenue = engagements.reduce((sum, point) => sum + point.revenueYtd, 0)
    const marginRevenue = engagements.filter((point) => point.actualMarginPct !== null).reduce((sum, point) => sum + point.revenueYtd, 0)
    const marginValue = engagements.reduce((sum, point) => sum + (point.actualMarginPct ?? 0) * point.revenueYtd, 0)
    return { companyId, companyName: engagements[0]?.companyName ?? "Client non renseigné", revenue, sharePct: total > 0 ? roundOne((revenue / total) * 100) : 0, assistanceRevenue: engagements.filter((point) => point.type === "mission").reduce((sum, point) => sum + point.revenueYtd, 0), projectRevenue: engagements.filter((point) => point.type === "project").reduce((sum, point) => sum + point.revenueYtd, 0), actualMarginPct: marginRevenue > 0 ? roundOne(marginValue / marginRevenue) : null, endingWithin60Days: engagements.some((point) => point.endingWithin60Days), overdue: engagements.some((point) => point.overdue), engagements }
  }).sort((a, b) => b.revenue - a.revenue || a.companyName.localeCompare(b.companyName, "fr"))
  return { clients, concentration: { firstClientPct: clients[0]?.sharePct ?? 0, top3ClientsPct: roundOne(clients.slice(0, 3).reduce((sum, client) => sum + client.sharePct, 0)) } }
}

type ProductionFact = { date: string; revenue: number; client: string; practice: string; belowTarget: boolean }

function productionFacts(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects" | "reports" | "compensations">): ProductionFact[] {
  const missions = new Map(input.missions.map((mission) => [mission.id, mission]))
  const facts: ProductionFact[] = eligibleValidatedReports(input).flatMap((report) => {
    const mission = missions.get(report.missionId)
    if (!mission) return []
    const compensation = input.compensations.filter((row) => row.collaboratorId === report.collaboratorId && row.effectiveFrom <= report.periodStart && (!row.effectiveTo || row.effectiveTo >= report.periodStart)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
    return [{ date: report.periodStart, revenue: report.billableDays * report.tjmSnapshot, client: label(mission.companyName, "Client non renseigné"), practice: label(mission.practice, "Non renseigné"), belowTarget: Boolean(compensation && report.businessDays > 0 && report.billableDays / report.businessDays < compensation.taci) }]
  })
  const today = todayOnly(input.now)
  for (const project of input.projects) for (const milestone of project.billingMilestones) {
    const invoicedAt = dateOnly(milestone.invoicedAt)
    if (invoicedAt && invoicedAt <= today && invoicedAt.slice(0, 4) === String(input.now.getFullYear()) && milestone.amount !== null) facts.push({ date: invoicedAt, revenue: milestone.amount, client: label(project.companyName, "Client non renseigné"), practice: label(project.practice, "Non renseigné"), belowTarget: false })
  }
  return facts
}

function heatmap(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects">, facts: ProductionFact[], dimension: "client" | "practice"): ProductionHeatmapRow[] {
  const totals = new Map<string, number>()
  for (const fact of facts) totals.set(fact[dimension], (totals.get(fact[dimension]) ?? 0) + fact.revenue)
  const sorted = [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")).map(([name]) => name)
  const labels = sorted.length > 8 ? [...sorted.slice(0, 7), "Autres"] : sorted
  const visible = new Set(labels.filter((name) => name !== "Autres"))
  const engagements = [...input.missions.map((item) => ({ client: label(item.companyName, "Client non renseigné"), practice: label(item.practice, "Non renseigné"), start: item.startDate, end: item.endDate })), ...input.projects.map((item) => ({ client: label(item.companyName, "Client non renseigné"), practice: label(item.practice, "Non renseigné"), start: item.startDate, end: item.endDate }))]
  const today = todayOnly(input.now)
  return labels.map((name) => {
    const include = (value: string) => name === "Autres" ? !visible.has(value) : value === name
    return { id: token(`${dimension}-${name}`), label: name, monthly: MONTHS.map((month) => {
      const key = `${input.now.getFullYear()}-${String(month).padStart(2, "0")}`
      const cells = facts.filter((fact) => include(fact[dimension]) && monthKey(fact.date) === key)
      const scoped = engagements.filter((item) => include(item[dimension]))
      return { month: `${key}-01`, revenue: cells.reduce((sum, fact) => sum + fact.revenue, 0), belowActivityTarget: cells.some((fact) => fact.belowTarget), hasStartOrEnd: scoped.some((item) => monthKey(item.start) === key || monthKey(item.end) === key), hasOverdueItem: scoped.some((item) => Boolean(item.end && item.end < today && monthKey(item.end) === key)) }
    }) }
  })
}

export function buildProductionHeatmap(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects" | "reports" | "compensations">) {
  const facts = productionFacts(input)
  return { clients: heatmap(input, facts, "client"), practices: heatmap(input, facts, "practice") }
}

export function buildProjectsCockpit(input: Pick<BuildEngagementsPortfolioInput, "now" | "projects" | "projectPhases" | "projectTeamMembers" | "calendarEvents">) {
  const today = todayOnly(input.now)
  return input.projects.map((project) => {
    const phases = input.projectPhases.filter((phase) => phase.projectId === project.id).map((phase) => ({ id: phase.id, label: phase.label, status: phase.status, startDate: dateOnly(phase.startDate), endDate: dateOnly(phase.endDate), overdue: Boolean(phase.endDate && phase.endDate < today && phase.status !== "completed") }))
    const invoicedAmount = project.billingMilestones.reduce((sum, milestone) => milestone.invoicedAt && milestone.amount !== null ? sum + milestone.amount : sum, 0)
    const next = [...project.billingMilestones.flatMap((milestone) => milestone.dueDate && !milestone.invoicedAt ? [{ label: milestone.label, date: milestone.dueDate }] : []), ...phases.flatMap((phase) => phase.endDate && phase.status !== "completed" ? [{ label: phase.label, date: phase.endDate }] : []), ...input.calendarEvents.flatMap((event) => event.entityType === "project" && event.entityId === project.id ? [{ label: event.title, date: event.startsAt.slice(0, 10) }] : [])].filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    return { id: project.id, title: project.title, companyName: project.companyName, practice: project.practice, progressPct: project.progressPct, contractAmount: project.contractAmount, invoicedAmount, remainingToInvoice: project.contractAmount === null ? null : project.contractAmount - invoicedAmount, costActual: project.costActual, actualMarginPct: project.actualMarginPct, targetMarginPct: project.targetMarginPct, marginGapPct: project.actualMarginPct !== null && project.targetMarginPct !== null ? roundOne(project.actualMarginPct - project.targetMarginPct) : null, startDate: dateOnly(project.startDate), endDate: dateOnly(project.endDate), teamMemberCount: input.projectTeamMembers.filter((member) => member.projectId === project.id).length, phases, phaseCounts: { completed: phases.filter((phase) => phase.status === "completed").length, inProgress: phases.filter((phase) => phase.status === "in_progress").length, overdue: phases.filter((phase) => phase.overdue).length }, nextMilestone: next }
  }).sort((a, b) => (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999"))
}

export function buildMarginBridge(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects" | "reports">) {
  const reports = eligibleValidatedReports(input)
  const atRevenue = reports.reduce((sum, row) => sum + row.billableDays * row.tjmSnapshot, 0)
  const atCosts = reports.reduce((sum, row) => sum + row.billableDays * row.cjmSnapshot, 0)
  const today = todayOnly(input.now)
  const projectRevenue = input.projects.reduce((sum, project) => sum + project.billingMilestones.reduce((inner, milestone) => {
    const invoicedAt = dateOnly(milestone.invoicedAt)
    return invoicedAt && invoicedAt <= today && invoicedAt.slice(0, 4) === String(input.now.getFullYear()) && milestone.amount !== null ? inner + milestone.amount : inner
  }, 0), 0)
  const projectCosts = input.projects.reduce((sum, project) => sum + project.costActual, 0)
  const assistanceTechnique: MarginBridge = { revenue: atRevenue, assistanceCosts: atCosts, projectCosts: 0, observedContribution: atRevenue - atCosts }
  const projects: MarginBridge = { revenue: projectRevenue, assistanceCosts: 0, projectCosts, observedContribution: projectRevenue - projectCosts }
  const global: MarginBridge = { revenue: atRevenue + projectRevenue, assistanceCosts: atCosts, projectCosts, observedContribution: atRevenue + projectRevenue - atCosts - projectCosts }
  return { global, assistanceTechnique, projects }
}

export function buildRunway(input: Pick<BuildEngagementsPortfolioInput, "now" | "missions" | "projects" | "projectPhases" | "calendarEvents">): EngagementRunwayRow[] {
  const today = todayOnly(input.now)
  const todayNumber = dayNumber(today)
  const rows: EngagementRunwayRow[] = [...input.missions.map((item) => ({ id: item.id, type: "mission" as const, title: item.title, companyName: item.companyName, startDate: dateOnly(item.startDate), endDate: dateOnly(item.endDate), overdue: Boolean(item.endDate && item.endDate < today), markers: [] })), ...input.projects.map((item) => ({ id: item.id, type: "project" as const, title: item.title, companyName: item.companyName, startDate: dateOnly(item.startDate), endDate: dateOnly(item.endDate), overdue: Boolean(item.endDate && item.endDate < today), markers: [] }))]
  const index = new Map(rows.map((row) => [`${row.type}:${row.id}`, row]))
  const add = (type: "mission" | "project", id: string, marker: EngagementRunwayRow["markers"][number]) => {
    const row = index.get(`${type}:${id}`)
    if (!row || dayNumber(marker.date) - todayNumber < -30 || dayNumber(marker.date) - todayNumber > 90 || row.markers.some((item) => item.date === marker.date && item.label === marker.label)) return
    row.markers.push(marker)
  }
  for (const phase of input.projectPhases) if (phase.endDate) add("project", phase.projectId, { id: phase.id, date: phase.endDate, label: phase.label, kind: "phase", overdue: phase.endDate < today && phase.status !== "completed" })
  for (const project of input.projects) project.billingMilestones.forEach((milestone, i) => { if (milestone.dueDate && !milestone.invoicedAt) add("project", project.id, { id: `billing-${project.id}-${i}`, date: milestone.dueDate, label: milestone.label, kind: "billing", overdue: milestone.dueDate < today }) })
  for (const event of input.calendarEvents) add(event.entityType, event.entityId, { id: event.id, date: event.startsAt.slice(0, 10), label: event.title, kind: "event", overdue: event.startsAt.slice(0, 10) < today && event.status === "scheduled" })
  return rows.filter((row) => row.overdue || (row.endDate && dayNumber(row.endDate) - todayNumber <= 90) || row.markers.length).map((row) => ({ ...row, markers: row.markers.sort((a, b) => a.date.localeCompare(b.date)) })).sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999")).slice(0, 7)
}
