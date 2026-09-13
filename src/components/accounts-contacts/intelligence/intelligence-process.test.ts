import { describe, expect, it } from "vitest"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
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

// ─── getRecommendedProcessStep — ADR-0019 D-6, action suivante unique ──────
function emptyFixture(): ClientIntelligenceData {
  return {
    accountStudy: { current: null, currentUnreadable: null, recent: [] },
    client: null,
    sectorSnapshot: null,
    sector: null,
    accountIssues: [],
    commercialStrategy: null,
    pitchDocuments: [],
    pitches: [],
    presence: { hasRoadmap: false },
  } as unknown as ClientIntelligenceData
}

describe("getRecommendedProcessStep", () => {
  it("compte vierge : recommande d'abord la connaissance compte, première étape", () => {
    expect(getRecommendedProcessStep(emptyFixture())).toBe("connaissance")
  })

  it("connaissance franchie mais rien d'autre : recommande le secteur, l'étape suivante", () => {
    expect(getRecommendedProcessStep({ ...emptyFixture(), accountStudy: PUBLISHED_STUDY } as ClientIntelligenceData)).toBe("secteur")
  })

  it("tout franchi (success/warning) : retombe sur la roadmap, action de clôture", () => {
    const data = {
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
