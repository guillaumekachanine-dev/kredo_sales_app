import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { TerrainSourceTrigger, TerrainSourceTriggerList } from "../TerrainSourceTrigger"
import { TerrainSourceSheet } from "../TerrainSourceSheet"
import { TerrainStoriesMobile } from "../TerrainStoriesMobile"
import { TerrainEssentialsMobile } from "../TerrainEssentialsMobile"
import { buildTerrainStories } from "../terrain-stories-model"
import { buildTerrainEssentials } from "../terrain-essentials-model"
import type { ResolvedSource } from "../../shared/SourceChip"

describe("Terrain Source UI Components & Integration (M6)", () => {
  const mockResolution: Record<number, ResolvedSource> = {
    7: {
      srcId: 7,
      publisher: "AFISO",
      tier: 1,
      attests: "Dynamique réglementaire IFRA 52 et gouvernance formulation",
      consultedAt: "2026-08-15",
      url: "https://afiso.fr/statuts",
    },
    13: {
      srcId: 13,
      publisher: "Cosmetics Europe",
      tier: 2,
      attests: "Rapport économique et structuration de la filière",
      consultedAt: null,
      url: null,
    },
  }

  describe("TerrainSourceTrigger & TerrainSourceTriggerList", () => {
    it("renders trigger chip with accessible label containing publisher name", () => {
      const html = renderToString(
        createElement(TerrainSourceTrigger, {
          sourceId: 7,
          sourceResolution: mockResolution,
          onClick: () => {},
        }),
      )

      expect(html).toContain("S7")
      expect(html).toContain('aria-label="Source S7 : AFISO"')
      expect(html).toContain("type=\"button\"")
    })

    it("renders fallback label for unresolved source ID", () => {
      const html = renderToString(
        createElement(TerrainSourceTrigger, {
          sourceId: 99,
          sourceResolution: mockResolution,
          onClick: () => {},
        }),
      )

      expect(html).toContain("S99")
      expect(html).toContain('aria-label="Source S99 non résolue"')
    })

    it("renders a list of source triggers with header label", () => {
      const html = renderToString(
        createElement(TerrainSourceTriggerList, {
          sourceIds: [7, 13],
          sourceResolution: mockResolution,
          onSelectSource: () => {},
        }),
      )

      expect(html).toContain("Sources :")
      expect(html).toContain("S7")
      expect(html).toContain("S13")
    })
  })

  describe("TerrainSourceSheet", () => {
    it("renders complete resolved source details with publisher, tier, attests, date and CTA URL", () => {
      const html = renderToString(
        createElement(TerrainSourceSheet, {
          sourceId: 7,
          sourceResolution: mockResolution,
          open: true,
          onClose: () => {},
        }),
      )

      expect(html).toContain("Source S7")
      expect(html).toContain("AFISO")
      expect(html).toContain("Tier T1")
      expect(html).toContain("Dynamique réglementaire IFRA 52")
      expect(html).toContain("15 août 2026")
      // Strict CTA wording requirement
      expect(html).toContain("Ouvrir le site de l’éditeur")
      expect(html).toContain('href="https://afiso.fr/statuts"')
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noreferrer"')
    })

    it("renders source without URL: publisher, attests, and date are shown but NO CTA button is rendered", () => {
      const html = renderToString(
        createElement(TerrainSourceSheet, {
          sourceId: 13,
          sourceResolution: mockResolution,
          open: true,
          onClose: () => {},
        }),
      )

      expect(html).toContain("Source S13")
      expect(html).toContain("Cosmetics Europe")
      expect(html).toContain("Tier T2")
      expect(html).toContain("Date de consultation non disponible")
      // Strict requirement: No CTA, no empty footer button
      expect(html).not.toContain("Ouvrir le site de l’éditeur")
      expect(html).not.toContain("Voir la preuve")
      expect(html).not.toContain("Lire l’article")
    })

    it("renders explicit unresolved source warning when source ID is not in dictionary", () => {
      const html = renderToString(
        createElement(TerrainSourceSheet, {
          sourceId: 99,
          sourceResolution: mockResolution,
          open: true,
          onClose: () => {},
        }),
      )

      expect(html).toContain("Source S99")
      expect(html).toContain("Informations source indisponibles")
      expect(html).toContain("est référencée dans le contenu mais n’est pas résolue")
      expect(html).not.toContain("Ouvrir le site de l’éditeur")
    })
  })

  describe("TerrainStoriesMobile Source Integration", () => {
    const stories = buildTerrainStories({
      message_sectoriel: "Message général",
      market_thesis: [
        {
          id: 1,
          these: "Première thèse avec sources",
          src_ids: [7, 13],
          donc_commercialement: "Donc commercialement",
        },
      ],
    })

    it("renders interactive source triggers on thesis story replacing passive text", () => {
      const html = renderToString(
        createElement(TerrainStoriesMobile, {
          stories,
          sourceResolution: mockResolution,
          initialIndex: 1,
          onBack: () => {},
        }),
      )

      expect(html).toContain("Sources :")
      expect(html).toContain("S7")
      expect(html).toContain("S13")
      expect(html).toContain('aria-label="Source S7 : AFISO"')
      expect(html).toContain('aria-label="Source S13 : Cosmetics Europe"')
      // Passive string is replaced by interactive triggers
      expect(html).not.toContain("Sources : S7 · S13")
    })

    it("does not render source triggers on message sectoriel story", () => {
      const html = renderToString(
        createElement(TerrainStoriesMobile, {
          stories,
          sourceResolution: mockResolution,
          initialIndex: 0,
          onBack: () => {},
        }),
      )

      expect(html).toContain("Message sectoriel")
      expect(html).not.toContain("Sources :")
    })
  })

  describe("TerrainEssentialsMobile Source Integration", () => {
    const mockWs = {
      state: "ready",
      valueChain: null,
      knowledge: {
        playbook: {
          dependances_critiques: [
            {
              nom: "Matières synthétiques uniques",
              criticite: "haute",
              risque: "Rupture approvisionnement",
              src_ids: [7],
            },
          ],
        },
      },
    }
    const model = buildTerrainEssentials(mockWs as never)!

    it("renders interactive source triggers on critical dependency in Essentiel", () => {
      const html = renderToString(
        createElement(TerrainEssentialsMobile, {
          model,
          sourceResolution: mockResolution,
          onBack: () => {},
        }),
      )

      expect(html).toContain("Matières synthétiques uniques")
      expect(html).toContain("HAUTE")
      expect(html).toContain("Sources :")
      expect(html).toContain("S7")
      expect(html).toContain('aria-label="Source S7 : AFISO"')
    })
  })
})
