import { describe, expect, it } from "vitest"
import { buildSectorValueChainSummary } from "./sector-value-chain-summary"
import type { SegmentValueChainReadModel } from "../data/business-intelligence-workspace-types"

describe("buildSectorValueChainSummary", () => {
  it("returns null when valueChain is null or catalog state is not ready", () => {
    expect(buildSectorValueChainSummary(null)).toBeNull()
    expect(buildSectorValueChainSummary(undefined)).toBeNull()

    const unreadyValueChain: SegmentValueChainReadModel = {
      sourceSectorId: "sec-1",
      level: "segment",
      updatedAt: "2026-08-22",
      catalog: {
        state: "empty",
        maps: [],
        sectors: [],
        accounts: [],
        generatedAt: "2026-08-22",
      },
    }
    expect(buildSectorValueChainSummary(unreadyValueChain)).toBeNull()
  })

  it("extracts ordered steps, labels, descriptions and level correctly from catalog maps", () => {
    const mockValueChain: SegmentValueChainReadModel = {
      sourceSectorId: "sec-pilot",
      level: "segment",
      updatedAt: "2026-08-22T10:00:00Z",
      catalog: {
        state: "ready",
        sectors: [{ id: "sec-pilot", slug: "seg-parfumerie-compositions-b2b", name: "Compositions B2B" }],
        accounts: [],
        generatedAt: "2026-08-22T10:00:00Z",
        maps: [
          {
            sector: {
              id: "sec-pilot",
              slug: "seg-parfumerie-compositions-b2b",
              name: "Compositions B2B",
              defaultActivityId: "node-1",
            },
            stages: [
              { id: "sec-pilot:stage:1", label: "Amont & ressources", order: 1 },
              { id: "sec-pilot:stage:2", label: "Transformation", order: 2 },
            ],
            activities: [
              {
                id: "node-2",
                stageId: "sec-pilot:stage:2",
                label: "Transformation et préparation des ingrédients",
                order: 1,
              },
              {
                id: "node-1",
                stageId: "sec-pilot:stage:1",
                label: "Sourcing et qualification des matières",
                order: 1,
              },
            ],
            entities: [],
            placements: [],
            relationships: [],
            ecosystemLayers: [],
            metrics: [],
            evidence: [
              {
                id: "node:node-1",
                label: "Analyse · Sourcing",
                excerpt: "Sélection rigoureuse des fournisseurs naturels et synthétiques",
              },
              {
                id: "node:node-2",
                label: "Analyse · Transformation",
                excerpt: "Extraction, distillation et contrôle de pureté",
              },
            ],
          },
        ],
      },
    }

    const summary = buildSectorValueChainSummary(mockValueChain)
    expect(summary).not.toBeNull()
    expect(summary?.level).toBe("segment")
    expect(summary?.updatedAt).toBe("2026-08-22T10:00:00Z")
    expect(summary?.steps).toHaveLength(2)

    expect(summary?.steps[0]).toEqual({
      id: "node-1",
      order: 1,
      stageLabel: "Amont & ressources",
      activityLabel: "Sourcing et qualification des matières",
      description: "Sélection rigoureuse des fournisseurs naturels et synthétiques",
    })

    expect(summary?.steps[1]).toEqual({
      id: "node-2",
      order: 2,
      stageLabel: "Transformation",
      activityLabel: "Transformation et préparation des ingrédients",
      description: "Extraction, distillation et contrôle de pureté",
    })
  })

  it("handles missing description cleanly without inventing content", () => {
    const mockValueChain: SegmentValueChainReadModel = {
      sourceSectorId: "sec-pilot",
      level: "macro",
      updatedAt: null,
      catalog: {
        state: "ready",
        sectors: [],
        accounts: [],
        generatedAt: "2026-08-22",
        maps: [
          {
            sector: { id: "sec-pilot", slug: "sec-pilot", name: "Pilot", defaultActivityId: "node-1" },
            stages: [{ id: "sec-pilot:stage:1", label: "Stage 1", order: 1 }],
            activities: [
              { id: "node-1", stageId: "sec-pilot:stage:1", label: "Étape sans desc", order: 1 },
            ],
            entities: [],
            placements: [],
            relationships: [],
            ecosystemLayers: [],
            metrics: [],
            evidence: [],
          },
        ],
      },
    }

    const summary = buildSectorValueChainSummary(mockValueChain)
    expect(summary).not.toBeNull()
    expect(summary?.level).toBe("macro")
    expect(summary?.steps[0].description).toBeNull()
  })
})
