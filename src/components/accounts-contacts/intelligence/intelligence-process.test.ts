import { describe, expect, it } from "vitest"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountDepthLevel } from "@/features/account-lifecycle/domain/depth-level"
import { getProcessStepStatus, getRecommendedProcessStep } from "./intelligence-process"

// ─── getProcessStepStatus("connaissance", …) ────────────────────────────────
// La connaissance entreprise est une étude publiée ; FOLIO reste affiché à défaut.
function fixture(overrides: Partial<ClientIntelligenceData>): ClientIntelligenceData {
  return {
    accountStudy: { current: null, currentUnreadable: null, recent: [] },
    client: null,
    ...overrides,
  } as ClientIntelligenceData
}

const PUBLISHED_STUDY = {
  current: { id: "s1", title: "Étude", publishedAt: "2026-09-11T12:00:00Z", knowledge: {} as never },
  currentUnreadable: null,
  recent: [],
}

describe("getProcessStepStatus — connaissance", () => {
  it("étude publiée : « Disponible »", () => {
    expect(getProcessStepStatus("connaissance", fixture({ accountStudy: PUBLISHED_STUDY }))).toEqual({ label: "Disponible", tone: "success" })
  })

  it("ni étude ni FOLIO : « À compléter »", () => {
    expect(getProcessStepStatus("connaissance", fixture({}))).toEqual({ label: "À compléter", tone: "neutral" })
  })

  it("FOLIO seul : « FOLIO », pas « Disponible »", () => {
    const data = fixture({ client: { data: {} as never, source: "folio" } })
    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "FOLIO", tone: "warning" })
  })

  it("étude publiée PLUS FOLIO : l'étude prime", () => {
    const data = fixture({ accountStudy: PUBLISHED_STUDY, client: { data: {} as never, source: "folio" } })
    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "Disponible", tone: "success" })
  })
})

// ─── getProcessStepStatus("socle", …) — ADR-0019 Lot 3 ─────────────────────
function socleFixture(depthLevel: AccountDepthLevel): ClientIntelligenceData {
  return {
    company: { depthLevel },
    accountStudy: { current: null, currentUnreadable: null, recent: [] },
    client: null,
    accountIssues: [],
    commercialStrategy: null,
    pitchDocuments: [],
    pitches: [],
    presence: { hasRoadmap: false },
  } as unknown as ClientIntelligenceData
}

describe("getProcessStepStatus — socle", () => {
  it("mapped : citation cartographie, jamais confondue avec un vrai compte qualifié", () => {
    expect(getProcessStepStatus("socle", socleFixture("mapped"))).toEqual({ label: "Citation", tone: "neutral" })
  })

  it("noted : pense-bête CRM, à qualifier", () => {
    expect(getProcessStepStatus("socle", socleFixture("noted"))).toEqual({ label: "À qualifier", tone: "neutral" })
  })

  it("qualified : socle vérifié", () => {
    expect(getProcessStepStatus("socle", socleFixture("qualified"))).toEqual({ label: "Disponible", tone: "success" })
  })

  it("active : le socle est nécessairement franchi (axe monotone)", () => {
    expect(getProcessStepStatus("socle", socleFixture("active"))).toEqual({ label: "Disponible", tone: "success" })
  })
})

// ─── getRecommendedProcessStep — ADR-0019 D-6, action suivante unique ──────
describe("getRecommendedProcessStep", () => {
  it("compte tout juste noté : recommande d'abord le socle, pas connaissance", () => {
    expect(getRecommendedProcessStep(socleFixture("noted"))).toBe("socle")
  })

  it("socle qualifié mais rien d'autre : recommande connaissance, l'étape suivante", () => {
    expect(getRecommendedProcessStep(socleFixture("qualified"))).toBe("connaissance")
  })

  it("tout franchi (success/warning) : retombe sur la roadmap, action de clôture", () => {
    const data = {
      company: { depthLevel: "active" },
      accountStudy: { current: null, currentUnreadable: null, recent: [] },
      client: { data: {} as never, source: "folio" },
      sectorSnapshot: { regulatoryItems: [], hasAnyKnowledge: true },
      sector: null,
      accountIssues: [{ id: "i1" }],
      commercialStrategy: { data: {} as never, resultId: "r1" },
      pitchDocuments: [],
      pitches: [],
      presence: { hasRoadmap: false },
    } as unknown as ClientIntelligenceData
    expect(getRecommendedProcessStep(data)).toBe("roadmap")
  })
})
