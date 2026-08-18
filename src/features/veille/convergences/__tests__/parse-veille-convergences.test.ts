import { describe, expect, it } from "vitest"
import {
  parseVeilleArticleConvergences,
  validateVeilleArticleConvergences,
} from "../domain/parse-veille-convergences"
import type { VeilleArticleConvergences } from "../domain/veille-convergences-contracts"

describe("VeilleArticleConvergences - Contrat & Parseur (v1)", () => {
  const sampleValid: VeilleArticleConvergences = {
    schemaVersion: 1,
    synthesis: "Convergence forte identifiée entre la hausse du brut et l'industrie aéronautique.",
    confidence: "high",
    matchedIssues: [
      {
        issueId: "issue-1",
        companyId: "comp-1",
        companyName: "Airbus",
        issueTitle: "Décarbonation des usines",
        rationale: "Augmentation des coûts d'énergie sur les sites de production.",
      },
    ],
    relatedAccounts: [
      {
        companyId: "comp-1",
        companyName: "Airbus",
        rationale: "Compte aéronautique directement concerné.",
      },
    ],
    relatedOpportunities: [],
    playbookSuggestion: {
      sectorId: "sector-aero",
      sectorName: "Aéronautique & Spatial",
      targetSection: "Pistes d'action",
      proposedArgument: "Proposer un audit d'efficience énergétique.",
      rationale: "Alignement direct avec le playbook du secteur.",
    },
    recommendedActions: [
      {
        label: "Contacter le DSI d'Airbus",
        rationale: "Prise de contact rapide sur l'optimisation énergétique.",
      },
    ],
    evidenceRefs: [
      {
        type: "article",
        id: "art-100",
        label: "Article Veille - Transition Aéro",
      },
      {
        type: "company",
        id: "comp-1",
        label: "Fiche Compte Airbus",
      },
    ],
  }

  it("parse avec succès un objet convergences v1 valide", () => {
    const result = validateVeilleArticleConvergences(sampleValid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1)
      expect(result.data.synthesis).toBe(sampleValid.synthesis)
      expect(result.data.confidence).toBe("high")
      expect(result.data.matchedIssues).toHaveLength(1)
      expect(result.data.relatedAccounts).toHaveLength(1)
      expect(result.data.playbookSuggestion?.sectorId).toBe("sector-aero")
      expect(result.data.recommendedActions).toHaveLength(1)
      expect(result.data.evidenceRefs).toHaveLength(2)
    }
  })

  it("retourne null pour les anciens articles sans convergences (null ou undefined)", () => {
    expect(parseVeilleArticleConvergences(null)).toBeNull()
    expect(parseVeilleArticleConvergences(undefined)).toBeNull()

    const validation = validateVeilleArticleConvergences(null)
    expect(validation.success).toBe(false)
    if (!validation.success) {
      expect(validation.error).toContain("absentes")
    }
  })

  it("accepte schemaVersion = 1 et rejette les versions inconnues (ex. 99)", () => {
    const invalidVersion = { ...sampleValid, schemaVersion: 99 }
    const result = validateVeilleArticleConvergences(invalidVersion)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("Version de schéma non supportée")
    }
  })

  it("exige une synthèse (synthesis) non vide", () => {
    const emptySynthesis = { ...sampleValid, synthesis: "  " }
    const result = validateVeilleArticleConvergences(emptySynthesis)
    expect(result.success).toBe(false)
  })

  it("applique strictement la borne MAX_MATCHED_ISSUES = 3", () => {
    const payloadOverBounds = {
      ...sampleValid,
      matchedIssues: [
        { issueId: "i1", companyId: "c1", companyName: "C1", issueTitle: "T1", rationale: "R1" },
        { issueId: "i2", companyId: "c2", companyName: "C2", issueTitle: "T2", rationale: "R2" },
        { issueId: "i3", companyId: "c3", companyName: "C3", issueTitle: "T3", rationale: "R3" },
        { issueId: "i4", companyId: "c4", companyName: "C4", issueTitle: "T4", rationale: "R4" },
        { issueId: "i5", companyId: "c5", companyName: "C5", issueTitle: "T5", rationale: "R5" },
      ],
    }

    const parsed = parseVeilleArticleConvergences(payloadOverBounds)
    expect(parsed).not.toBeNull()
    expect(parsed?.matchedIssues).toHaveLength(3)
    expect(parsed?.matchedIssues.map((i) => i.issueId)).toEqual(["i1", "i2", "i3"])
  })

  it("applique strictement la borne MAX_RELATED_ACCOUNTS = 5", () => {
    const payloadOverBounds = {
      ...sampleValid,
      relatedAccounts: Array.from({ length: 10 }, (_, idx) => ({
        companyId: `comp-${idx}`,
        companyName: `Company ${idx}`,
        rationale: `Rationale ${idx}`,
      })),
    }

    const parsed = parseVeilleArticleConvergences(payloadOverBounds)
    expect(parsed).not.toBeNull()
    expect(parsed?.relatedAccounts).toHaveLength(5)
  })

  it("applique strictement la borne MAX_RECOMMENDED_ACTIONS = 3", () => {
    const payloadOverBounds = {
      ...sampleValid,
      recommendedActions: Array.from({ length: 6 }, (_, idx) => ({
        label: `Action ${idx}`,
        rationale: `Rationale ${idx}`,
      })),
    }

    const parsed = parseVeilleArticleConvergences(payloadOverBounds)
    expect(parsed).not.toBeNull()
    expect(parsed?.recommendedActions).toHaveLength(3)
  })

  it("tolère playbookSuggestion = null", () => {
    const payloadWithoutPlaybook = {
      ...sampleValid,
      playbookSuggestion: null,
    }

    const parsed = parseVeilleArticleConvergences(payloadWithoutPlaybook)
    expect(parsed).not.toBeNull()
    expect(parsed?.playbookSuggestion).toBeNull()
  })

  it("ignore les types d'evidenceRef inconnus", () => {
    const payloadInvalidEvidence = {
      ...sampleValid,
      evidenceRefs: [
        { type: "article" as const, id: "art-1", label: "Art 1" },
        { type: "invalid_type" as unknown as "article", id: "unknown", label: "Unknown" },
      ],
    }

    const parsed = parseVeilleArticleConvergences(payloadInvalidEvidence)
    expect(parsed?.evidenceRefs).toHaveLength(1)
    expect(parsed?.evidenceRefs[0].type).toBe("article")
  })

  describe("schemaVersion 2 — signaux, faits, opportunités", () => {
    const sampleV2: VeilleArticleConvergences = {
      ...sampleValid,
      schemaVersion: 2,
      synthesis: "L'ouverture de l'EURECOM AI Center recoupe directement l'article sur la gouvernance IA.",
      evidenceRefs: [
        { type: "account_fact", id: "fact-strategic-priority-1", label: "EURECOM AI Center" },
        { type: "account_signal", id: "signal-centre-ia-1", label: "Lancement Centre IA" },
      ],
      relatedOpportunities: [
        {
          opportunityId: "opp-1",
          companyId: "comp-eurecom",
          companyName: "EURECOM",
          opportunityTitle: "Audit gouvernance IA",
          stage: "qualification",
          rationale: "Le centre IA en construction a besoin d'un cadrage gouvernance.",
        },
      ],
    }

    it("accepte schemaVersion 2 et parse relatedOpportunities", () => {
      const result = validateVeilleArticleConvergences(sampleV2)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.schemaVersion).toBe(2)
        expect(result.data.relatedOpportunities).toHaveLength(1)
        expect(result.data.relatedOpportunities[0].opportunityId).toBe("opp-1")
      }
    })

    it("accepte les nouveaux types evidenceRef (account_signal, account_fact, opportunity)", () => {
      const parsed = parseVeilleArticleConvergences({
        ...sampleV2,
        evidenceRefs: [
          { type: "account_fact", id: "f1", label: "Fait 1" },
          { type: "account_signal", id: "s1", label: "Signal 1" },
          { type: "opportunity", id: "o1", label: "Opp 1" },
        ],
      })
      expect(parsed?.evidenceRefs).toHaveLength(3)
      expect(parsed?.evidenceRefs.map((r) => r.type)).toEqual([
        "account_fact",
        "account_signal",
        "opportunity",
      ])
    })

    it("applique strictement la borne MAX_RELATED_OPPORTUNITIES = 3", () => {
      const payloadOverBounds = {
        ...sampleV2,
        relatedOpportunities: Array.from({ length: 6 }, (_, idx) => ({
          opportunityId: `opp-${idx}`,
          companyId: "comp-eurecom",
          companyName: "EURECOM",
          opportunityTitle: `Opp ${idx}`,
          stage: "qualification",
          rationale: `R${idx}`,
        })),
      }

      const parsed = parseVeilleArticleConvergences(payloadOverBounds)
      expect(parsed?.relatedOpportunities).toHaveLength(3)
    })

    it("tolère l'absence de relatedOpportunities sur une ligne v1 historique (jamais backfillée)", () => {
      const legacyV1 = { ...sampleValid }
      const legacyV1AsRecord = legacyV1 as unknown as Record<string, unknown>
      delete legacyV1AsRecord.relatedOpportunities

      const parsed = parseVeilleArticleConvergences(legacyV1AsRecord)
      expect(parsed).not.toBeNull()
      expect(parsed?.relatedOpportunities).toEqual([])
      expect(parsed?.schemaVersion).toBe(1)
    })

    it("rejette toujours une version de schéma inconnue (ex. 3)", () => {
      const result = validateVeilleArticleConvergences({ ...sampleV2, schemaVersion: 3 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain("Version de schéma non supportée")
      }
    })
  })
})
