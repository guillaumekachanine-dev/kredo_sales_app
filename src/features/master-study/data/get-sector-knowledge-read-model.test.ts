import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import {
  getSectorKnowledgeReadModel,
  getSectorKnowledgeReadModels,
} from "./get-sector-knowledge-read-model"

describe("getSectorKnowledgeReadModel — garde anti-lecture-directe (§6)", () => {
  it("ne lit jamais les tables brutes, uniquement les vues résolues", () => {
    const sourceCode = readFileSync(
      join(process.cwd(), "src/features/master-study/data/get-sector-knowledge-read-model.ts"),
      "utf8",
    )

    // Interdits absolus
    expect(sourceCode).not.toContain('.from("sector_intelligence")')
    expect(sourceCode).not.toContain('.from("sector_pain_points")')
    expect(sourceCode).not.toContain('.from("sector_events")')
    expect(sourceCode).not.toContain('.from("sector_news")')
    expect(sourceCode).not.toContain('.from("sector_regulatory_items")')

    // Sources autorisées
    expect(sourceCode).toContain('.from("v_sector_knowledge_resolved")')
    expect(sourceCode).toContain('.from("v_sector_knowledge_items")')
  })
})

describe("getSectorKnowledgeReadModels — tests fonctionnels", () => {
  const SEGMENT_A = "11111111-1111-1111-1111-111111111111"
  const SEGMENT_B = "22222222-2222-2222-2222-222222222222"
  const MACRO_ID = "33333333-3333-3333-3333-333333333333"

  function mockResolvedRow(overrides: Record<string, unknown> = {}) {
    return {
      segment_id: SEGMENT_A,
      segment_name: "Compositions & ingrédients B2B",
      segment_slug: "seg-parfumerie-compositions-b2b",
      segment_status: "active",
      macro_id: MACRO_ID,
      macro_name: "Parfumerie, Arômes & Cosmétique",
      macro_slug: "parfumerie-aromes-cosmetique",
      macro_status: "active",
      description: "Description segment riche",
      description_level: "segment",
      attractiveness_score: 4.8,
      attractiveness_score_level: "segment",
      market_size_eur_bn: null,
      market_size_eur_bn_level: "locked",
      market_growth_pct: null,
      market_growth_pct_level: "locked",
      playbook: { personas: [{ role: "R&D" }], roi_arguments: ["ROI"] },
      playbook_level: "segment",
      practices_fit: { data_ai: 4, cyber: 3 },
      practices_fit_level: "segment",
      keyPlayersPaca: [{ name: "Robertet" }],
      keyPlayersNational: [{ name: "Givaudan" }],
      has_segment_knowledge: true,
      digital_maturity: "medium",
      avg_tjm_min: 750,
      avg_tjm_max: 950,
      caveats: { sources: ["IFRA"] },
      source_run_id: "522cfe06-f241-4620-a820-a0806a902571",
      study_snapshot_date: "2026-08-14",
      workspace_id: "ws-1",
      ...overrides,
    }
  }

  function mockItemRow(overrides: Record<string, unknown> = {}) {
    return {
      item_kind: "pain_point",
      item_id: "pp-1",
      resolved_level: "segment",
      title: "Pression réglementaire IFRA",
      description: "Contraintes strictes sur les allergènes",
      source_url: "https://ifrafragrance.org",
      authority: "IFRA",
      kredo_practice: "data_ai",
      commercial_angle: "Conformité et traçabilité",
      is_commercial_window: false,
      deadline_date: null,
      urgency: null,
      event_type: null,
      event_date: null,
      event_status: null,
      published_at: null,
      relevance_score: null,
      is_trigger_event: false,
      frequency_count: 5,
      source_company_ids: ["comp-1"],
      verbatim: "Traçabilité complexe",
      commercial_opportunity: null,
      news_source: null,
      created_at: "2026-08-14T00:00:00Z",
      updated_at: "2026-08-14T00:00:00Z",
      segment_id: SEGMENT_A,
      macro_id: MACRO_ID,
      source_sector_id: SEGMENT_A,
      workspace_id: "ws-1",
      ...overrides,
    }
  }

  it("fait exactement un aller-retour réseau par vue (2 au total) pour N segments, jamais N requêtes", async () => {
    const fromCalls: string[] = []
    const inCalls: Array<{ table: string; column: string; values: string[] }> = []

    const mockSupabase = {
      from: vi.fn((table: string) => {
        fromCalls.push(table)
        const builder = {
          select: vi.fn(() => builder),
          in: vi.fn((column: string, values: string[]) => {
            inCalls.push({ table, column, values })
            return Promise.resolve({
              data:
                table === "v_sector_knowledge_resolved"
                  ? [
                      mockResolvedRow({ segment_id: SEGMENT_A }),
                      mockResolvedRow({ segment_id: SEGMENT_B, segment_slug: "seg-autre" }),
                    ]
                  : [mockItemRow({ segment_id: SEGMENT_A }), mockItemRow({ segment_id: SEGMENT_B, item_id: "pp-2" })],
              error: null,
            })
          }),
        }
        return builder
      }),
    }

    const results = await getSectorKnowledgeReadModels([SEGMENT_A, SEGMENT_B], {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(results).toHaveLength(2)
    expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    expect(fromCalls).toEqual(["v_sector_knowledge_resolved", "v_sector_knowledge_items"])
    expect(inCalls).toEqual([
      { table: "v_sector_knowledge_resolved", column: "segment_id", values: [SEGMENT_A, SEGMENT_B] },
      { table: "v_sector_knowledge_items", column: "segment_id", values: [SEGMENT_A, SEGMENT_B] },
    ])
  })

  it("renvoie un tableau vide immédiatement sans requête si la liste de segments est vide", async () => {
    const mockSupabase = {
      from: vi.fn(),
    }

    const results = await getSectorKnowledgeReadModels([], {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })
    expect(results).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it("hérite du macro pour un segment sans connaissance propre (resolved_level = 'macro', effectiveStatus)", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: () => ({
          in: async () => ({
            data:
              table === "v_sector_knowledge_resolved"
                ? [
                    mockResolvedRow({
                      segment_id: SEGMENT_B,
                      segment_status: "development",
                      macro_status: "active",
                      description: "Description macro",
                      description_level: "macro",
                      playbook_level: "macro",
                      attractiveness_score_level: "macro",
                      has_segment_knowledge: false,
                    }),
                  ]
                : [mockItemRow({ segment_id: SEGMENT_B, resolved_level: "macro" })],
            error: null,
          }),
        }),
      })),
    }

    const [result] = await getSectorKnowledgeReadModels([SEGMENT_B], {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })
    expect(result).toBeDefined()
    expect(result?.descriptionLevel).toBe("macro")
    expect(result?.playbookLevel).toBe("macro")
    expect(result?.effectiveStatus).toBe("active")
    expect(result?.painPoints[0]?.resolvedLevel).toBe("macro")
  })

  it("gère les verrous de résolution (locked) : renvoie NULL et locked sans écraser par la valeur macro", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: () => ({
          in: async () => ({
            data:
              table === "v_sector_knowledge_resolved"
                ? [
                    mockResolvedRow({
                      segment_id: SEGMENT_A,
                      market_size_eur_bn: null,
                      market_size_eur_bn_level: "locked",
                      market_growth_pct: null,
                      market_growth_pct_level: "locked",
                    }),
                  ]
                : [],
            error: null,
          }),
        }),
      })),
    }

    const [result] = await getSectorKnowledgeReadModels([SEGMENT_A], {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })
    expect(result).toBeDefined()
    expect(result?.marketSizeEurBn).toBeNull()
    expect(result?.marketSizeEurBnLevel).toBe("locked")
    expect(result?.marketGrowthPct).toBeNull()
    expect(result?.marketGrowthPctLevel).toBe("locked")
  })

  it("gère le statut « estimated » (ADR-0021, amendement 2026-08-21) : renvoie la valeur segment telle quelle, jamais macro", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: () => ({
          in: async () => ({
            data:
              table === "v_sector_knowledge_resolved"
                ? [
                    mockResolvedRow({
                      segment_id: SEGMENT_A,
                      market_size_eur_bn: 2.4,
                      market_size_eur_bn_level: "estimated",
                    }),
                  ]
                : [],
            error: null,
          }),
        }),
      })),
    }

    const [result] = await getSectorKnowledgeReadModels([SEGMENT_A], {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })
    expect(result).toBeDefined()
    expect(result?.marketSizeEurBn).toBe(2.4)
    expect(result?.marketSizeEurBnLevel).toBe("estimated")
  })

  it("getSectorKnowledgeReadModel délègue à getSectorKnowledgeReadModels avec un seul id", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: () => ({
          in: async () => ({
            data:
              table === "v_sector_knowledge_resolved"
                ? [mockResolvedRow({ segment_id: SEGMENT_A })]
                : [mockItemRow({ segment_id: SEGMENT_A })],
            error: null,
          }),
        }),
      })),
    }

    const model = await getSectorKnowledgeReadModel(SEGMENT_A, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })
    expect(model).toBeDefined()
    expect(model?.segmentId).toBe(SEGMENT_A)
    expect(model?.effectiveStatus).toBe("active")
    expect(model?.painPoints).toHaveLength(1)
  })
})
