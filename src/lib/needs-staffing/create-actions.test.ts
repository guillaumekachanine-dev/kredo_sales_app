import { describe, expect, it } from "vitest"
import { getCreateActionLabel } from "./create-actions"

describe("needs staffing create actions", () => {
  it("returns a dynamic CTA label for each scope", () => {
    expect(getCreateActionLabel("needs")).toBe("+ Nouvelle opportunité")
    expect(getCreateActionLabel("staffing")).toBe("+ Nouveau staffing")
  })
})
