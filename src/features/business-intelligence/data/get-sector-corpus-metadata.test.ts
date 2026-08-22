import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSectorCorpusMetadata } from "./get-sector-corpus-metadata"

const SEGMENT_ID = "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6"

describe("getSectorCorpusMetadata", () => {
  it("résout les métadonnées d'un corpus sectoriel courant", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "source_corpora") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: {
                        quality_verdict: "usable_with_caveats",
                        activation_state: "active",
                        snapshot_date: "2026-08-14",
                        gaps: [
                          { rubrique: "Incertitudes", motif: "TAM triangulé" }
                        ],
                      },
                      error: null,
                    }),
                  ),
                })),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    const metadata = await getSectorCorpusMetadata(SEGMENT_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(metadata).toEqual({
      qualityVerdict: "usable_with_caveats",
      activationState: "active",
      snapshotDate: "2026-08-14",
      gaps: [{ motif: "TAM triangulé", famille: "Incertitudes" }],
    })
  })

  it("renvoie null si aucun corpus courant n'est présent pour ce segment", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
    }

    const metadata = await getSectorCorpusMetadata(SEGMENT_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(metadata).toBeNull()
  })
})
