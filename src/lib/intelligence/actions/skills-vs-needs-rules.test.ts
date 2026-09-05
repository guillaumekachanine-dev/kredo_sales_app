import { describe, expect, it } from "vitest"

import {
  DEMAND_ACCELERATION_SHARE_PCT,
  buildSkillsVsNeeds,
  type BuildSkillsVsNeedsInput,
} from "./skills-vs-needs-rules"

const NOW = "2026-09-04T09:00:00.000Z"

function input(overrides: Partial<BuildSkillsVsNeedsInput> = {}): BuildSkillsVsNeedsInput {
  return {
    now: NOW,
    windowMonths: 12,
    trendDays: 90,
    demand: [],
    supplyPeople: [],
    supplySkills: [],
    skillNameById: {},
    ...overrides,
  }
}

describe("buildSkillsVsNeeds", () => {
  // Diviser par zéro donnerait « ratio infini » là où la réponse juste est
  // « personne ne porte cette compétence ».
  it("never computes a tension ratio when nobody holds the skill", () => {
    const result = buildSkillsVsNeeds(input({
      demand: [{ opportunityId: "o1", openedAt: "2026-09-01", skillId: "s1", skillName: "Rust", category: "langage" }],
    }))

    expect(result.skills[0].tension).toBe("no_supply")
    expect(result.skills[0].tensionRatio).toBeNull()
    expect(result.summary.skillsWithoutSupply).toBe(1)
  })

  it("flags a skill carried by nobody's demand as idle, not as covered", () => {
    const result = buildSkillsVsNeeds(input({
      supplyPeople: [{ personId: "p1", role: "collaborator", title: "Dev", practice: "Data", seniority: null }],
      supplySkills: [{ personId: "p1", skillId: "s1", level: 4 }],
      skillNameById: { s1: "COBOL" },
    }))

    expect(result.skills[0].tension).toBe("idle")
    expect(result.skills[0].skillName).toBe("COBOL")
    expect(result.summary.skillsIdle).toBe(1)
  })

  it("separates a skill under tension from a covered one", () => {
    const result = buildSkillsVsNeeds(input({
      demand: [
        { opportunityId: "o1", openedAt: "2026-09-01", skillId: "tight", skillName: "Go", category: null },
        { opportunityId: "o2", openedAt: "2026-08-01", skillId: "tight", skillName: "Go", category: null },
        { opportunityId: "o3", openedAt: "2026-08-01", skillId: "ok", skillName: "SQL", category: null },
      ],
      supplyPeople: [
        { personId: "p1", role: "collaborator", title: "Dev", practice: null, seniority: null },
        { personId: "p2", role: "collaborator", title: "Dev", practice: null, seniority: null },
      ],
      supplySkills: [
        { personId: "p1", skillId: "tight", level: 3 },
        { personId: "p1", skillId: "ok", level: 3 },
        { personId: "p2", skillId: "ok", level: 3 },
      ],
      skillNameById: { tight: "Go", ok: "SQL" },
    }))

    const byId = Object.fromEntries(result.skills.map((skill) => [skill.skillId, skill]))
    expect(byId.tight.tension).toBe("tight")
    expect(byId.tight.tensionRatio).toBe(2)
    expect(byId.ok.tension).toBe("balanced")
    expect(byId.ok.tensionRatio).toBe(0.5)
    // Les tensions les plus dures remontent en tête.
    expect(result.skills[0].skillId).toBe("tight")
  })

  // Une personne à la fois collaboratrice et candidate ne doit pas gonfler
  // l'effectif, tout en restant visible dans les deux répartitions.
  it("counts a person once in headcount even when they hold two roles", () => {
    const result = buildSkillsVsNeeds(input({
      demand: [{ opportunityId: "o1", openedAt: "2026-09-01", skillId: "s1", skillName: "Go", category: null }],
      supplyPeople: [
        { personId: "p1", role: "collaborator", title: "Dev", practice: null, seniority: null },
        { personId: "p1", role: "candidate", title: "Dev", practice: null, seniority: null },
      ],
      supplySkills: [{ personId: "p1", skillId: "s1", level: 3 }],
      skillNameById: { s1: "Go" },
    }))

    expect(result.summary.supplyHeadcount).toBe(1)
    expect(result.summary.collaboratorsCount).toBe(1)
    expect(result.summary.candidatesCount).toBe(1)
    expect(result.skills[0].supplyHeadcount).toBe(1)
    expect(result.skills[0].supplyCollaborators).toBe(1)
    expect(result.skills[0].supplyCandidates).toBe(1)
  })

  it("counts a need once even when it cites the same skill twice", () => {
    const result = buildSkillsVsNeeds(input({
      demand: [
        { opportunityId: "o1", openedAt: "2026-09-01", skillId: "s1", skillName: "Go", category: null },
        { opportunityId: "o1", openedAt: "2026-09-01", skillId: "s1", skillName: "Go", category: null },
      ],
    }))

    expect(result.skills[0].demand12m).toBe(1)
    expect(result.summary.demandedNeeds12m).toBe(1)
  })

  // La fenêtre 90 jours est une PART de la fenêtre 12 mois, pas une seconde
  // mesure : c'est ce qui en fait une tendance.
  it("reads the 90-day window as a share of the 12-month one", () => {
    const result = buildSkillsVsNeeds(input({
      demand: [
        { opportunityId: "recent1", openedAt: "2026-08-20", skillId: "s1", skillName: "Go", category: null },
        { opportunityId: "recent2", openedAt: "2026-07-20", skillId: "s1", skillName: "Go", category: null },
        { opportunityId: "old", openedAt: "2026-01-20", skillId: "s1", skillName: "Go", category: null },
      ],
    }))

    expect(result.skills[0].demand12m).toBe(3)
    expect(result.skills[0].demand90d).toBe(2)
    expect(result.skills[0].recentSharePct).toBeCloseTo(66.7, 1)
    expect(result.skills[0].isAccelerating).toBe(true)
    expect(result.summary.demandedNeeds90d).toBe(2)
  })

  it("does not call a steady demand an acceleration", () => {
    const demand = Array.from({ length: 10 }, (_, index) => ({
      opportunityId: `o${index}`,
      openedAt: index === 0 ? "2026-08-20" : "2026-02-20",
      skillId: "s1",
      skillName: "Go",
      category: null,
    }))

    const result = buildSkillsVsNeeds(input({ demand }))
    expect(result.skills[0].recentSharePct).toBe(10)
    expect(result.skills[0].recentSharePct!).toBeLessThan(DEMAND_ACCELERATION_SHARE_PCT)
    expect(result.skills[0].isAccelerating).toBe(false)
  })

  it("builds the supply rails ordered by headcount", () => {
    const result = buildSkillsVsNeeds(input({
      supplyPeople: [
        { personId: "p1", role: "collaborator", title: "Data Engineer", practice: "Data", seniority: null },
        { personId: "p2", role: "collaborator", title: "Data Engineer", practice: "Data", seniority: null },
        { personId: "p3", role: "candidate", title: "Architecte", practice: "Cloud", seniority: null },
      ],
      supplySkills: [
        { personId: "p1", skillId: "s1", level: 3 },
        { personId: "p2", skillId: "s1", level: 3 },
        { personId: "p3", skillId: "s2", level: 3 },
      ],
      skillNameById: { s1: "Python", s2: "Terraform" },
    }))

    expect(result.topProfiles[0]).toEqual({ label: "Data Engineer", collaborators: 2, candidates: 0, total: 2 })
    expect(result.topSkills[0]).toEqual({ label: "Python", collaborators: 2, candidates: 0, total: 2 })
    expect(result.practices.map((entry) => entry.label)).toEqual(["Data", "Cloud"])
  })

  it("ignores skills held by someone who is not in the supply population", () => {
    const result = buildSkillsVsNeeds(input({
      supplyPeople: [],
      supplySkills: [{ personId: "ghost", skillId: "s1", level: 5 }],
      skillNameById: { s1: "Go" },
    }))

    expect(result.skills).toHaveLength(0)
    expect(result.summary.supplyHeadcount).toBe(0)
  })
})
