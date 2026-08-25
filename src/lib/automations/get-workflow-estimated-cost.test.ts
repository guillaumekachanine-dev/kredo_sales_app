import { describe, expect, it } from "vitest"
import { formatWorkflowCost } from "./get-workflow-estimated-cost"

describe("formatWorkflowCost", () => {
  it("formats valid costs with 2 decimals in French locale", () => {
    expect(formatWorkflowCost(0.17)).toBe("0,17 $")
    expect(formatWorkflowCost(1.5)).toBe("1,50 $")
    expect(formatWorkflowCost(0)).toBe("0,00 $")
  })

  it("returns fallback for null or undefined costs", () => {
    expect(formatWorkflowCost(null)).toBe("—")
    expect(formatWorkflowCost(undefined)).toBe("—")
    expect(formatWorkflowCost(NaN)).toBe("—")
  })
})
