import { describe, expect, it } from "vitest"
import { DEFAULT_ATLAS_VIEW, resolveInitialAtlasView } from "./PortfolioAtlasDialog"

describe("PortfolioAtlasDialog", () => {
  it("ouvre l’exposition par défaut pour les consommateurs existants", () => {
    expect(DEFAULT_ATLAS_VIEW).toBe("exposure")
    expect(resolveInitialAtlasView()).toBe("exposure")
  })

  it("respecte une vue initiale Marge lorsqu’elle est demandée", () => {
    expect(resolveInitialAtlasView("margin")).toBe("margin")
  })
})
