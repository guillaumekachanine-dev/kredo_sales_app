import { describe, it, expect } from "vitest"
import { buildLensUrl } from "../mobile-priority-url"

describe("buildLensUrl", () => {
  it("adds lens param to empty search params", () => {
    const params = new URLSearchParams()
    expect(buildLensUrl("/prospection", params, "cibler")).toBe("/prospection?lens=cibler")
  })

  it("preserves existing params when setting lens", () => {
    const params = new URLSearchParams("period=30d&focus=high")
    const url = buildLensUrl("/prospection", params, "engager")
    expect(url).toContain("period=30d")
    expect(url).toContain("focus=high")
    expect(url).toContain("lens=engager")
  })

  it('removes lens param for "all"', () => {
    const params = new URLSearchParams("lens=cibler&period=90d")
    const url = buildLensUrl("/prospection", params, "all")
    expect(url).not.toContain("lens=")
    expect(url).toContain("period=90d")
  })

  it("returns bare path when all params removed", () => {
    const params = new URLSearchParams("lens=cibler")
    expect(buildLensUrl("/prospection", params, "all")).toBe("/prospection")
  })

  it("replaces existing lens value", () => {
    const params = new URLSearchParams("lens=cibler")
    const url = buildLensUrl("/prospection", params, "decider")
    expect(url).toBe("/prospection?lens=decider")
    expect(url).not.toContain("cibler")
  })
})
