import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import type { SegmentNewsLibrary } from "../data/business-intelligence-workspace-types"
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
  attractivenessScore: 82,
  attractivenessScoreLevel: "segment",
  marketSizeEurBn: 1.4,
  marketSizeEurBnLevel: "estimated",
  marketGrowthPct: 5.2,
  marketGrowthPctLevel: "macro",
  playbook: null,
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
  digitalMaturity: "medium",
  avgTjmMin: 650,
  avgTjmMax: 950,
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
        }),
      )

      expect(markup).toContain("Parfumerie B2B")
      expect(markup).toContain("Chimie &amp; Cosmétique")
      expect(markup).toContain("Taille de marché")
      expect(markup).toContain("1,4 Md€")
      expect(markup).toContain("Estimé") // Provenance "estimated"
      expect(markup).toContain("Pression sur les allergènes et traçabilité IFRA 51")
      expect(markup).toContain("Freq. 8")
      expect(markup).toContain("Robertet")
      expect(markup).toContain("Mane")
      expect(markup).toContain("Givaudan France")
      expect(markup).toContain("IFRA Annual Report 2025")
    })

    it("rend le composant Mobile dédié avec accordéons et touch targets", () => {
      const markup = renderToStaticMarkup(
        createElement(SectorAnalysisChapterMobile, {
          knowledge: mockKnowledge,
          segmentName: "Parfumerie B2B",
          macroName: "Chimie & Cosmétique",
        }),
      )

      expect(markup).toContain("Parfumerie B2B")
      expect(markup).toContain("Points de douleur (1)")
      expect(markup).toContain("Événements &amp; Jalons (1)")
      expect(markup).toContain("Acteurs clés (3)")
      expect(markup).toContain("Sources méthodologiques")
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
      expect(markup).not.toContain("Points de douleur &amp; Enjeux métiers")
      expect(markup).not.toContain("Événements majeurs &amp; Jalons du secteur")
      expect(markup).not.toContain("Écosystème &amp; Acteurs clés")
      expect(markup).not.toContain("Sources &amp; Réserves méthodologiques")
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

      expect(markup).toContain("Calendrier réglementaire")
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
