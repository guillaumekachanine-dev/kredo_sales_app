import { describe, expect, it } from "vitest"
import { isBattleRunForCurrentCompany } from "../battle-run-guard"

describe("L7.1 — isolation du run Battle par compte", () => {
  it("run compte A → sélection compte B → succès A : aucun résultat A ne peut s'afficher sous B", () => {
    const runA = { runId: "run-a", companyId: "company-a" }

    expect(isBattleRunForCurrentCompany(runA, "company-a")).toBe(true)
    expect(isBattleRunForCurrentCompany(runA, "company-b")).toBe(false)
  })
})
