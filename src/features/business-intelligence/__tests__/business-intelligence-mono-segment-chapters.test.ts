import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { SectorCorpusMetadata } from "../data/get-sector-corpus-metadata"
import type { SegmentNewsLibrary, SegmentValueChainReadModel } from "../data/business-intelligence-workspace-types"
import type { CompetitiveMapSnapshot } from "@/features/competitive-map/data/competitive-map-workspace-types"

const mockCompetitiveMap: CompetitiveMapSnapshot = {
  segmentId: "seg-1",
  segmentLabel: "Parfumerie B2B",
  snapshotDate: "2026-08-15",
  actors: [
    {
      id: "act-1",
      companyId: "comp-1",
      name: "Robertet",
      category: "leader",
      categoryLabel: "Leader",
      confidence: "haute",
      businessFootprintScore: 4.5,
      digitalMaturityScore: 3,
      appetenceScore: 28,
      accessibilityScore: 4,
      appetenceProvisoire: true,
      isPositioned: true,
      isBenchmarkAccount: true,
      revenueEstimateMeur: 720,
      revenueExercice: 2025,
      revenuePerimetre: "Consolidé",
      headcountFrance: "1200",
      positioning: "Leader des ingrédients naturels",
      forces: "Sourcing mondial",
      vulnerability: "Dépendance récoltes",
      angleEntree: "Digitalisation LIMS & traçabilité RSE",
      details: {
        propositionValeur: "Bases naturelles haute pureté",
        differenciateurs: ["Extractions CO2 supercritique"],
        dependances: [],
        chaineValeur: [],
        chantiersTechnologiques: [],
        triggers: ["Nouveau laboratoire R&D"],
        lignesRouges: ["Ne pas proposer de régie simple"],
        trous: [],
        metierChaineValeur: null,
        maillon: null,
        contratsMajeurs: [],
        grilles: [],
        coucheEsn: ["Auditer la maturité IA"],
        traductionCommerciale: ["TJM cible 950€"],
        iaAnnonceVsDeploye: null,
      },
    },
    {
      id: "act-2",
      companyId: "comp-2",
      name: "Mane",
      category: "challenger",
      categoryLabel: "Challenger",
      confidence: "moyenne",
      businessFootprintScore: 3,
      digitalMaturityScore: 4,
      appetenceScore: 24,
      accessibilityScore: null,
      appetenceProvisoire: false,
      isPositioned: false,
      isBenchmarkAccount: false,
      revenueEstimateMeur: null,
      revenueExercice: null,
      revenuePerimetre: null,
      headcountFrance: null,
      positioning: null,
      forces: null,
      vulnerability: null,
      angleEntree: "IA générative pour formulation",
      details: {
        propositionValeur: null,
        differenciateurs: [],
        dependances: [],
        chaineValeur: [],
        chantiersTechnologiques: [],
        triggers: [],
        lignesRouges: [],
        trous: [],
        metierChaineValeur: null,
        maillon: null,
        contratsMajeurs: [],
        grilles: [],
        coucheEsn: [],
        traductionCommerciale: [],
        iaAnnonceVsDeploye: null,
      },
    },
  ],
}

const mockValueChain: SegmentValueChainReadModel = {
  sourceSectorId: "seg-1",
  level: "segment",
  updatedAt: "2026-08-15T12:00:00Z",
  catalog: {
    state: "ready",
    sectors: [{ id: "seg-1", slug: "parfumerie-b2b", name: "Parfumerie B2B" }],
    accounts: [],
    generatedAt: "2026-08-15T12:00:00Z",
    maps: [
      {
        sector: { id: "seg-1", slug: "parfumerie-b2b", name: "Parfumerie B2B", defaultActivityId: "node-1" },
        stages: [
          { id: "seg-1:stage:1", label: "Amont & ressources", order: 1 },
          { id: "seg-1:stage:2", label: "Transformation", order: 2 },
        ],
        activities: [
          { id: "node-1", stageId: "seg-1:stage:1", label: "Sourcing et qualification des matières", order: 1 },
          { id: "node-2", stageId: "seg-1:stage:2", label: "Transformation et préparation des ingrédients", order: 1 },
        ],
        entities: [],
        placements: [],
        relationships: [],
        ecosystemLayers: [],
        metrics: [],
        evidence: [
          { id: "node:node-1", label: "Analyse", excerpt: "Sélection des matières de haute pureté" },
          { id: "node:node-2", label: "Analyse", excerpt: "Extraction et préparation" },
        ],
      },
    ],
  },
}

