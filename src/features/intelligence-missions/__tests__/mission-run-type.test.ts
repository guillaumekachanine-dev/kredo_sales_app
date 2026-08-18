import { describe, expect, it } from "vitest"
import { buildMissionRunType, isMissionRunType } from "../domain/mission-run-type"

describe("mission run_type", () => {
  it("construit la convention mission:<slug>", () => {
    expect(buildMissionRunType("veille-analyse-mensuelle")).toBe(
      "mission:veille-analyse-mensuelle",
    )
  })

  it("reconnait uniquement le prefixe mission:", () => {
    expect(isMissionRunType("mission:veille-analyse-mensuelle")).toBe(true)
    expect(isMissionRunType("mission:")).toBe(true)
    expect(isMissionRunType("intel-021-monthly-watch-analysis")).toBe(false)
    expect(isMissionRunType("Mission:veille-analyse-mensuelle")).toBe(false)
    expect(isMissionRunType(null)).toBe(false)
    expect(isMissionRunType(undefined)).toBe(false)
  })
})
