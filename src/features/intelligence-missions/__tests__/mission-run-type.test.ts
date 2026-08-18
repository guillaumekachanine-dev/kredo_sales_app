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
    // Le prefixe seul suffit au callback (M-7) : tout run_type mission:* est aiguille
    // vers mission_report, y compris un slug vide. Aucun run_type existant ne le porte.
    expect(isMissionRunType("intel-021-monthly-watch-analysis")).toBe(false)
    expect(isMissionRunType("intel-021-monthly-watch-analysis")).toBe(false)
    expect(isMissionRunType("Mission:veille-analyse-mensuelle")).toBe(false)
    expect(isMissionRunType(null)).toBe(false)
    expect(isMissionRunType(undefined)).toBe(false)
  })
})