import { SectorAnalysisChapterDesktop } from "../chapters/SectorAnalysisChapterDesktop"
import { SectorAnalysisChapterMobile } from "../chapters/SectorAnalysisChapterMobile"
import { RegulatoryCalendarChapterDesktop } from "../chapters/RegulatoryCalendarChapterDesktop"
import { RegulatoryCalendarChapterMobile } from "../chapters/RegulatoryCalendarChapterMobile"
import { SectorNewsChapterDesktop, SectorNewsChapterMobile } from "../chapters/SectorNewsChapter"

const read = (path: string) => readFileSync(path, "utf8")

const mockKnowledge: SectorKnowledgeReadModel = {
  segmentId: "seg-1",
  segmentName: "Parfumerie B2B",
  segmentSlug: "parfumerie-b2b",
  segmentStatus: "active",
  macroId: "macro-1",
  macroName: "Chimie & Cosmétique",
  macroSlug: "chimie-cosmetique",
  macroStatus: "active",
  description: "Marché mondial des compositions parfumées en forte transformation réglementaire et RSE.",
  descriptionLevel: "segment",
  attractivenessScore: 4.8,
  attractivenessScoreLevel: "macro",
  marketSizeEurBn: 1.4,
  marketSizeEurBnLevel: "estimated",
  marketGrowthPct: 5.2,
  marketGrowthPctLevel: "macro",
  playbook: {
    economic_models: [
      {
        nom: "Marques de parfumerie et cosmétique",
        type: "bloc_client",
        qui_finance: "Budgets de lancement produit",
        cycle_budgetaire: "Cadencé par les briefs annuels",
        src_ids: [7, 8, 22]
      },
      {
        nom: "Composition sur brief et co-développement",
        type: "modele_economique",
        description: "Création d'une formule répondant à un brief olfactif",
        qui_signe: "Direction achats / category management",
        quand_le_budget_est_engage: "Au lancement du brief",
        implication_achat_prestation: "Prestations SI autour du time-to-brief",
        donc_commercialement: "Partir du cycle brief et mesurer les ressaisies",
        src_ids: [7, 22, 23]
      }
    ],
    tech_fronts: [
      {
        nom: "Référentiel réglementaire et formula impact",
        etat: "Transition active : le besoin n'est plus seulement de stocker des formules",
        zone_de_transition: true,
        src_ids: [5, 6, 13],
        donc_commercialement: "DONC, commercialement : IFRA 52 doit ouvrir un chantier"
      }
    ],
    dependances_critiques: [
      {
        nom: "Disponibilité et variabilité des matières naturelles",
        criticite: "haute",
        situation: "Les ingrédients naturels imposent qualification et traçabilité.",
        risque: "Rupture ou variation matière provoquant reformulation.",
        prestation_ouverte: "Construire la traçabilité matière–fournisseur–lot–formule.",
        practice_kredo: "data-ai",
        src_ids: [20, 21, 23],
        donc_commercialement: "DONC, commercialement : partir du temps nécessaire pour identifier toutes les formules."
      }
    ],
    risks: [
      {
        risque: "Changement réglementaire impossible à propager rapidement",
        opportunite: "Data model réglementaire, moteur de règles, impact analysis",
        src_ids: [5, 6, 13]
      }
    ]
  },

  playbookLevel: "segment",
  practicesFit: null,
  practicesFitLevel: "segment",
  keyPlayersPaca: [
    { name: "Robertet", note: "Leader naturel Grasse", size: "ETI" },
    { name: "Mane", note: "Groupe familial mondial", size: "Grand groupe" },
  ],
  keyPlayersNational: [
    { name: "Givaudan France", note: "Filiale française", size: "Multinationale" },
  ],
  hasSegmentKnowledge: true,
  digitalMaturity: "low",
  avgTjmMin: 750,
  avgTjmMax: 1100,
  caveats: {
    corpus: "12 entretiens qualitatifs et données IFRA 2025.",
    sources: ["IFRA Annual Report 2025", "Proscent Database"],
  },
  sourceRunId: "run-abc-123",
  studySnapshotDate: "2026-08-15",
  effectiveStatus: "active",
  items: { painPoints: [], events: [], news: [], regulatory: [] },
  painPoints: [
    {
      id: "pp-1",
      title: "Pression sur les allergènes et traçabilité IFRA 51",
      description: "Nécessité de reformuler les bases avec traçabilité automatisée.",
      frequencyCount: 8,
      kredoPractice: "Quality & Regulatory",
      verbatim: "Chaque révision IFRA nous prend 3 mois de tests manuels.",
      sourceCompanyIds: [],
      resolvedLevel: "segment",
    },
  ],
  events: [
    {
      id: "evt-1",
      title: "Congrès Mondial de la Parfumerie (WPC) 2026",
      description: "Salon international annuel.",
      eventType: "Salon / Événement",
      eventDate: "2026-06-20",
      eventStatus: "confirmed",
      sourceUrl: "https://example.com/wpc",
      commercialOpportunity: "Prospection directe des directeurs techniques.",
      resolvedLevel: "segment",
      createdAt: null,
      updatedAt: null,
    },
  ],
  news: [],
  regulatory: [
    {
      id: "reg-1",
      name: "Amendement IFRA 51 — Entrée en vigueur obligatoire",
      authority: "IFRA",
      description: "Plafond d'exposition réduit pour 12 molécules clés.",
      deadlineDate: "2026-10-01",
      urgency: "haute",
      kredoPractice: "Compliance & Lab",
      commercialAngle: "Offre d'audit de reformulation et automatisation LIMS.",
      isCommercialWindow: true,
      sourceUrl: "https://ifrafragrance.org",
      resolvedLevel: "segment",
      createdAt: null,
      updatedAt: null,
    },
  ],
}

