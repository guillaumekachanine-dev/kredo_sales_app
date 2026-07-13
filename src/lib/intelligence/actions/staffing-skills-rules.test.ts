import { describe, expect, it } from "vitest"
import {
  buildAnalyzeNeeds,
  buildPrioritizePipeline,
  buildScanContacts,
  computeSkillMatchScore,
  normalizeDemandScore,
  normalizeSupplyScore,
  type ActiveCollaboratorRow,
  type BuildAnalyzeNeedsInput,
  type BuildPrioritizePipelineInput,
  type OpportunitySkillDemandRow,
  type PersonSkillSupplyRow,
  type StaffingOpportunityRow,
} from "./staffing-skills-rules"

describe("staffing skill normalization", () => {
  it("normalizes opportunity weight and person level onto a comparable scale", () => {
    expect(normalizeDemandScore(demand({ weight: 0.8, minLevel: 4, importance: "indispensable" }))).toBeCloseTo(0.8)
    expect(normalizeSupplyScore(personSkill({ level: 4, confidence: 0.75 }))).toBeCloseTo(0.6)
  })

  it("matches by skill id and level instead of practice", () => {
    const score = computeSkillMatchScore(
      [
        demand({ skillId: "react", weight: 1, minLevel: 4 }),
        demand({ skillId: "python", weight: 1, minLevel: 3 }),
      ],
      [
        personSkill({ skillId: "react", level: 4 }),
        personSkill({ skillId: "python", level: 2 }),
      ],
    )

    expect(score).toBeGreaterThan(80)
    expect(score).toBeLessThan(90)
  })
})

describe("buildPrioritizePipeline", () => {
  it("ranks open opportunities by composite score and exposes matching profile driver", () => {
    const result = buildPrioritizePipeline({
      now: "2026-07-13T08:00:00.000Z",
      opportunities: [
        opportunity({ id: "urgent", title: "Urgent", conviction: 80, weightedGain: 120_000, targetCloseDate: "2026-07-18" }),
        opportunity({ id: "later", title: "Later", conviction: 30, weightedGain: 20_000, targetCloseDate: "2026-09-18" }),
      ],
      opportunitySkills: [demand({ opportunityId: "urgent", skillId: "react", minLevel: 4 })],
      personSkills: [personSkill({ personId: "person-1", skillId: "react", level: 5 })],
      collaborators: [collaborator({ personId: "person-1" })],
    })

    expect(result.rankedOpportunities[0]?.opportunityId).toBe("urgent")
    expect(result.rankedOpportunities[0]?.hasMatchingProfile).toBe(true)
    expect(result.rankedOpportunities[0]?.drivers.some((driver) => driver.includes("Profil interne"))).toBe(true)
  })
})

describe("buildAnalyzeNeeds", () => {
  it("marks missing internal supply as a critical subcontract gap", () => {
    const result = buildAnalyzeNeeds({
      opportunities: [{ id: "opp-1", stage: "qualification" }],
      opportunitySkills: [demand({ opportunityId: "opp-1", skillId: "k8s", skillName: "Kubernetes", weight: 1, minLevel: 4 })],
      personSkills: [],
      collaborators: [collaborator({ personId: "person-1" })],
    })

    expect(result.gaps[0]?.skillName).toBe("Kubernetes")
    expect(result.gaps[0]?.gapRatio).toBe(99)
    expect(result.gaps[0]?.recommendation).toBe("subcontract")
    expect(result.summary.criticalGaps).toBe(1)
  })

  it("treats sufficient active collaborator supply as covered", () => {
    const input: BuildAnalyzeNeedsInput = {
      opportunities: [{ id: "opp-1", stage: "qualification" }],
      opportunitySkills: [demand({ opportunityId: "opp-1", skillId: "react", weight: 0.5, minLevel: 2 })],
      personSkills: [personSkill({ personId: "person-1", skillId: "react", level: 5 })],
      collaborators: [collaborator({ personId: "person-1" })],
    }

    const result = buildAnalyzeNeeds(input)
    expect(result.gaps[0]?.recommendation).toBe("covered")
    expect(result.summary.coveredSkills).toBe(1)
  })
})

describe("buildScanContacts", () => {
  it("accepts either decision maker or prescriber for prospects", () => {
    const result = buildScanContacts({
      companies: [{ id: "company-1", name: "Acme", lifecycle: "prospect" }],
      contacts: [{ id: "contact-1", companyId: "company-1", relationshipRole: "prescripteur", status: "actif" }],
    })

    expect(result.accountCoverage[0]?.missingRoles).toEqual(["acheteur"])
    expect(result.summary.partialAccounts).toBe(1)
  })

  it("flags active clients without operational contact", () => {
    const result = buildScanContacts({
      companies: [{ id: "company-1", name: "Acme", lifecycle: "client" }],
      contacts: [{ id: "contact-1", companyId: "company-1", relationshipRole: "decideur", status: "actif" }],
    })

    expect(result.accountCoverage[0]?.missingRoles).toContain("opérationnel")
  })
})

function opportunity(overrides: Partial<StaffingOpportunityRow>): StaffingOpportunityRow {
  return {
    id: "opp-1",
    title: "Opportunity",
    companyName: "Acme",
    stage: "qualification",
    conviction: 50,
    acv: null,
    weightedGain: 50_000,
    estimatedGain: null,
    targetCloseDate: null,
    nextActionAt: null,
    ...overrides,
  }
}

function demand(overrides: Partial<OpportunitySkillDemandRow>): OpportunitySkillDemandRow {
  return {
    opportunityId: "opp-1",
    skillId: "react",
    skillName: "React",
    category: "framework",
    weight: 1,
    importance: "souhaitee",
    minLevel: 3,
    ...overrides,
  }
}

function personSkill(overrides: Partial<PersonSkillSupplyRow>): PersonSkillSupplyRow {
  return {
    personId: "person-1",
    skillId: "react",
    level: 3,
    confidence: 1,
    ...overrides,
  }
}

function collaborator(overrides: Partial<ActiveCollaboratorRow>): ActiveCollaboratorRow {
  return {
    id: "collab-1",
    personId: "person-1",
    status: "active",
    availability: "available",
    currentTitle: "Consultant",
    practice: "Digital",
    ...overrides,
  }
}
