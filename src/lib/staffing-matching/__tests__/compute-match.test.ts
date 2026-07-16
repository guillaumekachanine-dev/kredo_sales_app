import { describe, expect, it } from "vitest"
import { computeMatching, scoreProfile } from "../compute-match"
import { MATCH_VERSION } from "../match-config"
import type { MatchingContext, MatchingNeed, MatchingProfile, NeedSkill, ProfileSkill } from "../types"

const SKILL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const SKILL_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

function need(overrides: Partial<MatchingNeed> = {}): MatchingNeed {
  return {
    id: "opp-1",
    title: "Ingénieur Data",
    practice: "Data & AI",
    seniority: "Senior",
    location: "Paris",
    remotePolicy: "hybride",
    startDate: "2026-09-01",
    durationDays: 200,
    targetDailyRate: 600,
    needSummary: "",
    skills: [
      needSkill(SKILL_A, "Python", "indispensable", 4),
      needSkill(SKILL_B, "SQL", "souhaitee", 3),
    ],
    ...overrides,
  }
}

function needSkill(skillId: string, skillName: string, importance: NeedSkill["importance"], minLevel: number | null): NeedSkill {
  return { skillId, skillName, importance, minLevel, minYears: null, weight: 1 }
}

function profileSkill(skillId: string, level: number | null, confidence = 0.8): ProfileSkill {
  return { skillId, level, years: 5, confidence }
}

function candidate(overrides: Partial<MatchingProfile> = {}): MatchingProfile {
  return {
    sourceType: "candidate",
    sourceId: "cand-1",
    personId: "person-1",
    fullName: "Alice Martin",
    currentTitle: "Data Engineer",
    seniority: "Senior",
    expectedDailyRate: 550,
    availableFrom: "2026-08-01",
    availabilityStatus: "vivier",
    mobility: "National",
    maxCommuteMinutes: 60,
    remotePreference: "hybride",
    practiceLabel: "Data & AI",
    sectorContext: null,
    jobProfileId: null,
    hasCandidateProfile: true,
    skills: [profileSkill(SKILL_A, 5), profileSkill(SKILL_B, 4)],
    ...overrides,
  }
}

function ctx(profiles: MatchingProfile[], needOverrides: Partial<MatchingNeed> = {}): MatchingContext {
  return { need: need(needOverrides), profiles, dataCutoffAt: "2026-07-16T00:00:00Z" }
}

describe("computeMatching", () => {
  it("renvoie un pool vide sans erreur", () => {
    const result = computeMatching(ctx([]))
    expect(result.rankedProfiles).toEqual([])
    expect(result.poolSize).toBe(0)
    expect(result.modelVersion).toBe(MATCH_VERSION)
  })

  it("classe le profil parfaitement aligné en tête avec un tier fort", () => {
    const perfect = candidate({ sourceId: "perfect", fullName: "Perfect Fit" })
    const weak = candidate({
      sourceId: "weak",
      fullName: "Weak Fit",
      seniority: "Junior",
      skills: [profileSkill(SKILL_A, 1)],
      expectedDailyRate: 900,
    })
    const result = computeMatching(ctx([weak, perfect]))
    expect(result.rankedProfiles[0].sourceId).toBe("perfect")
    expect(result.rankedProfiles[0].overallScore).toBeGreaterThan(result.rankedProfiles[1].overallScore)
    expect(result.rankedProfiles[0].tier).toBe("strong")
  })
})

