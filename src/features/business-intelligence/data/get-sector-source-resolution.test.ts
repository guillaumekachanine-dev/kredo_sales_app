import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSectorSourceResolution } from "./get-sector-source-resolution"

const SEGMENT_ID = "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6"
const CORPUS_ID = "e0e31867-7cb8-431b-812b-8b96163c96c0"

function buildMockSupabase(itemRows: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "source_corpora") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [{ id: CORPUS_ID }], error: null })),
            })),
          })),
        }
      }
      if (table === "source_corpus_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: itemRows, error: null })),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe("getSectorSourceResolution", () => {
  it("résout un src_number vers sa fiche source (publisher/homepage/tier/atteste)", async () => {
    const mockSupabase = buildMockSupabase([
      {
        src_number: 7,
        tier: "3",
        atteste: "Longlist sectorielle française d'adhérents",
        source_catalog: {
          publisher: "Syndicat National des Fabricants de Produits Aromatiques (PRODAROM)",
          homepage_url: "https://prodarom.com",
          last_verified_at: "2026-08-14T00:00:00Z",
        },
      },
    ])

    const resolution = await getSectorSourceResolution(SEGMENT_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(resolution.size).toBe(1)
    expect(resolution.get(7)).toEqual({
      srcId: 7,
      publisher: "Syndicat National des Fabricants de Produits Aromatiques (PRODAROM)",
      url: "https://prodarom.com",
      tier: 3,
      attests: "Longlist sectorielle française d'adhérents",
      consultedAt: "2026-08-14T00:00:00Z",
    })
  })

  it("ignore les lignes sans src_number résolu ou sans source_catalog liée", async () => {
    const mockSupabase = buildMockSupabase([
      { src_number: null, tier: "1", atteste: "x", source_catalog: { publisher: "P", homepage_url: null, last_verified_at: null } },
      { src_number: 12, tier: "2", atteste: "y", source_catalog: null },
    ])

    const resolution = await getSectorSourceResolution(SEGMENT_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(resolution.size).toBe(0)
  })

  it("retourne une Map vide sans requêter les items quand aucun corpus courant n'existe pour ce secteur", async () => {
    const itemsFrom = vi.fn()
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "source_corpora") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        itemsFrom()
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    const resolution = await getSectorSourceResolution(SEGMENT_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(resolution.size).toBe(0)
    expect(itemsFrom).not.toHaveBeenCalled()
  })
})
