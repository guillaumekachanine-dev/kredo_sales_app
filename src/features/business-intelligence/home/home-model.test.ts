import { describe, expect, it } from "vitest"
import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import { buildSegmentHomeKpis, provenanceLabel } from "./home-model"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

describe("Business Intelligence segment home model", () => {
  it("n’expose que les indicateurs réellement présents", () => {
    const workspace = {
      portfolio: { accounts: [{ id: "a" }, { id: "b" }] },
      knowledge: {
        marketSizeEurBn: 12.5,
        marketSizeEurBnLevel: "macro",
        marketGrowthPct: null,
        marketGrowthPctLevel: "segment",
        attractivenessScore: 72,
        attractivenessScoreLevel: "estimated",
        avgTjmMin: null,
        avgTjmMax: null,
        digitalMaturity: null,
      },
    } as unknown as LoadedWorkspace

    expect(buildSegmentHomeKpis(workspace)).toEqual([
      { label: "Comptes portefeuille", value: "2", level: null },
      { label: "Marché", value: "12,5 Md€", level: "macro" },
      { label: "Attractivité", value: "72", level: "estimated" },
    ])
  })

  it("distingue origine et résolution", () => {
    expect(provenanceLabel("segment")).toBe("Segment")
    expect(provenanceLabel("macro")).toBe("Macro")
    expect(provenanceLabel("locked")).toBe("Verrouillé")
    expect(provenanceLabel("estimated")).toBe("Estimé")
  })
})
