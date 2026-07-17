import { describe, expect, it } from "vitest"
import type {
  BuildEngagementsPortfolioInput as BuildEngagementsOverviewInput,
  PortfolioActivityReportSource as OverviewActivityReportSource,
  PortfolioMissionSource as OverviewMissionSource,
  PortfolioProjectSource as OverviewProjectSource,
} from "../engagements-portfolio-types"
import {
  buildActivityOverview,
  buildEngagementsOverview,
  buildMilestonesOverview,
  buildRevenueOverview,
} from "../engagements-overview-utils"

const NOW = new Date("2026-07-17T10:00:00.000Z")

function mission(overrides: Partial<OverviewMissionSource> = {}): OverviewMissionSource {
  return {
    id: "mission-1",
    title: "Mission active",
    startDate: "2026-01-02",
    endDate: "2026-12-31",
    practice: "Data & IA",
    companyId: "company-1",
    companyName: "Client Alpha",
    collaboratorId: "collaborator-1",
    grossMarginPct: 35,
    ...overrides,
  }
}

function report(overrides: Partial<OverviewActivityReportSource> = {}): OverviewActivityReportSource {
  return {
    id: "report-1",
    missionId: "mission-1",
    collaboratorId: "collaborator-1",
    status: "validated",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    billableDays: 15,
    businessDays: 20,
    tjmSnapshot: 700,
    cjmSnapshot: 420,
    ...overrides,
  }
}

function project(overrides: Partial<OverviewProjectSource> = {}): OverviewProjectSource {
  return {
    id: "project-1",
    title: "Projet actif",
    startDate: "2026-02-01",
    endDate: "2026-10-31",
    companyId: "company-2",
    companyName: "Client Beta",
    practice: "Cloud",
    progressPct: 45,
    contractAmount: 100_000,
    costActual: 55_000,
    actualMarginPct: 45,
    targetMarginPct: 40,
    billingMilestones: [],
    ...overrides,
  }
}

function input(overrides: Partial<BuildEngagementsOverviewInput> = {}): BuildEngagementsOverviewInput {
  return {
    now: NOW,
    missions: [mission()],
    projects: [],
    reports: [report()],
    collaborators: [{ id: "collaborator-1", name: "Camille Martin" }],
    compensations: [{
      collaboratorId: "collaborator-1",
      taci: 0.85,
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
    }],
    projectPhases: [],
    projectTeamMembers: [],
    calendarEvents: [],
    ...overrides,
  }
}

describe("engagements revenue aggregation", () => {
  it("excludes a future CRA", () => {
    const revenue = buildRevenueOverview(input({
      reports: [report({ periodStart: "2026-08-01", periodEnd: "2026-08-31" })],
    }))
    expect(revenue.assistanceTechnique).toBe(0)
  })

  it("excludes a CRA that is not validated", () => {
    const revenue = buildRevenueOverview(input({ reports: [report({ status: "submitted" })] }))
    expect(revenue.assistanceTechnique).toBe(0)
  })

  it("uses billable_days × tjm_snapshot for AT revenue", () => {
    const revenue = buildRevenueOverview(input({
      reports: [report({ billableDays: 12.5, tjmSnapshot: 640 })],
    }))
    expect(revenue.assistanceTechnique).toBe(12.5 * 640)
  })

  it("counts a project milestone by invoiced_at, not due_date", () => {
    const revenue = buildRevenueOverview(input({
      reports: [],
      projects: [project({
        billingMilestones: [{
          label: "Lot 1",
          amount: 25_000,
          dueDate: "2025-12-31",
          invoicedAt: "2026-03-15",
        }],
      })],
    }))
    expect(revenue.projects).toBe(25_000)
    expect(revenue.monthly[2].projects).toBe(25_000)
  })

  it("does not count contract amount or a non-invoiced milestone as realized revenue", () => {
    const revenue = buildRevenueOverview(input({
      reports: [],
      projects: [project({
        billingMilestones: [{
          label: "Contrat signé 100 k€",
          amount: 100_000,
          dueDate: "2026-07-20",
          invoicedAt: null,
        }],
      })],
    }))
    expect(revenue.projects).toBe(0)
    expect(revenue.total).toBe(0)
  })

  it("does not count a project invoice dated in the future", () => {
    const revenue = buildRevenueOverview(input({
      reports: [],
      projects: [project({
        billingMilestones: [{
          label: "Facture future",
          amount: 40_000,
          dueDate: "2026-09-01",
          invoicedAt: "2026-09-01",
        }],
      })],
    }))
    expect(revenue.projects).toBe(0)
  })

  it("groups a missing practice under Non renseigné", () => {
    const revenue = buildRevenueOverview(input({ missions: [mission({ practice: null })] }))
    expect(revenue.byPractice).toEqual([
      expect.objectContaining({ label: "Non renseigné", value: 10_500 }),
    ])
  })
})

describe("engagements activity aggregation", () => {
  it("weights the global rate by business days", () => {
    const activity = buildActivityOverview(input({
      missions: [
        mission(),
        mission({ id: "mission-2", collaboratorId: "collaborator-2" }),
      ],
      reports: [
        report({ billableDays: 9, businessDays: 10 }),
        report({
          id: "report-2",
          missionId: "mission-2",
          collaboratorId: "collaborator-2",
          billableDays: 5,
          businessDays: 20,
        }),
      ],
    }))
    expect(activity.weightedYtdRate).toBe(46.7)
  })

  it("sorts the top five by the most negative gap to target", () => {
    const missions = Array.from({ length: 6 }, (_, index) => mission({
      id: `mission-${index}`,
      collaboratorId: `collaborator-${index}`,
      companyName: `Client ${index}`,
    }))
    const reports = missions.map((row, index) => report({
      id: `report-${index}`,
      missionId: row.id,
      collaboratorId: row.collaboratorId,
      billableDays: 10 + index,
      businessDays: 20,
    }))
    const activity = buildActivityOverview(input({
      missions,
      reports,
      collaborators: missions.map((row, index) => ({ id: row.collaboratorId, name: `Personne ${index}` })),
      compensations: missions.map((row) => ({
        collaboratorId: row.collaboratorId,
        taci: 0.9,
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      })),
    }))

    expect(activity.watchlist).toHaveLength(5)
    expect(activity.watchlist.map((item) => item.gapPoints)).toEqual([-40, -35, -30, -25, -20])
  })
})

describe("engagement milestones", () => {
  it("sorts and deduplicates equivalent deadlines", () => {
    const milestones = buildMilestonesOverview(input({
      missions: [mission({ endDate: "2026-07-25" })],
      calendarEvents: [{
        id: "event-1",
        entityType: "mission",
        entityId: "mission-1",
        title: "Fin de mission",
        eventType: "suivi_mission_client",
        status: "scheduled",
        startsAt: "2026-07-25T09:00:00Z",
      }],
      projects: [project({ startDate: "2026-07-20" })],
    }))

    expect(milestones.next30Days.map((item) => item.date)).toEqual([
      "2026-07-20",
      "2026-07-25",
    ])
    expect(milestones.next30Days.filter((item) => item.date === "2026-07-25")).toHaveLength(1)
  })

  it("surfaces an active engagement with a past end date as overdue", () => {
    const overview = buildEngagementsOverview(input({
      missions: [mission({ endDate: "2026-07-10" })],
    }))
    expect(overview.milestones.overdue).toEqual([
      expect.objectContaining({
        sourceType: "mission_end",
        urgency: "overdue",
        detail: "À clôturer",
      }),
    ])
  })
})