const mockCorpusMetadata: SectorCorpusMetadata = {
  qualityVerdict: "usable_with_caveats",
  activationState: "active",
  snapshotDate: "2026-08-14",
  gaps: [
    { famille: "TAM", motif: "Aucune source n'isole le segment propre." },
  ],
}

const mockNews: SegmentNewsLibrary = {
  updatedAt: "2026-08-20T10:00:00Z",
  items: [
    {
      id: "news-1",
      title: "Rapport IFRA 2026 : croissance verte du secteur",
      summary: "Les ingrédients biosourcés progressent de 14% en volume.",
      source: "IFRA Insights",
      url: "https://example.com/news-1",
      publishedAt: "2026-08-10T08:00:00Z",
      relevanceScore: 0.9,
      type: "news",
      level: "segment",
      companyId: null,
      urgencyScore: null,
      recommendedAction: null,
    },
    {
      id: "sig-1",
      title: "Robertet investit 15 M€ dans son site de Grasse",
      summary: "Extension de capacité d'extraction CO2 supercritique.",
      source: "Presse Régionale",
      url: "https://example.com/sig-1",
      publishedAt: "2026-08-18T12:00:00Z",
      relevanceScore: 0.95,
      type: "signal",
      level: "segment",
      companyId: "comp-robertet",
      urgencyScore: 85,
      recommendedAction: "Contacter le Directeur Industriel pour l'ingénierie process.",
    },
  ],
}

