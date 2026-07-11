import { describe, expect, it } from "vitest"
import {
  collaboratorSummaryLine,
  missionOptionsFromCollaboratorContext,
  type CollaboratorRpcContext,
} from "./communication-collaborator-context"

describe("missionOptionsFromCollaboratorContext", () => {
  it("returns nothing for an unloaded context", () => {
    expect(missionOptionsFromCollaboratorContext(undefined)).toEqual([])
  })

  it("puts the current mission first (command §2 default) without duplicating it in recent missions", () => {
    const context: CollaboratorRpcContext = {
      currentMission: { id: "m1", companyId: "c1", title: "Mission Acme", status: "active", roleTitle: null, startDate: null, endDate: null },
      recentMissions: [
        { id: "m1", companyId: "c1", title: "Mission Acme", status: "active", roleTitle: null, startDate: null, endDate: null },
        { id: "m2", companyId: "c2", title: "Mission Beta", status: "ended", roleTitle: null, startDate: null, endDate: null },
      ],
    }
    const options = missionOptionsFromCollaboratorContext(context)
    expect(options).toEqual([
      { id: "m1", label: "Mission Acme", meta: "active" },
      { id: "m2", label: "Mission Beta", meta: "ended" },
    ])
  })

  it("falls back to recentMissions when there is no active current mission (mission facultative, intercontrat)", () => {
    const context: CollaboratorRpcContext = {
      currentMission: null,
      recentMissions: [
        { id: "m3", companyId: "c3", title: "Mission passée", status: "ended", roleTitle: null, startDate: null, endDate: null },
      ],
    }
    expect(missionOptionsFromCollaboratorContext(context)).toEqual([
      { id: "m3", label: "Mission passée", meta: "ended" },
    ])
  })

  it("is empty when the consultant has no mission at all (intercontrat pur)", () => {
    expect(missionOptionsFromCollaboratorContext({ currentMission: null, recentMissions: [] })).toEqual([])
  })
})

describe("collaboratorSummaryLine", () => {
  it("reports an unloaded context factually rather than a fabricated summary", () => {
    expect(collaboratorSummaryLine(undefined)).toBe("Profil non chargé.")
  })

  it("joins only the fields that are actually present", () => {
    expect(collaboratorSummaryLine({
      collaborator: { currentTitle: "Consultant Data", seniority: "Senior", practice: "Data & AI", status: "actif", availability: "en mission" },
    })).toBe("Consultant Data · Data & AI · Senior")

    expect(collaboratorSummaryLine({
      collaborator: { currentTitle: null, seniority: null, practice: null, status: "actif", availability: null },
    })).toBe("Profil consultant")
  })
})
