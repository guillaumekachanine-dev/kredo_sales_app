import { describe, expect, it } from "vitest"
import type { WeeklyManagerPriorityItem } from "@/app/(app)/reports/_data/reports-types"
import type { ScheduledEventItem } from "@/lib/agenda/agenda-types"
import {
  getCockpitMobileWeekRange,
  getNextMeetingLabel,
  groupCockpitMeetingsByDay,
  selectCockpitOpportunities,
  selectCockpitModulePriorities,
  selectCockpitPriorities,
  selectCockpitSignals,
  selectCockpitUrgencies,
  selectCommercialMeetings,
  selectTodayEvents,
  type CockpitOpportunitySource,
  type CockpitSignalSource,
} from "./cockpit-mobile-selectors"
import { getWeeklyManagerActionAvailability } from "@/components/reports/weekly-manager/WeeklyManagerItemActions"

const now = "2026-07-16T08:00:00.000Z"
const weekEnd = "2026-07-19T22:00:00.000Z"

function priority(
  sourceId: string,
  tier: WeeklyManagerPriorityItem["tier"],
  rank: number,
  sourceType = "task",
): WeeklyManagerPriorityItem {
  return {
    rank,
    sourceType,
    sourceId,
    title: sourceId,
    reason: "À traiter",
    tier,
    recommendedAction: "Agir",
    scoringVersion: "weekly-scoring-v1",
  }
}

function scheduledEvent(
  sourceId: string,
  eventType: string,
  startsAt = "2026-07-16T09:00:00.000Z",
): ScheduledEventItem {
  return {
    id: `scheduled_event:calendar_event:${sourceId}`,
    type: "scheduled_event",
    sourceType: "calendar_event",
    sourceId,
    workspaceId: "workspace-1",
    domain: "agenda",
    title: sourceId,
    sourceStatus: "scheduled",
    businessStatus: "pending",
    temporalState: "upcoming",
    priority: "normal",
    timebox: {
      kind: "slot",
      startAt: startsAt,
      endAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
      timezone: "Europe/Paris",
      allDay: false,
    },
    primaryLink: {
      module: "agenda",
      href: `/agenda?eventId=${sourceId}`,
      label: sourceId,
      sourceType: "calendar_event",
      sourceId,
    },
    relatedLinks: [],
    uiCapabilities: {
      canOpenPrimary: true,
      canOpenSource: false,
      canEditFromAgenda: true,
      canCreateTask: true,
      canReschedule: true,
      canMarkDone: false,
      canHideForSession: false,
    },
    isDerived: false,
    tags: [],
    eventType,
    location: null,
    meetingUrl: null,
  }
}

function opportunity(
  id: string,
  overrides: Partial<CockpitOpportunitySource> = {},
): CockpitOpportunitySource {
  return {
    id,
    title: id,
    stage: "qualification",
    companyId: `company-${id}`,
    companyName: `Company ${id}`,
    nextActionLabel: null,
    nextActionAt: null,
    targetCloseDate: null,
    requiredHeadcount: 1,
    requiresStaffing: true,
    updatedAt: "2026-07-01T00:00:00.000Z",
    positionings: [],
    ...overrides,
  }
}

function signal(
  id: string,
  globalScore: number,
  overrides: Partial<CockpitSignalSource> = {},
): CockpitSignalSource {
  return {
    id,
    source: "account_signal",
    title: id,
    summary: null,
    globalScore,
    lastEvidenceAt: "2026-07-15T10:00:00.000Z",
    expiresAt: null,
    status: "new",
    recommendedAction: null,
    companyId: `company-${id}`,
    companyName: `Company ${id}`,
    sourceUrl: null,
    ...overrides,
  }
}

