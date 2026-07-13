import { describe, expect, it, vi } from "vitest"
import { enrichFromActiveIntelligenceContext } from "@/components/communication/CommunicationComposerHost"
import type { CommunicationComposerRequest } from "@/lib/communication/communication-composer"

// Mock useIntelligenceContext state
vi.mock("@/hooks/use-intelligence-context", () => ({
  useIntelligenceContext: {
    getState: () => ({
      entityContext: {
        entityType: "company",
        entityId: "mock-company-id",
        label: "Mock Company",
      },
      panelData: {
        company: {
          id: "mock-company-id",
          name: "Mock Company",
        },
      },
    }),
  },
}))

describe("Neutral launch mode contract", () => {
  it("keeps launchMode as contextual by default (implicitly undefined)", () => {
    const request: CommunicationComposerRequest = { origin: "global" }
    expect(request.launchMode).toBeUndefined()
  })

  it("does not enrich the request from active intelligence context in neutral mode", () => {
    const request: CommunicationComposerRequest = {
      origin: "cockpit_header",
      launchMode: "neutral",
    }
    const enriched = enrichFromActiveIntelligenceContext(request)
    expect(enriched.companyId).toBeUndefined()
    expect(enriched.companyName).toBeUndefined()
    expect(enriched.primaryEntity).toBeUndefined()
    expect(enriched).toEqual(request)
  })

  it("enriches the request from active intelligence context in contextual mode", () => {
    const request: CommunicationComposerRequest = {
      origin: "global",
    }
    const enriched = enrichFromActiveIntelligenceContext(request)
    expect(enriched.companyId).toBe("mock-company-id")
    expect(enriched.companyName).toBe("Mock Company")
  })
})
