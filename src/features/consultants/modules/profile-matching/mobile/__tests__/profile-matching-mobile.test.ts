import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProfileMatchingMobile } from "../ProfileMatchingMobile"
import type { ProfileMatchingViewModel } from "../../data/profile-matching.types"

describe("ProfileMatchingMobile", () => {
  const dummyVm: ProfileMatchingViewModel = {
    openOpportunityCount: 4,
    evaluatedOpportunityCount: 2,
    dataNotes: [],
    profiles: [
      {
        personId: "person-1",
        sourceType: "collaborator",
        sourceId: "collab-1",
        fullName: "Jean Dupont",
        currentTitle: "Data Architect",
        practiceSlug: "data-ai",
        practiceLabel: "Data & AI",
        availabilityLabel: "Disponible",
        coverage: {
          openOpportunityCount: 4,
          evaluatedOpportunityCount: 2,
          scoredOpportunityCountForProfile: 1,
        },
        matches: [
          {
            opportunityId: "opp-1",
            opportunityTitle: "Data Platform GenAI",
            clientName: "Airbus",
            stage: "recherche_profil",
            stageLabel: "Recherche profils",
            startDate: "2026-10-01",
            targetDailyRate: 750,
            overallScore: 91,
            confidence: 85,
            tier: "strong",
            modelVersion: "matching-v1.1",
            computedAt: "2026-09-08T12:00:00Z",
            components: [],
            pros: ["Compétences data pointues"],
            cons: [],
            missingData: [],
          },
        ],
      },
    ],
  }

  it("rend l'en-tête, la couverture et la carte de matching", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProfileMatchingMobile, {
        vm: dummyVm,
        selectedPersonId: "person-1",
        backHref: "/consultants?section=collaborateurs",
      }),
    )

    expect(html).toContain("Jean Dupont")
    expect(html).toContain("Data Architect")
    expect(html).toContain("Data &amp; AI")
    expect(html).toContain("1 besoin compatible")
    expect(html).toContain("2/4 évalués")
    expect(html).toContain("Airbus")
    expect(html).toContain("Data Platform GenAI")
    expect(html).toContain("91")
    expect(html).toContain("Match fort")
    expect(html).toContain('href="/consultants?section=collaborateurs"')
  })

  it("affiche un état explicite lorsque le profil n'a aucun score", () => {
    const emptyProfileVm: ProfileMatchingViewModel = {
      openOpportunityCount: 4,
      evaluatedOpportunityCount: 2,
      dataNotes: [],
      profiles: [
        {
          personId: "person-empty",
          sourceType: "candidate",
          sourceId: "cand-empty",
          fullName: "Candidat Sans Score",
          currentTitle: null,
          practiceSlug: null,
          practiceLabel: null,
          availabilityLabel: null,
          coverage: {
            openOpportunityCount: 4,
            evaluatedOpportunityCount: 2,
            scoredOpportunityCountForProfile: 0,
          },
          matches: [],
        },
      ],
    }

    const html = renderToStaticMarkup(
      React.createElement(ProfileMatchingMobile, {
        vm: emptyProfileVm,
        selectedPersonId: "person-empty",
        backHref: "/consultants?section=candidats",
      }),
    )

    expect(html).toContain("Candidat Sans Score")
    expect(html).toContain("Aucun résultat de matching disponible pour ce profil")
    expect(html).toContain("2 sur 4")
  })
})
