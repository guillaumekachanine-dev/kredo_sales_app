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
  parseKeyPlayers,
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
})
