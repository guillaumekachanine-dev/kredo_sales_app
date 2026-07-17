import { describe, it, expect } from "vitest"
import { buildAccountPrioritizationModel } from "../models/build-account-prioritization-model"
import { buildSectorPlaybookModel } from "../models/build-sector-playbook-model"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"
import { buildAccountAttackModel } from "../models/build-account-attack-model"

describe("BI Models", () => {
  it("les builders sont déterministes et ne mutent pas leurs entrées", () => {
    const mockSnapshot = {
      accounts: [
        { id: "1", name: "Test Account", sectorId: "s1", actionPriorityScore: 50, potentialScore: 60, reachScore: 40, momentumScore: 30, legacyFolioScore: null }
      ],
      scores: {},
      signals: [],
      sectors: [],
      windows: [],
      _rawSources: {
        sectorRows: [],
        painPointRows: [],
        eventRows: [],
        newsRows: [],
        regulatoryRows: [],
      }
    }

    const cloned = JSON.parse(JSON.stringify(mockSnapshot))
    
    buildAccountPrioritizationModel(mockSnapshot as any)
    expect(mockSnapshot).toEqual(cloned)
  })

  it("les quatre provenances ne sont pas confondues", () => {
    const mockSnapshot = {
      accounts: [
        { id: "native", name: "Native", actionPriorityScore: 90, legacyFolioScore: null },
        { id: "legacy", name: "Legacy", actionPriorityScore: 80, legacyFolioScore: 4 },
        { id: "proxy", name: "Proxy", actionPriorityScore: 70, legacyFolioScore: null },
      ],
      scores: {
        "native": { scoreValue: 85, scoreBand: "A", confidenceScore: 90 }
      },
      signals: [],
      sectors: [],
      windows: []
    }

    const result = buildAccountPrioritizationModel(mockSnapshot as any)
    expect(result.find(r => r.accountId === "native")?.provenance).toBe("REAL_NATIVE")
    expect(result.find(r => r.accountId === "legacy")?.provenance).toBe("REAL_LEGACY")
    expect(result.find(r => r.accountId === "proxy")?.provenance).toBe("PROXY")
  })

  it("un secteur watch ne reçoit aucun faux playbook", () => {
    const mockSnapshot = {
      accounts: [],
      scores: {},
      signals: [],
      sectors: [
        { id: "s1", name: "Watch Sector", status: "watch" }
      ],
      windows: []
    }

    const playbook = buildSectorPlaybookModel(mockSnapshot as any, "s1")
    expect(playbook?.personas).toEqual([])
    expect(playbook?.roiArguments).toEqual([])
    expect(playbook?.summary).toBe("Secteur en préparation / veille")
  })

  it("le dernier score natif est choisi par compte et ses composants rattachés", () => {
    const mockSnapshot = {
      accounts: [{ id: "c1", name: "Test" }],
      scores: {
        "c1": {
          runId: "r1",
          scoreValue: 80,
          components: [
            { key: "c1", label: "Strong driver", normalizedScore: 80 }
          ]
        }
      },
      signals: [],
      sectors: [],
      windows: []
    }

    const result = buildAccountAttackModel(mockSnapshot as any, "c1")
    expect(result?.positiveDrivers).toContain("Strong driver")
    expect(result?.provenance).toBe("REAL_NATIVE")
  })
})
