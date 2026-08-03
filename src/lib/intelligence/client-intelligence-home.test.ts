import { describe, expect, it } from "vitest"
import {
  estimateMonthlyWatchCost,
  getMonitoredSourceLabels,
  selectPrimaryCommercialWindow,
} from "./client-intelligence-home"
import type { SectorSnapshotRegulatoryItem } from "./sector-snapshot-data"

function commercialWindow(
  overrides: Partial<SectorSnapshotRegulatoryItem> = {},
): SectorSnapshotRegulatoryItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Échéance",
    authority: overrides.authority ?? null,
    description: overrides.description ?? null,
    deadlineDate: overrides.deadlineDate ?? null,
    urgency: overrides.urgency ?? "medium",
    kredoPractice: overrides.kredoPractice ?? null,
    commercialAngle: overrides.commercialAngle ?? null,
    isCommercialWindow: overrides.isCommercialWindow ?? true,
    sourceUrl: overrides.sourceUrl ?? null,
  }
}

const NOW = new Date("2026-07-18T12:00:00.000Z")

describe("client intelligence home rules", () => {
  it("prioritizes urgency across several future windows", () => {
    const selected = selectPrimaryCommercialWindow([
      commercialWindow({ id: "medium-soon", urgency: "medium", deadlineDate: "2026-07-20" }),
      commercialWindow({ id: "critical-later", urgency: "critical", deadlineDate: "2026-09-01" }),
      commercialWindow({ id: "high-soon", urgency: "high", deadlineDate: "2026-07-19" }),
    ], NOW)

    expect(selected?.id).toBe("critical-later")
  })

  it("chooses the nearest future deadline when urgency is equal", () => {
    const selected = selectPrimaryCommercialWindow([
      commercialWindow({ id: "later", urgency: "high", deadlineDate: "2026-08-12" }),
      commercialWindow({ id: "sooner", urgency: "high", deadlineDate: "2026-07-31" }),
    ], NOW)

    expect(selected?.id).toBe("sooner")
  })

  it("prefers an undated window when no future deadline remains", () => {
    const selected = selectPrimaryCommercialWindow([
      commercialWindow({ id: "past", deadlineDate: "2026-07-01" }),
      commercialWindow({ id: "undated", deadlineDate: null }),
    ], NOW)

    expect(selected?.id).toBe("undated")
  })

  it("chooses the most recent past deadline when all windows are dated and past", () => {
    const selected = selectPrimaryCommercialWindow([
      commercialWindow({ id: "older", urgency: "critical", deadlineDate: "2025-01-01" }),
      commercialWindow({ id: "recent", urgency: "low", deadlineDate: "2026-07-17" }),
    ], NOW)

    expect(selected?.id).toBe("recent")
  })

  it("returns null when no commercial window exists", () => {
    expect(selectPrimaryCommercialWindow([
      commercialWindow({ isCommercialWindow: false }),
    ], NOW)).toBeNull()
  })

  it.each([
    ["weekly", 4.345],
    ["twice_weekly", 8.69],
    ["daily", 30.44],
  ])("estimates %s watch cost from the shared cadence source", (cadence, runs) => {
    expect(estimateMonthlyWatchCost(0.5, cadence)).toBeCloseTo(0.5 * runs)
  })

  it("keeps unavailable and unknown watch-cost inputs unavailable", () => {
    expect(estimateMonthlyWatchCost(null, "weekly")).toBeNull()
    expect(estimateMonthlyWatchCost(0.5, "hourly")).toBeNull()
  })

  it("maps enabled watch flags to monitored-source labels", () => {
    expect(getMonitoredSourceLabels({
      includeOfficialSite: true,
      includeNews: false,
      includePublicRecords: false,
      includeTenders: true,
      includeSocialManual: false,
    })).toEqual(["Site officiel", "Appels d’offres"])
  })
})
