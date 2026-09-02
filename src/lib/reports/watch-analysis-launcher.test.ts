import { describe, expect, it } from "vitest"

import { hasLocalWatchAnalysisOwner } from "./watch-analysis-launcher"

describe("watch analysis composer ownership", () => {
  it("hands the event to the page that owns a richer composer", () => {
    expect(hasLocalWatchAnalysisOwner("/veille")).toBe(true)
    expect(hasLocalWatchAnalysisOwner("/reports")).toBe(true)
    expect(hasLocalWatchAnalysisOwner("/reports?section=documents")).toBe(true)
  })

  it("lets the global host serve every other route", () => {
    for (const pathname of ["/intelligence", "/cockpit", "/missions", "/prospection-intelligence"]) {
      expect(hasLocalWatchAnalysisOwner(pathname)).toBe(false)
    }
  })

  it("matches on route boundaries, not on string prefixes", () => {
    expect(hasLocalWatchAnalysisOwner("/veille-strategique")).toBe(false)
    expect(hasLocalWatchAnalysisOwner("/reports-legacy")).toBe(false)
  })
})
