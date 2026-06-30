import { describe, expect, it } from "vitest"

import { calculateBusinessDays } from "../domain/calculate-business-days"

describe("calculateBusinessDays", () => {
  it("counts a full business week with inclusive boundaries", () => {
    expect(calculateBusinessDays("2026-06-01", "2026-06-05")).toBe(5)
  })

  it("ignores a weekend start and end while keeping the range inclusive", () => {
    expect(calculateBusinessDays("2026-06-06", "2026-06-14")).toBe(5)
  })
})
