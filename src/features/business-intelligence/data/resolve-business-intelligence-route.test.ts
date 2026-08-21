import { beforeEach, describe, expect, it, vi } from "vitest"

const SEGMENT = "20000000-0000-4000-8000-000000000000"
const MACRO = "10000000-0000-4000-8000-000000000000"

const rows = [
  { id: SEGMENT, slug: "spatial", name: "Spatial", level: "segment" },
  { id: MACRO, slug: "industrie", name: "Industrie", level: "macro" },
]

const createClient = vi.fn(async () => ({
  from: () => ({
    select: () => ({
      eq: (column: "id" | "slug", value: string) => ({
        maybeSingle: async () => ({ data: rows.find((row) => row[column] === value) ?? null, error: null }),
      }),
    }),
  }),
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))

describe("resolveBusinessIntelligenceRoute", () => {
  beforeEach(() => createClient.mockClear())

  it("retourne le catalogue sans paramètre et sans requête", async () => {
    const { resolveBusinessIntelligenceRoute } = await import("./resolve-business-intelligence-route")
    await expect(resolveBusinessIntelligenceRoute({})).resolves.toEqual({ kind: "catalog", tab: null })
    expect(createClient).not.toHaveBeenCalled()
  })

  it("donne la priorité au paramètre segment, même invalide", async () => {
    const { resolveBusinessIntelligenceRoute } = await import("./resolve-business-intelligence-route")
    await expect(resolveBusinessIntelligenceRoute({ segment: "incorrect", competitiveSegment: "spatial" })).resolves.toEqual({
      kind: "invalid",
      reason: "malformed_segment",
      tab: null,
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it("accepte uniquement un segment métier canonique", async () => {
    const { resolveBusinessIntelligenceRoute } = await import("./resolve-business-intelligence-route")
    await expect(resolveBusinessIntelligenceRoute({ segment: SEGMENT, tab: "competitive_env" })).resolves.toEqual({ kind: "workspace", segmentId: SEGMENT, segmentName: "Spatial", tab: "competitive_env" })
    await expect(resolveBusinessIntelligenceRoute({ segment: MACRO })).resolves.toEqual({ kind: "invalid", reason: "macro_not_allowed", tab: null })
  })

  it("canonicalise l’alias historique et conserve tab", async () => {
    const { resolveBusinessIntelligenceRoute } = await import("./resolve-business-intelligence-route")
    await expect(resolveBusinessIntelligenceRoute({ competitiveSegment: "spatial", tab: "competitive_env" })).resolves.toEqual({
      kind: "legacyRedirect",
      segmentId: SEGMENT,
      segmentName: "Spatial",
      href: `/intelligence?segment=${SEGMENT}&tab=competitive-environment`,
      tab: "competitive_env",
    })
  })
})
