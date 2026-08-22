import { describe, expect, it } from "vitest"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import {
  buildSectorMarketKpis,
  formatAttractiveness,
  formatDigitalMaturity,
  formatMarketGrowth,
  formatMarketSize,
  formatNumber,
  formatPracticeName,
  formatTjmRange,
  parseCaveats,
  parseCriticalDependencies,
  parseEconomicModels,
  parseKeyPlayers,
  parseRiskOpportunities,
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

  describe("formatPracticeName", () => {
    it("formate proprement les slugs de practices connus", () => {
      expect(formatPracticeName("data-ai")).toBe("Data & AI")
      expect(formatPracticeName("quality-engineering-testing")).toBe("Quality Engineering & Testing")
      expect(formatPracticeName("cybersecurity")).toBe("Cybersecurity")
      expect(formatPracticeName("digital-business-solutions")).toBe("Digital Business Solutions")
      expect(formatPracticeName("project-agile-delivery")).toBe("Project & Agile Delivery")
      expect(formatPracticeName("cloud-engineering")).toBe("Cloud Engineering")
      expect(formatPracticeName("digital-experience")).toBe("Digital Experience")
      expect(formatPracticeName("legacy-systems-mainframe")).toBe("Legacy Systems & Mainframe")
    })

    it("gère défensivement les slugs inconnus ou absents", () => {
      expect(formatPracticeName("unknown-practice")).toBe("unknown-practice")
      expect(formatPracticeName(null)).toBeNull()
      expect(formatPracticeName(undefined)).toBeNull()
    })
  })

  describe("parseCriticalDependencies", () => {
    it("lit correctement les 6 dépendances du pilote en conservant l'ordre source et toutes les propriétés", () => {
      const playbook = {
        dependances_critiques: [
          {
            nom: "Disponibilité et variabilité des matières naturelles",
            criticite: "haute",
            situation: "Les ingrédients naturels imposent qualification, traçabilité, qualité et capacité de substitution.",
            risque: "Rupture ou variation matière provoquant reformulation, requalification et impact client.",
            prestation_ouverte: "Construire la traçabilité matière–fournisseur–lot–formule, les alertes d'impact et les workflows de second sourcing.",
            practice_kredo: "data-ai",
            src_ids: [20, 21, 23],
            donc_commercialement: "DONC, commercialement : partir du temps nécessaire pour identifier toutes les formules et clients impactés par une matière indisponible."
          },
          {
            nom: "Évolution des règles IFRA/REACH et exigences de conformité",
            criticite: "haute",
            situation: "Le portefeuille de formules doit absorber des évolutions de règles.",
            risque: "Screening lent, erreurs de propagation.",
            prestation_ouverte: "Data governance réglementaire, moteur de règles.",
            practice_kredo: "data-ai",
            src_ids: [5, 6, 13],
            donc_commercialement: "DONC, commercialement : IFRA 52 est l'ouverture."
          },
          {
            nom: "Montée en cadence des nouveaux sites et équipements",
            criticite: "haute",
            situation: "Des investissements récents à Grasse.",
            risque: "Interfaces fragiles.",
            prestation_ouverte: "Tests de performance et résilience.",
            practice_kredo: "quality-engineering-testing",
            src_ids: [18, 19, 25],
            donc_commercialement: "DONC, commercialement : vendre la fiabilité."
          },
          {
            nom: "Propriété intellectuelle et accès aux formules",
            criticite: "haute",
            situation: "La formule est un actif métier sensible.",
            risque: "Exposition d'informations propriétaires.",
            prestation_ouverte: "Architecture de sécurité, IAM/PAM.",
            practice_kredo: "cybersecurity",
            src_ids: [22, 23],
            donc_commercialement: "DONC, commercialement : rattacher la cybersécurité."
          },
          {
            nom: "Fragmentation laboratoire–qualité–ERP–client",
            criticite: "moyenne",
            situation: "Le cycle métier traverse plusieurs fonctions.",
            risque: "Temps de cycle, erreurs de version.",
            prestation_ouverte: "Architecture d'API, intégration applicative.",
            practice_kredo: "digital-business-solutions",
            src_ids: [10, 12, 22],
            donc_commercialement: "DONC, commercialement : identifier un flux."
          },
          {
            nom: "Dépendance aux standards et plateformes d'un groupe de contrôle",
            criticite: "moyenne",
            situation: "Dans une filiale, achats, data, cyber.",
            risque: "Proposition commerciale hors périmètre local.",
            prestation_ouverte: "Rollout, intégration, migration ciblée.",
            practice_kredo: "project-agile-delivery",
            src_ids: [10, 21, 22, 23],
            donc_commercialement: "DONC, commercialement : la première qualification."
          }
        ]
      }

      const deps = parseCriticalDependencies(playbook)
      expect(deps).toHaveLength(6)

      // Ordre source conservé
      expect(deps[0].nom).toBe("Disponibilité et variabilité des matières naturelles")
      expect(deps[1].nom).toBe("Évolution des règles IFRA/REACH et exigences de conformité")
      expect(deps[2].nom).toBe("Montée en cadence des nouveaux sites et équipements")
      expect(deps[3].nom).toBe("Propriété intellectuelle et accès aux formules")
      expect(deps[4].nom).toBe("Fragmentation laboratoire–qualité–ERP–client")
      expect(deps[5].nom).toBe("Dépendance aux standards et plateformes d'un groupe de contrôle")

      // Criticités
      expect(deps[0].criticite).toBe("haute")
      expect(deps[1].criticite).toBe("haute")
      expect(deps[2].criticite).toBe("haute")
      expect(deps[3].criticite).toBe("haute")
      expect(deps[4].criticite).toBe("moyenne")
      expect(deps[5].criticite).toBe("moyenne")

      // Détails du 1er item
      expect(deps[0]).toEqual({
        nom: "Disponibilité et variabilité des matières naturelles",
        criticite: "haute",
        situation: "Les ingrédients naturels imposent qualification, traçabilité, qualité et capacité de substitution.",
        risque: "Rupture ou variation matière provoquant reformulation, requalification et impact client.",
        prestationOuverte: "Construire la traçabilité matière–fournisseur–lot–formule, les alertes d'impact et les workflows de second sourcing.",
        practiceKredo: "data-ai",
        doncCommercialement: "DONC, commercialement : partir du temps nécessaire pour identifier toutes les formules et clients impactés par une matière indisponible.",
        srcIds: [20, 21, 23]
      })
    })

    it("gère défensivement une criticité inconnue, des src_ids invalides et ignore les entrées invalides", () => {
      const playbook = {
        dependances_critiques: [
          "entree_invalide",
          null,
          { nom: "  " },
          {
            nom: "Dépendance avec criticité inconnue",
            criticite: "extreme",
            situation: "  ",
            risque: null,
            practiceKredo: "data-ai",
            prestationOuverte: "Conseil",
            src_ids: [1, "12", -4, "invalide", null]
          }
        ]
      }

      const deps = parseCriticalDependencies(playbook)
      expect(deps).toHaveLength(1)
      expect(deps[0]).toEqual({
        nom: "Dépendance avec criticité inconnue",
        criticite: null,
        situation: null,
        risque: null,
        practiceKredo: "data-ai",
        prestationOuverte: "Conseil",
        doncCommercialement: null,
        srcIds: [1, 12]
      })
    })

    it("renvoie un tableau vide si dependances_critiques est absent ou invalide", () => {
      expect(parseCriticalDependencies(null)).toEqual([])
      expect(parseCriticalDependencies({})).toEqual([])
      expect(parseCriticalDependencies({ dependances_critiques: "invalid" })).toEqual([])
    })
  })

  describe("parseRiskOpportunities", () => {
    it("lit correctement les 7 paires risque/opportunité du pilote en conservant l'ordre source", () => {
      const playbook = {
        risks: [
          {
            risque: "Changement réglementaire impossible à propager rapidement",
            opportunite: "Data model réglementaire, moteur de règles, impact analysis",
            src_ids: [5, 6, 13]
          },
          {
            risque: "Montée en cadence d'un site automatisé avec interfaces OT/IT",
            opportunite: "Tests de performance/résilience, observabilité",
            src_ids: [18, 19, 25]
          },
          {
            risque: "POC IA de formulation non industrialisable",
            opportunite: "Industrialisation IA/MLOps adossée à data governance",
            src_ids: [22, 23]
          },
          {
            risque: "Substitution d'une matière ou changement fournisseur",
            opportunite: "Data platform, lineage et workflows fournisseurs",
            src_ids: [20, 21, 23]
          },
          {
            risque: "Proposition IT locale incompatible avec les plateformes",
            opportunite: "Intégration, rollout, change et coordination programme",
            src_ids: [10, 21, 22, 23]
          },
          {
            risque: "Patrimoine formulation exposé lors de l'ouverture",
            opportunite: "IAM/PAM, sécurité des architectures et DevSecOps",
            src_ids: [22, 23]
          },
          {
            risque: "Fragmentation des données entre laboratoire, qualité, achats",
            opportunite: "Intégration API, applications métier B2B",
            src_ids: [10, 12, 22]
          }
        ]
      }

      const pairs = parseRiskOpportunities(playbook)
      expect(pairs).toHaveLength(7)
      expect(pairs[0]).toEqual({
        risk: "Changement réglementaire impossible à propager rapidement",
        opportunity: "Data model réglementaire, moteur de règles, impact analysis",
        srcIds: [5, 6, 13]
      })
      expect(pairs[6]).toEqual({
        risk: "Fragmentation des données entre laboratoire, qualité, achats",
        opportunity: "Intégration API, applications métier B2B",
        srcIds: [10, 12, 22]
      })
    })

    it("gère défensivement les aliases camelCase et filtre les entrées invalides", () => {
      const playbook = {
        risks: [
          "invalide",
          null,
          { risque: "   " },
          {
            risk: "Risque CamelCase",
            opportunity: "Opportunité CamelCase",
            srcIds: [1, "invalid", 10]
          }
        ]
      }

      const pairs = parseRiskOpportunities(playbook)
      expect(pairs).toHaveLength(1)
      expect(pairs[0]).toEqual({
        risk: "Risque CamelCase",
        opportunity: "Opportunité CamelCase",
        srcIds: [1, 10]
      })
    })

    it("renvoie un tableau vide si risks est absent ou nul", () => {
      expect(parseRiskOpportunities(null)).toEqual([])
      expect(parseRiskOpportunities({})).toEqual([])
      expect(parseRiskOpportunities({ risks: "invalid" })).toEqual([])
    })
  })
})