describe("cockpit mobile selectors", () => {
  it("déduplique les urgences et exclut les priorités ignorées cette semaine", () => {
    const priorities = selectCockpitPriorities([
      priority("critical-1", "critical", 2),
      priority("critical-1", "critical", 1),
      priority("critical-dismissed", "critical", 3),
      priority("critical-2", "critical", 4),
      priority("high-1", "high", 5),
    ], new Set(["task:critical-dismissed"]))

    expect(selectCockpitUrgencies(priorities).map((item) => item.sourceId)).toEqual([
      "critical-1",
      "critical-2",
    ])
  })

  it("classe toujours critical avant high avant normal", () => {
    const priorities = selectCockpitPriorities([
      priority("normal", "normal", 1),
      priority("high", "high", 3),
      priority("critical", "critical", 8),
    ])

    expect(priorities.map((item) => item.tier)).toEqual(["critical", "high", "normal"])
  })

  it("borne les priorités du module à cinq, dans l’ordre du scoring", () => {
    const items = selectCockpitModulePriorities([
      priority("normal", "normal", 1),
      priority("high", "high", 2),
      priority("critical-2", "critical", 2),
      priority("critical-1", "critical", 1),
      priority("high-2", "high", 1),
      priority("normal-2", "normal", 2),
    ])

    expect(items.map((item) => item.sourceId)).toEqual([
      "critical-1", "critical-2", "high-2", "high", "normal",
    ])
  })

  it("borne les signaux à trois selon score puis fraîcheur", () => {
    const items = selectCockpitSignals([
      signal("fourth", 0.4),
      signal("second", 0.8, { lastEvidenceAt: "2026-07-15T11:00:00.000Z" }),
      signal("third", 0.8, { lastEvidenceAt: "2026-07-15T09:00:00.000Z" }),
      signal("first", 0.9),
    ], now)

    expect(items.map((item) => item.id)).toEqual(["first", "second", "third"])
  })

  it("exclut les signaux expirés", () => {
    const items = selectCockpitSignals([
      signal("expired", 1, { expiresAt: now }),
      signal("same-instant-offset", 0.9, { expiresAt: "2026-07-16T10:00:00+02:00" }),
      signal("active", 0.7, { expiresAt: "2026-07-17T08:00:00.000Z" }),
    ], now)

    expect(items.map((item) => item.id)).toEqual(["active"])
  })

  it("place les opportunités en retard avant celles de la semaine, les closings puis le reste", () => {
    const items = selectCockpitOpportunities([
      opportunity("rest"),
      opportunity("closing", { targetCloseDate: "2026-07-25" }),
      opportunity("due", { nextActionAt: "2026-07-17T08:00:00.000Z" }),
      opportunity("overdue", { nextActionAt: "2026-07-15T08:00:00.000Z" }),
    ], now, weekEnd)

    expect(items.map((item) => item.id)).toEqual(["overdue", "due", "closing", "rest"])
  })

  it("classifie les rendez-vous commerciaux depuis un helper unique", () => {
    const meetings = selectCommercialMeetings([
      scheduledEvent("prospection", "rdv_prospection"),
      scheduledEvent("client", "rdv_client_suivi"),
      scheduledEvent("soutenance", "soutenance"),
      scheduledEvent("atelier", "atelier_client"),
      scheduledEvent("recrutement", "entretien_candidat"),
    ])

    expect(meetings.map((item) => item.id)).toEqual([
      "atelier",
      "client",
      "prospection",
      "soutenance",
    ])
  })

  it("groupe les rendez-vous commerciaux par journée locale", () => {
    const meetings = selectCommercialMeetings([
      scheduledEvent("mardi", "rdv_prospection", "2026-07-14T09:00:00.000Z"),
      scheduledEvent("mercredi", "rdv_client_suivi", "2026-07-15T09:00:00.000Z"),
      scheduledEvent("mardi-2", "soutenance", "2026-07-14T11:00:00.000Z"),
    ])

    expect(groupCockpitMeetingsByDay(meetings)).toMatchObject([
      { date: "2026-07-14", items: [{ id: "mardi" }, { id: "mardi-2" }] },
      { date: "2026-07-15", items: [{ id: "mercredi" }] },
    ])
  })

  it("calcule la couverture à partir des positionnements et du headcount requis", () => {
    const [item] = selectCockpitOpportunities([
      opportunity("staffing", {
        requiredHeadcount: 3,
        positionings: [{ status: "envoye_client" }, { status: "retenu" }],
      }),
    ], now, weekEnd)

    expect(item).toMatchObject({ requiredHeadcount: 3, positioningCount: 2, coveringPositioningCount: 2, coverageStatus: "partial" })
  })

  it("exclut les opportunités fermées du module mobile", () => {
    const items = selectCockpitOpportunities([
      opportunity("open"),
      opportunity("closed", { stage: "gagne" }),
    ], now, weekEnd)

    expect(items.map((item) => item.id)).toEqual(["open"])
  })

  it("réutilise les liens canoniques des actions Weekly Manager", () => {
    expect(getWeeklyManagerActionAvailability("opportunity", "opp-1")).toEqual({ canCreateTask: true, href: "/missions/opps/opp-1/edit" })
    expect(getWeeklyManagerActionAvailability(undefined, undefined)).toEqual({ canCreateTask: false, href: null })
  })

  it("calcule une semaine ISO qui traverse un changement d’année", () => {
    const range = getCockpitMobileWeekRange("2025-12-31T12:00:00.000Z")

    expect(range).toMatchObject({
      startDate: "2025-12-29",
      endDate: "2026-01-04",
      weekIso: "2026-W01",
    })
  })

  it("gère les états vides sans valeur fictive", () => {
    expect(selectCockpitPriorities([])).toEqual([])
    expect(selectCockpitUrgencies([])).toEqual([])
    expect(selectTodayEvents([], "2026-07-16")).toEqual([])
    expect(selectCommercialMeetings([])).toEqual([])
    expect(selectCockpitOpportunities([], now, weekEnd)).toEqual([])
    expect(selectCockpitSignals([], now)).toEqual([])
    expect(getNextMeetingLabel([], now)).toBeNull()
  })
})
