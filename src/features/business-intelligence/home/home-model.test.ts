import { describe, expect, it } from "vitest"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import { buildSegmentHomeKpis, parseCadre, parseMarketThesis, parseMessageSectoriel, parseTrajectoires, provenanceLabel } from "./home-model"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

describe("Business Intelligence segment home model", () => {
  it("n’expose que les indicateurs réellement présents", () => {
    const workspace = {
      portfolio: { accounts: [{ id: "a" }, { id: "b" }] },
      knowledge: {
        marketSizeEurBn: 12.5,
        marketSizeEurBnLevel: "macro",
        marketGrowthPct: null,
        marketGrowthPctLevel: "segment",
        attractivenessScore: 72,
        attractivenessScoreLevel: "estimated",
        avgTjmMin: null,
        avgTjmMax: null,
        digitalMaturity: null,
      },
    } as unknown as LoadedWorkspace

    expect(buildSegmentHomeKpis(workspace)).toEqual([
      { label: "Comptes portefeuille", value: "2", level: null },
      { label: "Marché", value: "12,5 Md€", level: "macro" },
      { label: "Attractivité", value: "72", level: "estimated" },
    ])
  })

  it("distingue origine et résolution", () => {
    expect(provenanceLabel("segment")).toBe("Segment")
    expect(provenanceLabel("macro")).toBe("Macro")
    expect(provenanceLabel("locked")).toBe("Verrouillé")
    expect(provenanceLabel("estimated")).toBe("Estimé")
  })

  it("parse le cadre d'analyse sectorielle (périmètre, hors champ, comparabilité)", () => {
    const playbook = {
      cadre: {
        perimetre: "Création et vente B2B de compositions",
        hors_champ: ["Marques de produits finis", "Retail"],
        regle_comparabilite: "Aucun chiffre groupe monde",
      },
    }
    expect(parseCadre(playbook)).toEqual({
      perimetre: "Création et vente B2B de compositions",
      horsChamp: ["Marques de produits finis", "Retail"],
      regleComparabilite: "Aucun chiffre groupe monde",
    })
    expect(parseCadre(null)).toBeNull()
    expect(parseCadre({})).toBeNull()
  })

  it("parse le message sectoriel synthétique", () => {
    const playbook = { message_sectoriel: "Votre fenêtre n'est pas faire de l'IA" }
    expect(parseMessageSectoriel(playbook)).toBe("Votre fenêtre n'est pas faire de l'IA")
    expect(parseMessageSectoriel(null)).toBeNull()
    expect(parseMessageSectoriel({})).toBeNull()
  })

  it("parse les 5 thèses de marché avec sources et callout DONC", () => {
    const playbook = {
      market_thesis: [
        {
          id: 1,
          these: "La valeur commerciale vient de la complexité",
          src_ids: [7, 13],
          donc_commercialement: "DONC, commercialement : ouvrir sur la maîtrise matière",
        },
      ],
    }
    expect(parseMarketThesis(playbook)).toEqual([
      {
        id: 1,
        these: "La valeur commerciale vient de la complexité",
        srcIds: [7, 13],
        doncCommercialement: "DONC, commercialement : ouvrir sur la maîtrise matière",
      },
    ])
    expect(parseMarketThesis(null)).toEqual([])
  })

  it("parse les trajectoires et budgets 18-36 mois", () => {
    const playbook = {
      trajectoires: [
        {
          trajectoire: "Conformité IFRA 52",
          famille_budget: "Data & Réglementaire",
          offre_kredo: "Data AI Strategy",
          src_ids: [6],
        },
      ],
    }
    expect(parseTrajectoires(playbook)).toEqual([
      {
        trajectoire: "Conformité IFRA 52",
        familleBudget: "Data & Réglementaire",
        offreKredo: "Data AI Strategy",
        srcIds: [6],
      },
    ])
    expect(parseTrajectoires(null)).toEqual([])
  })
})
