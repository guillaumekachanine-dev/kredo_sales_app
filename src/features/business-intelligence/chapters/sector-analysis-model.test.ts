import { describe, expect, it } from "vitest"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import {
  buildSectorMarketKpis,
  formatAttractiveness,
  formatDigitalMaturity,
  formatMarketGrowth,
  formatMarketSize,
  formatNumber,
  formatTjmRange,
  parseCaveats,
  parseEconomicModels,
  parseKeyPlayers,
  parseTechFronts,
} from "./sector-analysis-model"

describe("sector-analysis-model", () => {
  describe("formatAttractiveness", () => {
    it("affiche le score sur une échelle / 5 et jamais / 100", () => {
      expect(formatAttractiveness(4.8)).toBe("4,8 / 5")
      expect(formatAttractiveness(3)).toBe("3 / 5")
      expect(formatAttractiveness(null)).toBeNull()
    })
  })

  describe("formatDigitalMaturity", () => {
    it("traduit les valeurs techniques en libellés utilisateurs", () => {
      expect(formatDigitalMaturity("low")).toBe("Faible")
      expect(formatDigitalMaturity("LOW")).toBe("Faible")
      expect(formatDigitalMaturity("medium")).toBe("Intermédiaire")
      expect(formatDigitalMaturity("high")).toBe("Élevée")
      expect(formatDigitalMaturity(null)).toBeNull()
      expect(formatDigitalMaturity("")).toBeNull()
      expect(formatDigitalMaturity("custom_state")).toBe("custom_state")
    })
  })

  describe("formatMarketSize", () => {
    it("formate la taille en Md€ ou indique Non publiée si locked", () => {
      expect(formatMarketSize(2.4, "estimated")).toEqual({ value: "2,4 Md€" })
      expect(formatMarketSize(null, "locked")).toEqual({ value: "Non publiée", isLocked: true })
      expect(formatMarketSize(null, "segment")).toBeNull()
    })
  })

  describe("formatMarketGrowth", () => {
    it("formate la croissance en % ou indique Non publiée si locked", () => {
      expect(formatMarketGrowth(4.5, "segment")).toEqual({ value: "4,5 %" })
      expect(formatMarketGrowth(null, "locked")).toEqual({ value: "Non publiée", isLocked: true })
      expect(formatMarketGrowth(null, "segment")).toBeNull()
    })
  })

  describe("formatTjmRange", () => {
    it("formate la fourchette lorsque les deux bornes sont présentes", () => {
      expect(formatTjmRange(750, 1100)).toBe(`750–${formatNumber(1100)} €`)
      expect(formatTjmRange(750, null)).toBeNull()
      expect(formatTjmRange(null, 1100)).toBeNull()
      expect(formatTjmRange(null, null)).toBeNull()
    })
  })

  describe("parseKeyPlayers", () => {
    it("parse les objets avec name/note/size et alias nom/description/taille", () => {
      const raw = [
        { name: "Payan Bertrand", note: "Modernisation Grasse", size: "ETI" },
        { nom: "Robertet", description: "Leader naturel", taille: "Grand groupe" },
        "SFA NEROLI",
        { invalid: true },
        null,
      ]
      expect(parseKeyPlayers(raw)).toEqual([
        { name: "Payan Bertrand", note: "Modernisation Grasse", size: "ETI" },
        { name: "Robertet", note: "Leader naturel", size: "Grand groupe" },
        { name: "SFA NEROLI", note: "", size: "" },
      ])
    })

    it("renvoie un tableau vide pour des entrées invalides ou nulles", () => {
      expect(parseKeyPlayers(null)).toEqual([])
      expect(parseKeyPlayers({})).toEqual([])
      expect(parseKeyPlayers("not-an-array")).toEqual([])
      expect(parseKeyPlayers([])).toEqual([])
    })
  })

  describe("parseCaveats", () => {
    it("parse les réserves méthodologiques et sources", () => {
      const raw = {
        corpus: "Corpus 28 sources E3",
        sources: ["IFRA", "PRODAROM"],
      }
      expect(parseCaveats(raw)).toEqual({
        corpus: "Corpus 28 sources E3",
        sources: ["IFRA", "PRODAROM"],
        verbatims: undefined,
        frequences: undefined,
        marche: undefined,
      })
      expect(parseCaveats(null)).toBeNull()
      expect(parseCaveats({})).toBeNull()
    })
  })

  describe("buildSectorMarketKpis", () => {
    it("construit la liste des indicateurs conformes au cadrage Lot 3", () => {
      const knowledge: SectorKnowledgeReadModel = {
        segmentId: "seg-1",
        segmentName: "Compositions & ingrédients B2B",
        segmentSlug: "seg-parfumerie-compositions-b2b",
        segmentStatus: "active",
        macroId: "macro-1",
        macroName: "Parfumerie, Arômes & Cosmétique",
        macroSlug: "parfumerie-aromes",
        macroStatus: "active",
        description: "Marché pertinent",
        descriptionLevel: "segment",
        attractivenessScore: 4.8,
        attractivenessScoreLevel: "macro",
        marketSizeEurBn: 2.4,
        marketSizeEurBnLevel: "estimated",
        marketGrowthPct: null,
        marketGrowthPctLevel: "locked",
        playbook: null,
        playbookLevel: "segment",
        practicesFit: null,
        practicesFitLevel: "segment",
        keyPlayersPaca: [],
        keyPlayersNational: [],
        hasSegmentKnowledge: true,
        digitalMaturity: "low",
        avgTjmMin: 750,
        avgTjmMax: 1100,
        caveats: null,
        sourceRunId: "run-1",
        studySnapshotDate: "2026-08-14",
        effectiveStatus: "active",
        items: { painPoints: [], events: [], news: [], regulatory: [] },
        painPoints: [],
        events: [],
        news: [],
        regulatory: [],
      }

      const kpis = buildSectorMarketKpis(knowledge)
      expect(kpis).toEqual([
        { label: "Taille de marché", value: "2,4 Md€", level: "estimated", isLocked: undefined },
        { label: "Croissance annuelle", value: "Non publiée", level: null, isLocked: true },
        { label: "Score d’attractivité", value: "4,8 / 5", level: "macro" },
        { label: "Maturité numérique", value: "Faible", level: null },
        { label: "TJM de référence", value: `750–${formatNumber(1100)} €`, level: null },
      ])
    })

    it("ne fabrique pas de valeurs inventées si les champs sont absents", () => {
      const emptyKnowledge = {
        marketSizeEurBn: null,
        marketSizeEurBnLevel: "segment",
        marketGrowthPct: null,
        marketGrowthPctLevel: "segment",
        attractivenessScore: null,
        attractivenessScoreLevel: "macro",
        digitalMaturity: null,
        avgTjmMin: null,
        avgTjmMax: null,
      } as unknown as SectorKnowledgeReadModel

      expect(buildSectorMarketKpis(emptyKnowledge)).toEqual([])
    })
  })

  describe("parseEconomicModels", () => {
    it("sépare correctement les 4 blocs clients et 5 modèles économiques du pilote", () => {
      const playbook = {
        economic_models: [
          {
            nom: "Marques de parfumerie et cosmétique",
            type: "bloc_client",
            qui_finance: "Budgets de lancement",
            cycle_budgetaire: "Cadencé par les briefs",
            src_ids: [7, 8, 22]
          },
          {
            nom: "Industriels hygiène-entretien et biens de consommation",
            type: "bloc_client",
            qui_finance: "Budgets R&D",
            cycle_budgetaire: "Arbitrages de rénovation",
            src_ids: [7, 20, 21]
          },
          {
            nom: "Composition sur brief et co-développement",
            type: "modele_economique",
            description: "Création d'une formule",
            qui_signe: "Direction achats",
            quand_le_budget_est_engage: "Au lancement du brief",
            implication_achat_prestation: "Prestations SI autour du time-to-brief",
            donc_commercialement: "Partir du cycle brief",
            src_ids: [7, 22, 23]
          },
          {
            nom: "Fourniture récurrente de compositions industrialisées",
            type: "modele_economique",
            description: "Approvisionnement récurrent",
            qui_signe: "Achats industriels",
            quand_le_budget_est_engage: "Lors du référencement",
            implication_achat_prestation: "Prévision et qualité",
            donc_commercialement: "Chercher les ruptures",
            src_ids: [20, 21, 22]
          }
        ]
      }

      const { clientBlocks, economicModels } = parseEconomicModels(playbook)

      expect(clientBlocks).toHaveLength(2)
      expect(clientBlocks[0]).toEqual({
        nom: "Marques de parfumerie et cosmétique",
        type: "bloc_client",
        quiFinance: "Budgets de lancement",
        cycleBudgetaire: "Cadencé par les briefs",
        srcIds: [7, 8, 22]
      })
      expect(clientBlocks[1].nom).toBe("Industriels hygiène-entretien et biens de consommation")

      expect(economicModels).toHaveLength(2)
      expect(economicModels[0]).toEqual({
        nom: "Composition sur brief et co-développement",
        type: "modele_economique",
        description: "Création d'une formule",
        quiSigne: "Direction achats",
        quandLeBudgetEstEngage: "Au lancement du brief",
        implicationAchatPrestation: "Prestations SI autour du time-to-brief",
        doncCommercialement: "Partir du cycle brief",
        srcIds: [7, 22, 23]
      })
    })

    it("ignore les types inconnus, les entrées non objets et filtre les src_ids invalides", () => {
      const playbook = {
        economic_models: [
          "invalide",
          null,
          { type: "inconnu", nom: "Test" },
          {
            nom: "Bloc Valide",
            type: "bloc_client",
            qui_finance: "Finance",
            cycle_budgetaire: "Annuel",
            src_ids: [1, "invalid", -5, 10, null]
          }
        ]
      }

      const { clientBlocks, economicModels } = parseEconomicModels(playbook)

      expect(clientBlocks).toEqual([
        {
          nom: "Bloc Valide",
          type: "bloc_client",
          quiFinance: "Finance",
          cycleBudgetaire: "Annuel",
          srcIds: [1, 10]
        }
      ])
      expect(economicModels).toEqual([])
    })

    it("renvoie des tableaux vides si economic_models est absent ou invalide", () => {
      expect(parseEconomicModels(null)).toEqual({ clientBlocks: [], economicModels: [] })
      expect(parseEconomicModels({})).toEqual({ clientBlocks: [], economicModels: [] })
      expect(parseEconomicModels({ economic_models: "not-an-array" })).toEqual({ clientBlocks: [], economicModels: [] })
    })
  })

  describe("parseTechFronts", () => {
    it("lit correctement les 5 fronts du pilote en conservant leur ordre et données", () => {
      const playbook = {
        tech_fronts: [
          {
            nom: "Référentiel réglementaire et formula impact",
            etat: "Transition active : le besoin n'est plus seulement de stocker...",
            zone_de_transition: true,
            src_ids: [5, 6, 13],
            donc_commercialement: "DONC, commercialement : IFRA 52..."
          },
          {
            nom: "Automatisation industrielle et continuité OT/IT",
            etat: "Transition visible dans le bassin de Grasse...",
            zone_de_transition: true,
            src_ids: [18, 19, 25],
            donc_commercialement: "DONC, commercialement : cibler les sites..."
          },
          {
            nom: "IA assistée pour formulation et création",
            etat: "Les leaders publient des usages IA et data avancés...",
            zone_de_transition: true,
            src_ids: [22, 23],
            donc_commercialement: "DONC, commercialement : positionner MLOps..."
          },
          {
            nom: "Data supply chain et traçabilité fournisseur",
            etat: "Les grands groupes structurent sourcing...",
            zone_de_transition: true,
            src_ids: [20, 21, 22, 23],
            donc_commercialement: "DONC, commercialement : vendre la réduction..."
          },
          {
            nom: "Plateformes groupe, intégration et rollout local",
            etat: "Les grands groupes exposent des plateformes...",
            zone_de_transition: true,
            src_ids: [10, 12, 21, 22, 23],
            donc_commercialement: "DONC, commercialement : sur une filiale..."
          }
        ]
      }

      const fronts = parseTechFronts(playbook)
      expect(fronts).toHaveLength(5)
      expect(fronts[0]).toEqual({
        nom: "Référentiel réglementaire et formula impact",
        etat: "Transition active : le besoin n'est plus seulement de stocker...",
        zoneDeTransition: true,
        doncCommercialement: "DONC, commercialement : IFRA 52...",
        srcIds: [5, 6, 13]
      })
      expect(fronts[1].nom).toBe("Automatisation industrielle et continuité OT/IT")
      expect(fronts[2].nom).toBe("IA assistée pour formulation et création")
      expect(fronts[3].nom).toBe("Data supply chain et traçabilité fournisseur")
      expect(fronts[4].nom).toBe("Plateformes groupe, intégration et rollout local")
    })

    it("normalise zone_de_transition absente en false et nettoie les src_ids invalides", () => {
      const playbook = {
        tech_fronts: [
          {
            nom: "Front Sans Transition",
            etat: null,
            src_ids: [1, "5", -3, "invalid"],
          },
          {
            name: "Front Avec CamelCase",
            zoneDeTransition: true,
            doncCommercialement: "Conclusion",
            src_ids: []
          }
        ]
      }

      const fronts = parseTechFronts(playbook)
      expect(fronts).toHaveLength(2)
      expect(fronts[0]).toEqual({
        nom: "Front Sans Transition",
        etat: null,
        zoneDeTransition: false,
        doncCommercialement: null,
        srcIds: [1, 5]
      })
      expect(fronts[1]).toEqual({
        nom: "Front Avec CamelCase",
        etat: null,
        zoneDeTransition: true,
        doncCommercialement: "Conclusion",
        srcIds: []
      })
    })

    it("ignore les entrées non objets et sans nom", () => {
      const playbook = {
        tech_fronts: [
          "string_entry",
          null,
          { nom: "   " },
          { name: "" },
          { nom: "Front Valide" }
        ]
      }

      const fronts = parseTechFronts(playbook)
      expect(fronts).toHaveLength(1)
      expect(fronts[0].nom).toBe("Front Valide")
    })

    it("renvoie un tableau vide si tech_fronts est absent ou invalide", () => {
      expect(parseTechFronts(null)).toEqual([])
      expect(parseTechFronts({})).toEqual([])
      expect(parseTechFronts({ tech_fronts: "not-an-array" })).toEqual([])
    })
  })

})
