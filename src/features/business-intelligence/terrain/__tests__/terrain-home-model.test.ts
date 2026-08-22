import { describe, expect, it } from "vitest"
import {
  buildTerrainConfidence,
  buildTerrainDailyAngle,
  buildTerrainHomeModel,
  buildTerrainRegulatoryDeadline,
  getParisDayOfYear,
  parseMarketThesesFromPlaybook,
  parseRiskOpportunitiesFromPlaybook,
} from "../terrain-home-model"
import type { SectorCorpusMetadata } from "../../data/get-sector-corpus-metadata"
import type {
  SectorKnowledgeEventItem,
  SectorKnowledgeRegulatoryItem,
} from "@/features/master-study/data/get-sector-knowledge-read-model"

describe("terrain-home-model", () => {
  describe("buildTerrainConfidence", () => {
    it("reports a reliable corpus when production_ready and indicates if updated today", () => {
      const today = new Date("2026-08-22T12:00:00Z")
      const metadataToday: SectorCorpusMetadata = {
        qualityVerdict: "production_ready",
        activationState: "active",
        snapshotDate: "2026-08-22",
        gaps: [],
      }

      const resultToday = buildTerrainConfidence(metadataToday, "2026-08-20", today)
      expect(resultToday).toEqual({
        status: "reliable",
        label: "Corpus fiable",
        detail: "mis à jour aujourd’hui",
        dotVariant: "success",
      })

      const metadataEarlier: SectorCorpusMetadata = {
        qualityVerdict: "production_ready",
        activationState: "active",
        snapshotDate: "2026-08-15",
        gaps: [],
      }
      const resultEarlier = buildTerrainConfidence(metadataEarlier, null, today)
      expect(resultEarlier.status).toBe("reliable")
      expect(resultEarlier.label).toBe("Corpus fiable")
      expect(resultEarlier.detail).toContain("15 août 2026")
      expect(resultEarlier.dotVariant).toBe("success")
    })

    it("reports caveats when usable_with_caveats and mentions gaps count", () => {
      const metadataCaveats: SectorCorpusMetadata = {
        qualityVerdict: "usable_with_caveats",
        activationState: "active",
        snapshotDate: "2026-08-18",
        gaps: [
          { motif: "Manque données PME", famille: "Acteurs" },
          { motif: "Sources partielles", famille: "Tarifs" },
        ],
      }

      const result = buildTerrainConfidence(metadataCaveats, "2026-08-18")
      expect(result).toEqual({
        status: "caveats",
        label: "Corpus sous réserves",
        detail: "2 réserves déclarées",
        dotVariant: "warning",
      })
    })

    it("reports unverified when corpus is rejected", () => {
      const metadataRejected: SectorCorpusMetadata = {
        qualityVerdict: "rejected",
        activationState: "draft",
        snapshotDate: "2026-08-10",
        gaps: [],
      }

      const result = buildTerrainConfidence(metadataRejected)
      expect(result).toEqual({
        status: "unverified",
        label: "Corpus non certifié",
        detail: "données à consolider",
        dotVariant: "danger",
      })
    })

    it("reports unavailable when corpus metadata is absent", () => {
      const resultNoStudy = buildTerrainConfidence(null, null)
      expect(resultNoStudy).toEqual({
        status: "unavailable",
        label: "Corpus non qualifié",
        detail: null,
        dotVariant: "neutral",
      })

      const resultWithStudyDate = buildTerrainConfidence(null, "2026-08-20")
      expect(resultWithStudyDate.status).toBe("unavailable")
      expect(resultWithStudyDate.detail).toContain("20 août 2026")
    })
  })

  describe("buildTerrainRegulatoryDeadline", () => {
    const fixedNow = new Date("2026-08-22T10:00:00Z")

    it("resolves an exact future deadline with countdown and formatted date", () => {
      const items: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-1",
          name: "IFRA 52",
          deadlineDate: "2026-12-31",
          urgency: "high",
          authority: "IFRA",
          description: "Mise en conformité",
          kredoPractice: "Quality",
          commercialAngle: "Anticiper la traçabilité",
          isCommercialWindow: false,
          sourceUrl: "https://ifrafragrance.org",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(items, [], fixedNow)
      expect(result.name).toBe("IFRA 52")
      expect(result.timing.kind).toBe("exact")
      if (result.timing.kind === "exact") {
        expect(result.timing.date).toBe("2026-12-31")
        expect(result.timing.formattedDate).toBe("31 déc. 2026")
        expect(result.timing.daysRemaining).toBe(131)
        expect(result.timing.countdown).toBe("J-131")
      }
      expect(result.urgency).toBe("high")
    })

    it("resolves a window deadline when date is not exact", () => {
      const items: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-window",
          name: "Directive CSRD Transposition",
          deadlineDate: "fin novembre 2026",
          urgency: "medium",
          authority: "UE",
          description: "Publication attendue",
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: true,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(items, [], fixedNow)
      expect(result.name).toBe("Directive CSRD Transposition")
      expect(result.timing).toEqual({
        kind: "window",
        label: "fin novembre 2026",
      })
    })

    it("strictly excludes past dates", () => {
      const items: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "past-1",
          name: "Règlement 2024 échu",
          deadlineDate: "2024-01-01",
          urgency: "high",
          authority: "UE",
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "future-1",
          name: "Norme 2027",
          deadlineDate: "2027-06-30",
          urgency: "normal",
          authority: "AFNOR",
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(items, [], fixedNow)
      expect(result.name).toBe("Norme 2027")
      expect(result.timing.kind).toBe("exact")
      if (result.timing.kind === "exact") {
        expect(result.timing.date).toBe("2027-06-30")
      }
    })

    it("returns unavailable when all dates are past or none provided", () => {
      const pastItems: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "past-1",
          name: "Échéance 2025",
          deadlineDate: "2025-05-01",
          urgency: "high",
          authority: null,
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(pastItems, [], fixedNow)
      expect(result).toEqual({
        name: "Réglementation",
        timing: { kind: "unavailable" },
      })

      const emptyResult = buildTerrainRegulatoryDeadline([], [], fixedNow)
      expect(emptyResult).toEqual({
        name: "Réglementation",
        timing: { kind: "unavailable" },
      })
    })

    it("sorts deterministically by nearest future date, then urgency, then alphabetical name", () => {
      const items: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "item-far",
          name: "Échéance lointaine",
          deadlineDate: "2027-12-31",
          urgency: "high",
          authority: null,
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "item-same-low",
          name: "Beta Urgent",
          deadlineDate: "2026-10-15",
          urgency: "low",
          authority: null,
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "item-same-high",
          name: "Alpha Urgent",
          deadlineDate: "2026-10-15",
          urgency: "high",
          authority: null,
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(items, [], fixedNow)
      expect(result.name).toBe("Alpha Urgent")
      if (result.timing.kind === "exact") {
        expect(result.timing.date).toBe("2026-10-15")
      }
    })

    it("includes event deadlines if closer than regulatory items", () => {
      const regItems: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-1",
          name: "Réglementation 2027",
          deadlineDate: "2027-01-01",
          urgency: "normal",
          authority: null,
          description: null,
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]
      const eventItems: SectorKnowledgeEventItem[] = [
        {
          id: "evt-1",
          title: "Sommet Ingrédients 2026",
          eventDate: "2026-09-15",
          eventType: "salon",
          eventStatus: "confirmed",
          description: "Rencontre annuelle",
          sourceUrl: null,
          commercialOpportunity: "Prospection stand",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const result = buildTerrainRegulatoryDeadline(regItems, eventItems, fixedNow)
      expect(result.name).toBe("Sommet Ingrédients 2026")
      if (result.timing.kind === "exact") {
        expect(result.timing.date).toBe("2026-09-15")
      }
    })
  })

  describe("buildTerrainDailyAngle", () => {
    const playbookSample = {
      market_thesis: [
        {
          id: 1,
          these: "La traçabilité des ingrédients devient un enjeu de mise sur le marché.",
          src_ids: [12],
          donc_commercialement: "Cadrer les flux de preuve.",
        },
        {
          id: 2,
          these: "Les cycles de reformulation raccourcissent sous la pression des normes.",
          src_ids: [31],
        },
      ],
      risks: [
        {
          risque: "Une information réglementaire dispersée ralentit les arbitrages de formulation.",
          opportunite: "Unifier la preuve pour réduire les reprises et sécuriser les délais.",
          src_ids: [12],
        },
      ],
    }

    it("parses market theses and risk opportunities from playbook structure", () => {
      const theses = parseMarketThesesFromPlaybook(playbookSample)
      expect(theses).toHaveLength(2)
      expect(theses[0].text).toBe("La traçabilité des ingrédients devient un enjeu de mise sur le marché.")
      expect(theses[0].sourceIds).toEqual([12])

      const risks = parseRiskOpportunitiesFromPlaybook(playbookSample)
      expect(risks).toHaveLength(1)
      expect(risks[0].risk).toBe("Une information réglementaire dispersée ralentit les arbitrages de formulation.")
      expect(risks[0].opportunity).toBe("Unifier la preuve pour réduire les reprises et sécuriser les délais.")
    })

    it("alters between market thesis and risk opportunity depending on Paris day", () => {
      // 2026-08-22 is day 234 of 2026 (even -> market)
      const evenDay = new Date("2026-08-22T12:00:00Z")
      expect(getParisDayOfYear(evenDay) % 2).toBe(0)
      const marketAngle = buildTerrainDailyAngle(playbookSample, evenDay)
      expect(marketAngle.kind).toBe("market")
      expect(marketAngle.text).toBe("La traçabilité des ingrédients devient un enjeu de mise sur le marché.")

      // 2026-08-23 is day 235 of 2026 (odd -> risk)
      const oddDay = new Date("2026-08-23T12:00:00Z")
      expect(getParisDayOfYear(oddDay) % 2).toBe(1)
      const riskAngle = buildTerrainDailyAngle(playbookSample, oddDay)
      expect(riskAngle.kind).toBe("risk")
      if (riskAngle.kind === "risk") {
        expect(riskAngle.text).toBe("Une information réglementaire dispersée ralentit les arbitrages de formulation.")
        expect(riskAngle.opportunityText).toBe("Unifier la preuve pour réduire les reprises et sécuriser les délais.")
      }
    })

    it("falls back to the other family if preferred is empty", () => {
      const onlyRisksPlaybook = {
        risks: playbookSample.risks,
      }
      const evenDay = new Date("2026-08-22T12:00:00Z")
      const result = buildTerrainDailyAngle(onlyRisksPlaybook, evenDay)
      expect(result.kind).toBe("risk")

      const onlyThesesPlaybook = {
        market_thesis: playbookSample.market_thesis,
      }
      const oddDay = new Date("2026-08-23T12:00:00Z")
      const resultOdd = buildTerrainDailyAngle(onlyThesesPlaybook, oddDay)
      expect(resultOdd.kind).toBe("market")
    })

    it("returns unavailable when playbook has no thesis nor risk", () => {
      const emptyPlaybook = {}
      const result = buildTerrainDailyAngle(emptyPlaybook, new Date("2026-08-22T12:00:00Z"))
      expect(result).toEqual({
        kind: "unavailable",
        title: "Angle indisponible",
        text: "",
        copyText: "",
        sourceIds: [],
      })
    })

    it("ensures copied text is identical to displayed text for both kinds", () => {
      const evenDay = new Date("2026-08-22T12:00:00Z")
      const marketAngle = buildTerrainDailyAngle(playbookSample, evenDay)
      expect(marketAngle.copyText).toBe(marketAngle.text)

      const oddDay = new Date("2026-08-23T12:00:00Z")
      const riskAngle = buildTerrainDailyAngle(playbookSample, oddDay)
      if (riskAngle.kind === "risk") {
        expect(riskAngle.copyText).toBe(
          `RISQUE\n${riskAngle.text}\n\nOPPORTUNITÉ\n${riskAngle.opportunityText}`
        )
      }
    })
  })

  describe("buildTerrainHomeModel", () => {
    it("assembles complete TerrainHomeViewModel from workspace", () => {
      const mockWorkspace = {
        state: "ready" as const,
        segment: {
          id: "seg-1",
          name: "Ingrédients & Arômes",
          slug: "ingredients-aromes",
          status: "active",
          macro: {
            id: "macro-1",
            name: "Chimie & Cosmétique",
            slug: "chimie-cosmetique",
          },
        },
        corpusMetadata: {
          qualityVerdict: "production_ready" as const,
          activationState: "active" as const,
          snapshotDate: "2026-08-22",
          gaps: [],
        },
        knowledge: {
          segmentId: "seg-1",
          segmentName: "Ingrédients & Arômes",
          segmentSlug: "ingredients-aromes",
          segmentStatus: "active",
          macroId: "macro-1",
          macroName: "Chimie & Cosmétique",
          macroSlug: "chimie-cosmetique",
          macroStatus: "active",
          description: "Synthèse",
          descriptionLevel: "segment" as const,
          attractivenessScore: 4.5,
          attractivenessScoreLevel: "segment" as const,
          marketSizeEurBn: 12.5,
          marketSizeEurBnLevel: "segment" as const,
          marketGrowthPct: 5.2,
          marketGrowthPctLevel: "segment" as const,
          playbook: {
            market_thesis: [{ these: "Thèse 1", src_ids: [1] }],
          },
          playbookLevel: "segment" as const,
          practicesFit: null,
          practicesFitLevel: "segment" as const,
          keyPlayersPaca: [],
          keyPlayersNational: [],
          hasSegmentKnowledge: true,
          digitalMaturity: "medium",
          avgTjmMin: 650,
          avgTjmMax: 850,
          caveats: null,
          sourceRunId: null,
          studySnapshotDate: "2026-08-22",
          effectiveStatus: "active",
          items: { painPoints: [], events: [], news: [], regulatory: [] },
          painPoints: [],
          events: [],
          news: [],
          regulatory: [
            {
              id: "reg-1",
              name: "IFRA 52",
              deadlineDate: "2026-12-31",
              urgency: "high",
              authority: "IFRA",
              description: null,
              kredoPractice: null,
              commercialAngle: null,
              isCommercialWindow: false,
              sourceUrl: null,
              resolvedLevel: "segment" as const,
              createdAt: null,
              updatedAt: null,
            },
          ],
        },
        portfolio: {
          totalAccounts: 0,
          priorityAccounts: 0,
          accounts: [],
          scores: { byAccountId: {}, byCompanyId: {} },
        },
        competitiveMap: null,
        valueChain: null,
        news: { items: [], updatedAt: null },
        coverage: {
          study: { available: true, level: "segment" as const, updatedAt: null },
          playbook: { available: true, level: "segment" as const, updatedAt: null },
          competitiveMap: { available: false, level: null, updatedAt: null },
          valueChain: { available: false, level: null, updatedAt: null },
          regulatory: { available: true, level: "segment" as const, updatedAt: null },
          news: { available: false, level: null, updatedAt: null },
        },
        sourceResolution: {},
      }

      const model = buildTerrainHomeModel(mockWorkspace as never, new Date("2026-08-22T12:00:00Z"))
      expect(model.segmentId).toBe("seg-1")
      expect(model.segmentName).toBe("Ingrédients & Arômes")
      expect(model.macroName).toBe("Chimie & Cosmétique")
      expect(model.confidence.status).toBe("reliable")
      expect(model.regulatory.name).toBe("IFRA 52")
      expect(model.dailyAngle.kind).toBe("market")
      expect(model.dailyAngle.text).toBe("Thèse 1")
    })
  })
})
