import { describe, expect, it } from "vitest"
import type { MatchingNeed } from "@/lib/staffing-matching/types"
import { computeMatching } from "@/lib/staffing-matching/compute-match"

describe("Account Recruitment & Custom Matching Unit Tests", () => {
  it("vérifie qu'un besoin personnalisé s'exécute correctement sur un pool de profils sans persistance", () => {
    const customNeed: MatchingNeed = {
      id: "temp-custom-need-1",
      title: "Architecte DevOps & Cloud",
      practice: "cloud_devops",
      seniority: "senior",
      location: "Paris",
      remotePolicy: "full_remote",
      startDate: "2026-09-01",
      durationDays: 180,
      targetDailyRate: 750,
      needSummary: "Besoin de renfort sur la migration Kubernetes et AWS.",
      skills: [
        { skillId: "sk-aws", skillName: "AWS", importance: "indispensable", minLevel: 4, minYears: 3, weight: 100 },
        { skillId: "sk-k8s", skillName: "Kubernetes", importance: "indispensable", minLevel: 3, minYears: 2, weight: 90 },
      ],
    }

    const profilesPool = [
      {
        sourceType: "candidate" as const,
        sourceId: "cand-1",
        personId: "p-1",
        fullName: "Jean Dupont",
        currentTitle: "Architecte Cloud AWS",
        seniority: "senior",
        expectedDailyRate: 700,
        availableFrom: "2026-09-01",
        availabilityStatus: "qualifie",
        mobility: "France",
        maxCommuteMinutes: 45,
        remotePreference: "full_remote",
        practiceLabel: "Cloud",
        sectorContext: null,
        jobProfileId: null,
        hasCandidateProfile: true,
        skills: [
          { skillId: "sk-aws", level: 5, years: 4, confidence: 90 },
          { skillId: "sk-k8s", level: 4, years: 3, confidence: 85 },
        ],
      },
      {
        sourceType: "collaborator" as const,
        sourceId: "collab-1",
        personId: "p-2",
        fullName: "Alice Martin",
        currentTitle: "Ingénieur DevOps",
        seniority: "confirme",
        expectedDailyRate: null,
        availableFrom: "2026-09-15",
        availabilityStatus: "intercontrat",
        mobility: null,
        maxCommuteMinutes: null,
        remotePreference: null,
        practiceLabel: "DevOps",
        sectorContext: null,
        jobProfileId: null,
        hasCandidateProfile: false,
        skills: [
          { skillId: "sk-aws", level: 3, years: 2, confidence: 75 },
        ],
      },
    ]

    const result = computeMatching({
      need: customNeed,
      profiles: profilesPool,
      dataCutoffAt: "2026-08-23T12:00:00.000Z",
    })

    expect(result.needId).toBe("temp-custom-need-1")
    expect(result.needTitle).toBe("Architecte DevOps & Cloud")
    expect(result.poolSize).toBe(2)
    expect(result.rankedProfiles.length).toBe(2)
    expect(result.rankedProfiles[0].fullName).toBe("Jean Dupont")
    expect(result.rankedProfiles[0].tier).toBe("strong")
  })
})