describe("Lot 3 : Chapitres Business Intelligence mono-segment", () => {
  describe("1. Analyse sectorielle (sector-analysis)", () => {
    it("rend le chapitre Desktop complet avec métriques, synthèse, pain points et provenances", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          corpusMetadata: mockCorpusMetadata,
        }),
      )

      expect(markup).toContain("Parfumerie B2B")
      expect(markup).toContain("Chimie &amp; Cosmétique")
      expect(markup).toContain("Taille de marché")
      expect(markup).toContain("1,4 Md€")
      expect(markup).toContain("Estimé") // Provenance "estimated"
      expect(markup).toContain("4,8 / 5") // Attractivité sur 5
      expect(markup).not.toContain("4,8 / 100")
      expect(markup).toContain("Faible") // digitalMaturity low -> Faible
      expect(markup).toContain("750")
      expect(markup).toContain("100 €")
      expect(markup).toContain("Ancrage Régional — PACA / Grasse")
      expect(markup).toContain("Acteurs Nationaux &amp; Internationaux")
      expect(markup).toContain("Robertet")
      expect(markup).toContain("Mane")
      expect(markup).toContain("Givaudan France")
      expect(markup).toContain("Pression sur les allergènes et traçabilité IFRA 51")
      expect(markup).toContain("8 occurrences")
      expect(markup).toContain("Pain points sectoriels")
      expect(markup).toContain("IFRA Annual Report 2025")
      expect(markup).toContain("Snapshot du") // CorpusConfidenceBanner
      expect(markup).toContain("Blocs clients &amp; cycles d’achat")
      expect(markup).toContain("Marques de parfumerie et cosmétique")
      expect(markup).toContain("Modèles économiques")
      expect(markup).toContain("Composition sur brief et co-développement")
      expect(markup).toContain("Fronts technologiques")
      expect(markup).toContain("Référentiel réglementaire et formula impact")
      expect(markup).toContain("Zone de transition")
      expect(markup).toContain("Dépendances critiques &amp; Supply chain")
      expect(markup).toContain("Disponibilité et variabilité des matières naturelles")
      expect(markup).toContain("Criticité haute")
      expect(markup).toContain("Prestation ESN ouverte")
      expect(markup).toContain("Data &amp; AI")
      expect(markup).toContain("Donc, commercialement")
      expect(markup).toContain("Risques × opportunités")
      expect(markup).toContain("Changement réglementaire impossible à propager rapidement")
      expect(markup).toContain("Data model réglementaire, moteur de règles, impact analysis")
    })


    it("rend la section Chaîne de valeur synthétique du Lot 6 sur Desktop lorsqu'un valueChain est fourni", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          valueChain: mockValueChain,
          onOpenValueChain: () => {},
        }),
      )

      expect(markup).toContain("Chaîne de valeur — vue synthétique")
      expect(markup).toContain("Sourcing et qualification des matières")
      expect(markup).toContain("Transformation et préparation des ingrédients")
      expect(markup).toContain("Amont &amp; ressources")
      expect(markup).toContain("Sélection des matières de haute pureté")
      expect(markup).toContain("Explorer la chaîne de valeur")
    })

    it("rend le composant Mobile dédié avec accordéons, touch targets et métriques", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterMobile, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          corpusMetadata: mockCorpusMetadata,
        }),
      )

      expect(markup).toContain("Parfumerie B2B")
      expect(markup).toContain("1,4 Md€")
      expect(markup).toContain("4,8 / 5")
      expect(markup).not.toContain("4,8/100")
      expect(markup).toContain("Faible")
      expect(markup).toContain("Écosystème &amp; Acteurs clés (3)")
      expect(markup).toContain("Ancrage Régional (PACA)")
      expect(markup).toContain("Acteurs Nationaux &amp; Internationaux")
      expect(markup).toContain("Pain points sectoriels (1)")
      expect(markup).toContain("Réglementation &amp; ruptures (2)")
      expect(markup).toContain("Risques × opportunités (1)")
      expect(markup).toContain("Sources méthodologiques")
      expect(markup).toContain("Blocs clients (1)")
      expect(markup).toContain("Marques de parfumerie et cosmétique")
      expect(markup).toContain("Modèles économiques (1)")
      expect(markup).toContain("Composition sur brief et co-développement")
      expect(markup).toContain("Fronts technologiques (1)")
      expect(markup).toContain("Référentiel réglementaire et formula impact")
      expect(markup).toContain("Dépendances critiques &amp; Supply chain (1)")
      expect(markup).toContain("Disponibilité et variabilité des matières naturelles")
      expect(markup).toContain("Criticité haute")
      expect(markup).toContain("Data &amp; AI")
      expect(markup).toContain("Donc, commercialement")
    })

    it("rend la section Pain points sectoriels du Lot 11 triée par fréquence avec CTA Playbook et provenances", () => {
      const multiPainPointsKnowledge: SectorKnowledgeReadModel = {
        ...mockKnowledge,
        painPoints: [
          {
            id: "pp-1",
            title: "Screening réglementaire manuel",
            description: "Analyse manuelle complexe.",
            frequencyCount: 6,
            kredoPractice: "data_ai",
            verbatim: "Chaque ingrédient vérifié manuellement.",
            sourceCompanyIds: [],
            resolvedLevel: "macro",
          },
          {
            id: "pp-2",
            title: "Chantiers data / analytics",
            description: null,
            frequencyCount: 3,
            kredoPractice: null,
            verbatim: null,
            sourceCompanyIds: [],
            resolvedLevel: "segment",
          },
        ],
      }

      const markupDesktop = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: multiPainPointsKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          onOpenPlaybook: () => {},
        }),
      )

      expect(markupDesktop).toContain("Pain points sectoriels")
      expect(markupDesktop).toContain("Screening réglementaire manuel")
      expect(markupDesktop).toContain("6 occurrences")
      expect(markupDesktop).toContain("Macro")
      expect(markupDesktop).toContain("Data &amp; AI")
      expect(markupDesktop).toContain("« Chaque ingrédient vérifié manuellement. »")
      expect(markupDesktop).toContain("Chantiers data / analytics")
      expect(markupDesktop).toContain("3 occurrences")
      expect(markupDesktop).toContain("Segment")
      expect(markupDesktop).toContain("Ouvrir le Playbook")

      const markupMobile = renderToStaticMarkup(
        createElement(SectorAnalysisChapterMobile, {
          knowledge: multiPainPointsKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          onOpenPlaybook: () => {},
        }),
      )

      expect(markupMobile).toContain("Pain points sectoriels (2)")
      expect(markupMobile).toContain("Screening réglementaire manuel")
      expect(markupMobile).toContain("6 occurrences")
      expect(markupMobile).toContain("Macro")
      expect(markupMobile).toContain("Approfondir les enjeux commerciaux — Ouvrir le Playbook")
    })

    it("rend la section Chaîne de valeur synthétique du Lot 6 sur Mobile lorsqu'un valueChain est fourni", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterMobile, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          valueChain: mockValueChain,
          onOpenValueChain: () => {},
        }),
      )

      expect(markup).toContain("Chaîne de valeur (2 étapes)")
      expect(markup).toContain("Sourcing et qualification des matières")
      expect(markup).toContain("Transformation et préparation des ingrédients")
      expect(markup).toContain("Explorer la chaîne de valeur")
    })

    it("affiche explicitement 'Non publiée' pour les métriques verrouillées", () => {
      const lockedKnowledge: SectorKnowledgeReadModel = {
        ...mockKnowledge,
        marketGrowthPct: null,
        marketGrowthPctLevel: "locked",
      }

      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: lockedKnowledge,
          segmentName: "Segment Verrouillé",
          macroName: "Macro",
        }),
      )

      expect(markup).toContain("Croissance annuelle")
      expect(markup).toContain("Non publiée")
      expect(markup).not.toContain("0 %")
    })

    it("omet proprement les sections lorsque les données sont absentes", () => {
      const emptyKnowledge: SectorKnowledgeReadModel = {
        ...mockKnowledge,
        description: null,
        marketSizeEurBn: null,
        marketGrowthPct: null,
        attractivenessScore: null,
        digitalMaturity: null,
        avgTjmMin: null,
        avgTjmMax: null,
        painPoints: [],
        events: [],
        keyPlayersPaca: [],
        keyPlayersNational: [],
        caveats: null,
      }

      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: emptyKnowledge,
          segmentName: "Segment Vide",
          macroName: "Macro",
        }),
      )

      expect(markup).toContain("Segment Vide")
      expect(markup).not.toContain("Pain points sectoriels")
      expect(markup).not.toContain("Événements majeurs &amp; Jalons du secteur")
      expect(markup).not.toContain("Écosystème &amp; Acteurs clés")
      expect(markup).not.toContain("Sources &amp; Réserves méthodologiques")
    })

    it("rend le tableau comparatif des comptes du Lot 4 sur Desktop lorsqu’un competitiveMap est fourni", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterDesktop, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          competitiveMap: mockCompetitiveMap,
        }),
      )

      expect(markup).toContain("Comptes du segment — comparaison commerciale")
      expect(markup).toContain("Robertet")
      expect(markup).toContain("Mane")
      expect(markup).toContain("★ Étalon")
      expect(markup).toContain("4.5/5")
      expect(markup).toContain("3/5")
      expect(markup).toContain("28/35")
      expect(markup).toContain("Provisoire")
      expect(markup).toContain("Digitalisation LIMS &amp; traçabilité RSE")
    })

    it("rend la section comptes dédiée Mobile du Lot 4 avec cibles tactiles et tri appétence", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterMobile, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
          competitiveMap: mockCompetitiveMap,
        }),
      )

      expect(markup).toContain("Comptes du segment (2)")
      expect(markup).toContain("Robertet")
      expect(markup).toContain("Mane")
      expect(markup).toContain("28/35")
      expect(markup).toContain("Prov.")
    })

  })

  describe("2. Environnement concurrentiel (competitive-environment)", () => {
    it("ne contient aucun sélecteur local de segment dans la toolbar ni dans la vue mobile", () => {
      const toolbar = read("src/features/competitive-map/components/CompetitiveMapToolbar.tsx")
      const mobile = read("src/features/competitive-map/components/mobile/CompetitiveEnvironmentMobile.tsx")
      const workspace = read("src/features/competitive-map/components/CompetitiveEnvironmentWorkspace.tsx")

      expect(toolbar).not.toContain("<select")
      expect(toolbar).not.toContain("onSelectSegment")
      expect(mobile).not.toContain("<select")
      expect(mobile).not.toContain("handleSelectSegment")
      expect(workspace).not.toContain("handleSelectSegment")
    })
  })

  describe("3. Calendrier réglementaire (regulatory-calendar)", () => {
    it("affiche uniquement les textes réglementaires et synchronise la sélection", () => {
      const markup = renderToStaticMarkup(
        createElement(RegulatoryCalendarChapterDesktop, {
          regulatory: mockKnowledge.regulatory,
          segmentName: "Parfumerie B2B",
        }),
      )

      expect(markup).toContain("Calendrier réglementaire")
      expect(markup).toContain("Amendement IFRA 51 — Entrée en vigueur obligatoire")
      expect(markup).toContain("01 oct. 2026")
      expect(markup).toContain("Urgence haute")
      expect(markup).toContain("Compliance &amp; Lab")
      expect(markup).toContain("Offre d&#x27;audit de reformulation et automatisation LIMS.")
      expect(markup).toContain("https://ifrafragrance.org")
    })

    it("fournit une liste verticale claire sur Mobile", () => {
      const markup = renderToStaticMarkup(
        createElement(RegulatoryCalendarChapterMobile, {
          regulatory: mockKnowledge.regulatory,
          segmentName: "Parfumerie B2B",
        }),
      )

      expect(markup).not.toContain("Calendrier réglementaire")
      expect(markup).toContain("Amendement IFRA 51 — Entrée en vigueur obligatoire")
      expect(markup).toContain("Urgent")
      expect(markup).toContain("IFRA")
    })
  })

  describe("4. Chaîne de valeur (value-chain)", () => {
    it("verrouille le sélecteur de secteur et conserve le mode compte", () => {
      const selector = read("src/features/sector-mapping/integration/SectorMapContextSelector.tsx")
      expect(selector).toContain("catalog.sectors.length <= 1")
      expect(selector).toContain("Chaîne de valeur")
    })
  })

  describe("5. Actualités sectorielles (sector-news)", () => {
    it("affiche les actualités et les signaux d'affaires avec leurs filtres", () => {
      const markupDesktop = renderToStaticMarkup(
        createElement(SectorNewsChapterDesktop, {
          news: mockNews,
        }),
      )

      expect(markupDesktop).toContain("Actualités sectorielles")
      expect(markupDesktop).toContain("Rapport IFRA 2026 : croissance verte du secteur")
      expect(markupDesktop).toContain("Robertet investit 15 M€ dans son site de Grasse")
      expect(markupDesktop).toContain("Signal d’affaires")
      expect(markupDesktop).toContain("U. 85")
      expect(markupDesktop).toContain("Contacter le Directeur Industriel pour l&#x27;ingénierie process.")

      const markupMobile = renderToStaticMarkup(
        createElement(SectorNewsChapterMobile, {
          news: mockNews,
        }),
      )

      expect(markupMobile).toContain("Actualités &amp; Signaux")
      expect(markupMobile).toContain("Rapport IFRA 2026 : croissance verte du secteur")
      expect(markupMobile).toContain("Robertet investit 15 M€ dans son site de Grasse")
    })
  })
})
