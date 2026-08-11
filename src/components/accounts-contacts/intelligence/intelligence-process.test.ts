import { describe, expect, it } from "vitest"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountDepthLevel } from "@/features/account-lifecycle/domain/depth-level"
import { getProcessStepStatus, getRecommendedProcessStep } from "./intelligence-process"

// ─── getProcessStepStatus("connaissance", …) — revue Lot 4, Contrôle 2 ─────
// `data.accountKnowledge` est restreint à V1/V2 (aucun lecteur V3 avant le
// Lot 5). Le tester seul faisait conclure à tort « À compléter » dès qu'un
// V3 — le contrat le plus riche — était l'artefact courant, alors qu'une
// génération venait de réussir. Ces tests figent le comportement corrigé.
//
// Double minimal : seuls `accountKnowledge`, `accountKnowledgeV3` et `client`
// sont lus par la branche « connaissance » ; le reste de `ClientIntelligenceData`
// n'intervient jamais dans ce switch.
function fixture(overrides: Partial<ClientIntelligenceData>): ClientIntelligenceData {
  return {
    accountKnowledge: null,
    accountKnowledgeV3: null,
    client: null,
    ...overrides,
  } as ClientIntelligenceData
}

describe("getProcessStepStatus — connaissance", () => {
  it("V3 seul courant : « Disponible », jamais « À compléter »", () => {
    const data = fixture({
      accountKnowledgeV3: { version: 3, data: {} as never, resultId: "r1", createdAt: "2026-08-05T10:00:00Z" },
    })

    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "Disponible", tone: "success" })
  })

  it("V2 courant : « Disponible » (comportement pré-existant, non régressé)", () => {
    const data = fixture({
      accountKnowledge: { version: 2, data: {} as never, resultId: "r1", createdAt: "2026-08-05T10:00:00Z" },
    })

    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "Disponible", tone: "success" })
  })

  it("ni moteur ni FOLIO : « À compléter »", () => {
    const data = fixture({})

    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "À compléter", tone: "neutral" })
  })

  it("FOLIO seul (aucun moteur) : « FOLIO », pas « Disponible »", () => {
    const data = fixture({ client: { data: {} as never, source: "folio" } })

    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "FOLIO", tone: "warning" })
  })

  it("V3 courant PLUS FOLIO présent : le moteur prime, jamais rétrogradé à FOLIO", () => {
    const data = fixture({
      accountKnowledgeV3: { version: 3, data: {} as never, resultId: "r1", createdAt: "2026-08-05T10:00:00Z" },
      client: { data: {} as never, source: "folio" },
    })

    expect(getProcessStepStatus("connaissance", data)).toEqual({ label: "Disponible", tone: "success" })
  })
})

// ─── getProcessStepStatus("socle", …) — ADR-0019 Lot 3 ─────────────────────
function socleFixture(depthLevel: AccountDepthLevel): ClientIntelligenceData {
  return {
    company: { depthLevel },
    accountKnowledge: null,
    accountKnowledgeV3: null,
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
      accountKnowledge: null,
      accountKnowledgeV3: null,
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
