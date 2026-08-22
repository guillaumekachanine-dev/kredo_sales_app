import { describe, expect, it } from "vitest"
import type {
  SectorKnowledgeEventItem,
  SectorKnowledgeRegulatoryItem,
} from "@/features/master-study/data/get-sector-knowledge-read-model"
import {
  buildSectorTimeline,
  extractRegulatoryKey,
} from "./sector-timeline-model"

describe("sector-timeline-model", () => {
  describe("extractRegulatoryKey", () => {
    it("détecte les clés réglementaires explicites", () => {
      expect(extractRegulatoryKey("Règlement UE 2023/1545 — Étiquetage")).toBe("UE 2023/1545")
      expect(extractRegulatoryKey("Échéance UE 2023/1545")).toBe("UE 2023/1545")
      expect(extractRegulatoryKey("IFRA 52e Amendement")).toBe("IFRA 52")
      expect(extractRegulatoryKey("IFRA 51e Amendement")).toBe("IFRA 51")
      expect(extractRegulatoryKey("REACH — Enregistrement")).toBe("REACH")
      expect(extractRegulatoryKey("CSRD — Reporting de durabilité")).toBe("CSRD")
      expect(extractRegulatoryKey("Autre événement quelconque")).toBeNull()
    })
  })

  describe("buildSectorTimeline", () => {
    it("renvoie des tableaux vides si regulatory et events sont vides", () => {
      const timeline = buildSectorTimeline({ regulatory: [], events: [] })
      expect(timeline).toEqual({ datedItems: [], permanentItems: [] })
    })

    it("trie les items datés dans un ordre chronologique strictement ascendant", () => {
      const events: SectorKnowledgeEventItem[] = [
        {
          id: "evt-2026",
          title: "Événement 2026",
          description: "Desc",
          eventType: "investissement",
          eventDate: "2026-06-01",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: "Angle 2026",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "evt-2023",
          title: "Événement 2023",
          description: "Desc",
          eventType: "publication",
          eventDate: "2023-01-01",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: "Angle 2023",
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const timeline = buildSectorTimeline({ regulatory: [], events })
      expect(timeline.datedItems).toHaveLength(2)
      expect(timeline.datedItems[0].date).toBe("2023-01-01")
      expect(timeline.datedItems[1].date).toBe("2026-06-01")
    })

    it("place les réglementations sans date dans permanentItems", () => {
      const regulatory: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-perm",
          name: "Cadre UE applicable aux arômes alimentaires",
          authority: "Commission Européenne",
          description: "Dispositions générales",
          deadlineDate: null,
          urgency: "normal",
          kredoPractice: "data-ai",
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: "https://example.com/aromes",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const timeline = buildSectorTimeline({ regulatory, events: [] })
      expect(timeline.datedItems).toHaveLength(0)
      expect(timeline.permanentItems).toHaveLength(1)
      expect(timeline.permanentItems[0]).toMatchObject({
        id: "reg-perm",
        title: "Cadre UE applicable aux arômes alimentaires",
        date: null,
        kind: "regulatory",
        resolvedLevel: "segment",
        authority: "Commission Européenne",
        practiceKredo: "data-ai",
        sourceUrl: "https://example.com/aromes",
      })
    })

    it("conserve et normalise urgence, provenance, commercialOpportunity, et practice", () => {
      const regulatory: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-1",
          name: "CSRD — Reporting de durabilité",
          authority: "UE",
          description: "Obligations ESG",
          deadlineDate: "2026-01-01",
          urgency: "critical",
          kredoPractice: "data-ai",
          commercialAngle: "Accompagnement bilan carbone",
          isCommercialWindow: true,
          sourceUrl: "https://eur-lex.europa.eu/csrd",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const events: SectorKnowledgeEventItem[] = [
        {
          id: "evt-1",
          title: "PARFEX investit 16 M€",
          description: "Extension usine",
          eventType: "investissement",
          eventDate: "2025-05-15",
          eventStatus: "confirmed",
          sourceUrl: "https://press.parfex.com",
          commercialOpportunity: "Automatisation OT/IT",
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const timeline = buildSectorTimeline({ regulatory, events })
      expect(timeline.datedItems).toHaveLength(2)

      const csrdItem = timeline.datedItems.find((i) => i.id === "reg-1")
      expect(csrdItem).toMatchObject({
        kind: "regulatory",
        urgency: "critical",
        commercialAngle: "Accompagnement bilan carbone",
        resolvedLevel: "segment",
        practiceKredo: "data-ai",
        sourceUrl: "https://eur-lex.europa.eu/csrd",
      })

      const parfexItem = timeline.datedItems.find((i) => i.id === "evt-1")
      expect(parfexItem).toMatchObject({
        kind: "rupture",
        urgency: null,
        commercialAngle: "Automatisation OT/IT",
        resolvedLevel: "macro",
        sourceUrl: "https://press.parfex.com",
      })
    })

    it("traite le cas UE 2023/1545 sans dupliquer naivement 4 cartes et en gardant la publication 2023 et l'échéance 2026", () => {
      const regulatory: SectorKnowledgeRegulatoryItem[] = [
        {
          id: "reg-seg-1545",
          name: "Règlement UE 2023/1545 — information sur les allergènes dans les produits cosmétiques",
          authority: "UE",
          description: "Information allergènes segment",
          deadlineDate: null,
          urgency: "normal",
          kredoPractice: "data-ai",
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "reg-macro-1545",
          name: "Règlement UE 2023/1545 — Étiquetage des allergènes",
          authority: "Commission Européenne",
          description: "Étiquetage étendu des 56 allergènes",
          deadlineDate: "2026-07-31",
          urgency: "critical",
          kredoPractice: "data-ai",
          commercialAngle: "Audit des formules et étiquetage",
          isCommercialWindow: true,
          sourceUrl: "https://eur-lex.europa.eu/1545",
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const events: SectorKnowledgeEventItem[] = [
        {
          id: "evt-pub-1545",
          title: "Publication du règlement UE 2023/1545",
          description: "Entrée en vigueur officielle",
          eventType: "publication",
          eventDate: "2023-01-01",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: null,
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "evt-echeance-1545",
          title: "Échéance Règlement UE 2023/1545 dans moins de 2 mois",
          description: "Deadline d'application obligatoire",
          eventType: "echeance",
          eventDate: "2026-07-31",
          eventStatus: "pending",
          sourceUrl: null,
          commercialOpportunity: "Mise en conformité urgente",
          resolvedLevel: "macro",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const timeline = buildSectorTimeline({ regulatory, events })

      // Aucune carte dupliquée dans permanentItems car reg-seg-1545 a été enrichi dans le jalon 2026
      expect(timeline.permanentItems).toHaveLength(0)

      // Exactement 2 jalons chronologiques pour UE 2023/1545 : Publication (2023) et Échéance (2026)
      expect(timeline.datedItems).toHaveLength(2)

      const pubItem = timeline.datedItems[0]
      expect(pubItem.date).toBe("2023-01-01")
      expect(pubItem.title).toContain("Publication")

      const echeanceItem = timeline.datedItems[1]
      expect(echeanceItem.date).toBe("2026-07-31")
      expect(echeanceItem.kind).toBe("regulatory")
      expect(echeanceItem.urgency).toBe("critical")
      // Vérification que la provenance segment de reg-seg-1545 a enrichi l'item macro 2026
      expect(echeanceItem.resolvedLevel).toBe("segment")
      expect(echeanceItem.commercialAngle).toBe("Audit des formules et étiquetage")
      expect(echeanceItem.sourceUrl).toBe("https://eur-lex.europa.eu/1545")
    })

    it("ne fusionne pas deux événements distincts de même type s'ils n'ont pas la même clé réglementaire", () => {
      const events: SectorKnowledgeEventItem[] = [
        {
          id: "evt-parfex",
          title: "PARFEX investit 16 M€",
          description: "Extension usine",
          eventType: "investissement",
          eventDate: "2025-01-10",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: "OT/IT",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "evt-payan",
          title: "Payan Bertrand investit 12 M€",
          description: "Modernisation Grasse",
          eventType: "investissement",
          eventDate: "2025-01-10",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: "ERP",
          resolvedLevel: "segment",
          createdAt: null,
          updatedAt: null,
        },
      ]

      const timeline = buildSectorTimeline({ regulatory: [], events })
      expect(timeline.datedItems).toHaveLength(2)
      expect(timeline.datedItems[0].title).toBe("PARFEX investit 16 M€")
      expect(timeline.datedItems[1].title).toBe("Payan Bertrand investit 12 M€")
    })
  })
})