describe("scoreProfile — composantes", () => {
  it("borne le score entre 0 et 100", () => {
    const res = scoreProfile(need(), candidate())
    expect(res.overallScore).toBeGreaterThanOrEqual(0)
    expect(res.overallScore).toBeLessThanOrEqual(100)
  })

  it("pénalise une compétence indispensable absente et la remonte en 'contre'", () => {
    const missing = candidate({ skills: [profileSkill(SKILL_B, 4)] }) // pas de Python (indispensable)
    const res = scoreProfile(need(), missing)
    const c1 = res.components.find((c) => c.componentKey === "C1_skills")!
    expect(c1.applicable).toBe(true)
    expect(c1.negatives.some((n) => n.includes("Python"))).toBe(true)
    expect(res.cons.some((c) => c.includes("Python"))).toBe(true)
  })

  it("marque C3 (tarif) non applicable pour un collaborateur et le remonte dans missingData", () => {
    const collab = candidate({ sourceType: "collaborator", sourceId: "collab-1", expectedDailyRate: null })
    const res = scoreProfile(need(), collab)
    const c3 = res.components.find((c) => c.componentKey === "C3_rate")!
    expect(c3.applicable).toBe(false)
    expect(res.missingData).toContain("Compatibilité tarifaire")
  })

  it("exclut une composante non applicable du calcul (renormalisation), sans pénalité muette", () => {
    // Deux candidats identiques sauf le TJM : l'un dans le budget, l'autre sans TJM connu.
    const withRate = candidate({ sourceId: "with-rate", expectedDailyRate: 550 })
    const noRate = candidate({ sourceId: "no-rate", expectedDailyRate: null })
    const scored = [scoreProfile(need(), withRate), scoreProfile(need(), noRate)]
    const noRateRes = scored.find((r) => r.sourceId === "no-rate")!
    // Le candidat sans TJM ne doit pas être pénalisé à 0 sur ce critère : C3 est juste absent.
    expect(noRateRes.missingData).toContain("Compatibilité tarifaire")
    expect(noRateRes.overallScore).toBeGreaterThan(0)
  })

  it("pénalise davantage la sous-séniorité que la sur-séniorité", () => {
    const under = scoreProfile(need({ seniority: "Senior" }), candidate({ seniority: "Junior" }))
    const over = scoreProfile(need({ seniority: "Confirmé" }), candidate({ seniority: "Lead" }))
    const underC2 = under.components.find((c) => c.componentKey === "C2_seniority")!
    const overC2 = over.components.find((c) => c.componentKey === "C2_seniority")!
    expect(underC2.normalizedScore).toBeLessThan(overC2.normalizedScore)
  })

  it("dégrade C3 quand le TJM dépasse la cible", () => {
    const overBudget = scoreProfile(need({ targetDailyRate: 500 }), candidate({ expectedDailyRate: 750 }))
    const c3 = overBudget.components.find((c) => c.componentKey === "C3_rate")!
    expect(c3.applicable).toBe(true)
    expect(c3.normalizedScore).toBeLessThan(100)
    expect(c3.negatives.length).toBeGreaterThan(0)
  })

  it("dégrade C4 quand la disponibilité est postérieure au démarrage", () => {
    const late = scoreProfile(need({ startDate: "2026-09-01" }), candidate({ availableFrom: "2026-11-01" }))
    const c4 = late.components.find((c) => c.componentKey === "C4_availability")!
    expect(c4.applicable).toBe(true)
    expect(c4.normalizedScore).toBeLessThan(100)
  })

  it("neutralise C5 (localisation) en télétravail total", () => {
    const res = scoreProfile(need({ remotePolicy: "Full remote", location: "Lyon" }), candidate({ mobility: null }))
    const c5 = res.components.find((c) => c.componentKey === "C5_location")!
    expect(c5.applicable).toBe(true)
    expect(c5.normalizedScore).toBe(100)
  })

  it("bascule en insufficient_data quand trop peu de poids est évaluable", () => {
    // Besoin sans compétences ni séniorité ni TJM ni date ni practice : seule la
    // localisation/mobilité peut éventuellement être notée (poids 5/100 < 40 %).
    const barren = need({
      skills: [],
      seniority: null,
      targetDailyRate: null,
      startDate: null,
      practice: null,
      remotePolicy: "Full remote",
      location: "Paris",
    })
    const res = scoreProfile(barren, candidate({ seniority: null, expectedDailyRate: null, availableFrom: null, practiceLabel: null }))
    expect(res.tier).toBe("insufficient_data")
  })
})

describe("normaliseurs", () => {
  it("mappe les libellés de séniorité parenthésés", () => {
    const res = scoreProfile(need({ seniority: "Confirmé (3-5 ans)" }), candidate({ seniority: "confirmé" }))
    const c2 = res.components.find((c) => c.componentKey === "C2_seniority")!
    expect(c2.applicable).toBe(true)
    expect(c2.normalizedScore).toBe(100)
  })
})
