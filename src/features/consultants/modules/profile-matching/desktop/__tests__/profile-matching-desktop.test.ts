import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { ProfileMatchingDesktop } from "../ProfileMatchingDesktop"
import type { ProfileMatchingViewModel } from "../../data/profile-matching.types"

describe("ProfileMatchingDesktop", () => {
  const dummyVm: ProfileMatchingViewModel = {
    openOpportunityCount: 5,
    evaluatedOpportunityCount: 3,
    dataNotes: [],
    profiles: [
      {
        personId: "person-1",
        sourceType: "collaborator",
        sourceId: "collab-1",
        fullName: "Jean Dupont",
        currentTitle: "Architecte Cloud",
        practiceSlug: "cloud-engineering",
        practiceLabel: "Cloud Engineering",
        availabilityLabel: "En mission",
        coverage: {
          openOpportunityCount: 5,
          evaluatedOpportunityCount: 3,
          scoredOpportunityCountForProfile: 1,
        },
        matches: [
          {
            opportunityId: "opp-1",
            opportunityTitle: "Move to AWS",
            clientName: "Thales",
            stage: "recherche_profil",
            stageLabel: "Recherche profils",
            startDate: "2026-10-01",
            targetDailyRate: 850,
            overallScore: 92,
            confidence: 85,
            tier: "strong",
            modelVersion: "matching-v1.1",
            computedAt: "2026-09-08T12:00:00Z",
            components: [
              {
                componentKey: "C1_skills",
                componentLabel: "Couverture compétences",
                applicable: true,
                normalizedScore: 95,
                confidence: 90,
                explanation: "Expertise AWS alignée.",
                positives: ["AWS", "Kubernetes"],
                negatives: [],
                evidenceRefs: [],
              },
            ],
            pros: ["Compétences clés validées"],
            cons: [],
            missingData: [],
          },
        ],
      },
      {
        personId: "person-2",
        sourceType: "candidate",
        sourceId: "cand-1",
        fullName: "Marie Martin",
        currentTitle: "Data Engineer",
        practiceSlug: "data-ai",
        practiceLabel: "Data & AI",
        availabilityLabel: "Disponible",
        coverage: {
          openOpportunityCount: 5,
          evaluatedOpportunityCount: 3,
          scoredOpportunityCountForProfile: 0,
        },
        matches: [],
      },
    ],
  }

  it("rend la modale IntelligenceSplitModalShell avec titre et sous-titre", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProfileMatchingDesktop, {
        vm: dummyVm,
        closeHref: "/consultants?section=synthese",
      }),
    )

    expect(html).toContain("Matching profil")
    expect(html).toContain("Projection des besoins compatibles par profil")
    expect(html).toContain("Jean Dupont")
    expect(html).toContain("Marie Martin")
    expect(html).toContain("Move to AWS")
    expect(html).toContain("Thales")
    expect(html).toContain("92")
    expect(html).toContain("Match fort")
  })

  it("affiche la couverture et les empty states", () => {
    const emptyVm: ProfileMatchingViewModel = {
      openOpportunityCount: 0,
      evaluatedOpportunityCount: 0,
      dataNotes: [],
      profiles: [],
    }

    const html = renderToStaticMarkup(
      React.createElement(ProfileMatchingDesktop, {
        vm: emptyVm,
        closeHref: "/consultants?section=synthese",
      }),
    )

    expect(html).toContain("Matching profil")
    expect(html).toContain("Aucun profil ne correspond aux critères sélectionnés.")
  })

  it("interdit les wrappers de modalité custom dans ProfileMatchingDesktop (sentinelle)", () => {
    const filePath = resolve(
      process.cwd(),
      "src/features/consultants/modules/profile-matching/desktop/ProfileMatchingDesktop.tsx",
    )
    const source = readFileSync(filePath, "utf-8")

    expect(source).toContain("IntelligenceSplitModalShell")
    expect(source).not.toContain('role="dialog"')
    expect(source).not.toContain("fixed inset-0")
    expect(source).not.toContain("window.addEventListener")
  })
})
