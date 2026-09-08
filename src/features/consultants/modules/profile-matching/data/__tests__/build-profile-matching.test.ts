import { describe, expect, it } from "vitest"
import { buildProfileMatching } from "../build-profile-matching"
import type {
  RawMatchingCandidate,
  RawMatchingCollaborator,
  RawMatchingOpportunity,
  RawMatchScoreRow,
} from "../profile-matching.types"

describe("buildProfileMatching (Pure Builder)", () => {
  const dummyPractices = [
    { id: "p-cloud", slug: "cloud-engineering", name: "Cloud Engineering" },
    { id: "p-data", slug: "data-ai", name: "Data & AI" },
  ]

  const baseCollab: RawMatchingCollaborator = {
    id: "collab-1",
    person_id: "person-1",
    status: "en_mission",
    current_title: "Architecte Cloud",
    seniority: "Lead / Expert",
    practice: "Cloud Engineering",
    job_profile_id: null,
    person: {
      id: "person-1",
      full_name: "Jean Dupont",
      first_name: "Jean",
      last_name: "Dupont",
    },
  }

  const baseCandidate: RawMatchingCandidate = {
    id: "cand-1",
    person_id: "person-2",
    status: "vivier",
    current_title: "Data Engineer",
    seniority: "Senior",
    practice_id: "p-data",
    job_profile_id: null,
    available_from: "2026-10-01",
    notice_period_days: 30,
    expected_daily_rate: 650,
    person: {
      id: "person-2",
      full_name: "Marie Martin",
      first_name: "Marie",
      last_name: "Martin",
    },
  }

  const baseOpenOpp1: RawMatchingOpportunity = {
    id: "opp-open-1",
    title: "Migration Cloud AWS",
    stage: "recherche_profil",
    start_date: "2026-10-15",
    target_daily_rate: 800,
    requires_staffing: true,
    updated_at: "2026-09-08T10:00:00Z",
    company_id: "comp-1",
    companies: { name: "Thales" },
  }

  const baseOpenOpp2: RawMatchingOpportunity = {
    id: "opp-open-2",
    title: "Data Platform GenAI",
    stage: "qualification",
    start_date: "2026-11-01",
    target_daily_rate: 700,
    requires_staffing: true,
    updated_at: "2026-09-07T10:00:00Z",
    company_id: "comp-2",
    companies: [{ name: "Airbus" }],
  }

  const baseTerminalOpp: RawMatchingOpportunity = {
    id: "opp-term-1",
    title: "Projet Legacy Clôturé",
    stage: "gagne",
    start_date: "2026-01-01",
    target_daily_rate: 600,
    requires_staffing: true,
    updated_at: "2026-01-01T00:00:00Z",
    company_id: "comp-3",
    companies: { name: "Client Gagné" },
  }

  it("1. associe et trie plusieurs scores par ordre décroissant pour un collaborateur", () => {
    const scores: RawMatchScoreRow[] = [
      {
        id: "s1",
        opportunity_id: "opp-open-1",
        person_id: "person-1",
        overall_score: 75,
        model_version: "matching-v1.1",
        scores: {
          tier: "moderate",
          confidence: 80,
          components: [],
          pros: ["Bon fit cloud"],
          cons: [],
          missingData: [],
        },
        created_at: "2026-09-08T12:00:00Z",
        source_run_id: null,
      },
      {
        id: "s2",
        opportunity_id: "opp-open-2",
        person_id: "person-1",
        overall_score: 92,
        model_version: "matching-v1.1",
        scores: {
          tier: "strong",
          confidence: 90,
          components: [],
          pros: ["Expertise alignée"],
          cons: [],
          missingData: [],
        },
        created_at: "2026-09-08T12:30:00Z",
        source_run_id: null,
      },
    ]

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1, baseOpenOpp2],
      scores,
      offerPractices: dummyPractices,
    })

    expect(vm.profiles).toHaveLength(1)
    const profile = vm.profiles[0]
    expect(profile.personId).toBe("person-1")
    expect(profile.sourceType).toBe("collaborator")
    expect(profile.matches).toHaveLength(2)
    // Tri décroissant
    expect(profile.matches[0].overallScore).toBe(92)
    expect(profile.matches[0].opportunityId).toBe("opp-open-2")
    expect(profile.matches[1].overallScore).toBe(75)
    expect(profile.matches[1].opportunityId).toBe("opp-open-1")
  })

  it("2. associe et traite les scores pour un candidat pertinent", () => {
    const score: RawMatchScoreRow = {
      id: "s-cand",
      opportunity_id: "opp-open-2",
      person_id: "person-2",
      overall_score: 88,
      model_version: "matching-v1.1",
      scores: {
        tier: "strong",
        confidence: 85,
        components: [],
        pros: ["Compétences data"],
        cons: [],
        missingData: [],
      },
      created_at: "2026-09-08T12:00:00Z",
      source_run_id: null,
    }

    const vm = buildProfileMatching({
      collaborators: [],
      candidates: [baseCandidate],
      opportunities: [baseOpenOpp1, baseOpenOpp2],
      scores: [score],
      offerPractices: dummyPractices,
    })

    expect(vm.profiles).toHaveLength(1)
    const profile = vm.profiles[0]
    expect(profile.sourceType).toBe("candidate")
    expect(profile.practiceSlug).toBe("data-ai")
    expect(profile.practiceLabel).toBe("Data & AI")
    expect(profile.availabilityLabel).toBe("Disponible le 01 oct. 2026")
    expect(profile.matches).toHaveLength(1)
    expect(profile.matches[0].clientName).toBe("Airbus")
  })

  it("3. exclut strictement les opportunités terminales et leurs scores", () => {
    const scores: RawMatchScoreRow[] = [
      {
        id: "s-term",
        opportunity_id: "opp-term-1",
        person_id: "person-1",
        overall_score: 99,
        model_version: "matching-v1.1",
        scores: { tier: "strong" },
        created_at: "2026-01-01T00:00:00Z",
        source_run_id: null,
      },
      {
        id: "s-open",
        opportunity_id: "opp-open-1",
        person_id: "person-1",
        overall_score: 80,
        model_version: "matching-v1.1",
        scores: { tier: "strong" },
        created_at: "2026-09-08T12:00:00Z",
        source_run_id: null,
      },
    ]

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1, baseTerminalOpp],
      scores,
      offerPractices: dummyPractices,
    })

    expect(vm.openOpportunityCount).toBe(1)
    expect(vm.profiles[0].matches).toHaveLength(1)
    expect(vm.profiles[0].matches[0].opportunityId).toBe("opp-open-1")
  })

  it("4. gère un score JSON complet avec composantes C1-C6", () => {
    const scoreRow: RawMatchScoreRow = {
      id: "s-full",
      opportunity_id: "opp-open-1",
      person_id: "person-1",
      overall_score: 85.5,
      model_version: "matching-v1.1",
      scores: {
        tier: "strong",
        confidence: 88,
        components: [
          {
            componentKey: "C1_skills",
            componentLabel: "Compétences",
            applicable: true,
            normalizedScore: 90,
            confidence: 90,
            explanation: "Stack alignée AWS & Terraform.",
            positives: ["AWS", "Terraform"],
            negatives: [],
            evidenceRefs: [{ table: "opportunity_skills", id: "os-1" }],
          },
          {
            componentKey: "C2_seniority",
            componentLabel: "Séniorité",
            applicable: true,
            normalizedScore: 100,
            confidence: 85,
            explanation: "Lead / Expert",
            positives: [],
            negatives: [],
            evidenceRefs: [],
          },
        ],
        pros: ["Profil disponible", "TJM aligné"],
        cons: ["Localisation distante"],
        missingData: ["Disponibilité exacte"],
      },
      created_at: "2026-09-08T14:00:00Z",
      source_run_id: "run-abc",
    }

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1],
      scores: [scoreRow],
      offerPractices: dummyPractices,
    })

    const match = vm.profiles[0].matches[0]
    expect(match.overallScore).toBe(85.5)
    expect(match.confidence).toBe(88)
    expect(match.tier).toBe("strong")
    expect(match.components).toHaveLength(2)
    expect(match.components[0].componentKey).toBe("C1_skills")
    expect(match.pros).toEqual(["Profil disponible", "TJM aligné"])
    expect(match.cons).toEqual(["Localisation distante"])
    expect(match.missingData).toEqual(["Disponibilité exacte"])
    expect(match.modelVersion).toBe("matching-v1.1")
    expect(match.computedAt).toBe("2026-09-08T14:00:00Z")
  })

  it("5. gère un score JSON partiel sans faire planter le module", () => {
    const partialScoreRow: RawMatchScoreRow = {
      id: "s-part",
      opportunity_id: "opp-open-1",
      person_id: "person-1",
      overall_score: 65,
      model_version: null,
      scores: {
        // pas de tier, pas de components
        pros: ["Motivation"],
      },
      created_at: "2026-09-08T14:00:00Z",
      source_run_id: null,
    }

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1],
      scores: [partialScoreRow],
    })

    const match = vm.profiles[0].matches[0]
    expect(match.overallScore).toBe(65)
    expect(match.tier).toBe("moderate") // inféré depuis score 65
    expect(match.components).toEqual([])
    expect(match.pros).toEqual(["Motivation"])
    expect(match.cons).toEqual([])
    expect(match.missingData).toEqual([])
  })

  it("6. gère un score JSON legacy / synthétique sans planter et émet une dataNote", () => {
    const legacyScoreRow: RawMatchScoreRow = {
      id: "s-leg",
      opportunity_id: "opp-open-1",
      person_id: "person-1",
      overall_score: 94,
      model_version: "synthetic-seed-v1",
      scores: {
        synthetic: true,
        reasons: ["Expertise SCADA", "Présence site acceptée"],
        risk_flags: ["Mobilité restreinte"],
      },
      created_at: "2026-05-28T07:00:00Z",
      source_run_id: null,
    }

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1],
      scores: [legacyScoreRow],
    })

    const match = vm.profiles[0].matches[0]
    expect(match.overallScore).toBe(94)
    expect(match.tier).toBe("strong")
    expect(match.pros).toEqual(["Expertise SCADA", "Présence site acceptée"])
    expect(match.cons).toEqual(["Mobilité restreinte"])
    expect(vm.dataNotes.length).toBeGreaterThan(0)
  })

  it("7. point critique : l'absence de score ne génère PAS de score 0", () => {
    // 2 besoins ouverts, mais un seul a un score pour person-1
    const scores: RawMatchScoreRow[] = [
      {
        id: "s-1",
        opportunity_id: "opp-open-1",
        person_id: "person-1",
        overall_score: 80,
        model_version: "matching-v1.1",
        scores: { tier: "strong" },
        created_at: "2026-09-08T12:00:00Z",
        source_run_id: null,
      },
    ]

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1, baseOpenOpp2],
      scores,
    })

    const profile = vm.profiles[0]
    // Seul le besoin scoré apparaît dans matches
    expect(profile.matches).toHaveLength(1)
    expect(profile.matches[0].opportunityId).toBe("opp-open-1")
    // Pas de match fantôme à 0 pour opp-open-2
    expect(profile.matches.some((m) => m.opportunityId === "opp-open-2")).toBe(false)
  })

  it("8. calcule correctement la couverture globale et individuelle", () => {
    // 2 besoins ouverts (opp-open-1 et opp-open-2).
    // opp-open-1 est évalué (a un score pour person-1).
    // opp-open-2 n'a AUCUN score pour personne.
    const scores: RawMatchScoreRow[] = [
      {
        id: "s-1",
        opportunity_id: "opp-open-1",
        person_id: "person-1",
        overall_score: 78,
        model_version: "matching-v1.1",
        scores: { tier: "moderate" },
        created_at: "2026-09-08T12:00:00Z",
        source_run_id: null,
      },
    ]

    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [baseCandidate],
      opportunities: [baseOpenOpp1, baseOpenOpp2],
      scores,
    })

    expect(vm.openOpportunityCount).toBe(2)
    expect(vm.evaluatedOpportunityCount).toBe(1)

    // Couverture pour le collaborateur qui a un score
    const collabProfile = vm.profiles.find((p) => p.personId === "person-1")!
    expect(collabProfile.coverage).toEqual({
      openOpportunityCount: 2,
      evaluatedOpportunityCount: 1,
      scoredOpportunityCountForProfile: 1,
    })

    // Couverture pour le candidat sans score
    const candProfile = vm.profiles.find((p) => p.personId === "person-2")!
    expect(candProfile.coverage).toEqual({
      openOpportunityCount: 2,
      evaluatedOpportunityCount: 1,
      scoredOpportunityCountForProfile: 0,
    })
    expect(candProfile.matches).toHaveLength(0)
  })

  it("9. exclut les collaborateurs sortis (C-16)", () => {
    const exitedCollab: RawMatchingCollaborator = {
      ...baseCollab,
      id: "collab-sorti",
      person_id: "person-sorti",
      status: "sorti",
    }

    const vm = buildProfileMatching({
      collaborators: [exitedCollab, baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1],
      scores: [],
    })

    expect(vm.profiles).toHaveLength(1)
    expect(vm.profiles[0].personId).toBe("person-1")
  })

  it("10. exclut les candidats en état terminal de cycle de vie (C-26)", () => {
    const terminalCand: RawMatchingCandidate = {
      ...baseCandidate,
      id: "cand-term",
      person_id: "person-cand-term",
      status: "archive",
    }

    const vm = buildProfileMatching({
      collaborators: [],
      candidates: [terminalCand, baseCandidate],
      opportunities: [baseOpenOpp1],
      scores: [],
    })

    expect(vm.profiles).toHaveLength(1)
    expect(vm.profiles[0].personId).toBe("person-2")
  })

  it("11. gère le cas sans opportunité ouverte", () => {
    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseTerminalOpp],
      scores: [],
    })

    expect(vm.openOpportunityCount).toBe(0)
    expect(vm.evaluatedOpportunityCount).toBe(0)
    expect(vm.profiles[0].matches).toHaveLength(0)
    expect(vm.profiles[0].coverage.openOpportunityCount).toBe(0)
  })

  it("12. gère le cas sans aucun score", () => {
    const vm = buildProfileMatching({
      collaborators: [baseCollab],
      candidates: [],
      opportunities: [baseOpenOpp1, baseOpenOpp2],
      scores: [],
    })

    expect(vm.openOpportunityCount).toBe(2)
    expect(vm.evaluatedOpportunityCount).toBe(0)
    expect(vm.profiles[0].matches).toHaveLength(0)
    expect(vm.profiles[0].coverage.scoredOpportunityCountForProfile).toBe(0)
  })
})
