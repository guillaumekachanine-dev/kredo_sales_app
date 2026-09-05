import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BusinessIntelligenceCatalog } from "../data/business-intelligence-workspace-types"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import {
  BI_SESSION_STORAGE_KEY,
  BI_SESSION_TTL_MS,
  clearBusinessIntelligenceSession,
  getBusinessIntelligenceSession,
  setBusinessIntelligenceSession,
} from "./business-intelligence-session"

function createMockCatalog(segmentIds: string[]): BusinessIntelligenceCatalog {
  return {
    state: "ready",
    generatedAt: new Date().toISOString(),
    error: null,
    macros: [
      {
        id: "macro-1",
        name: "Industrie",
        slug: "industrie",
        status: "active",
        accountCount: 10,
        segments: segmentIds.map((id, index) => ({
          id,
          name: `Segment ${index + 1}`,
          slug: `segment-${index + 1}`,
          status: "active",
          accountCount: 5,
          coverage: {
            study: { available: true, level: "segment", updatedAt: null },
            playbook: { available: true, level: "segment", updatedAt: null },
            competitiveMap: { available: false, level: null, updatedAt: null },
            valueChain: { available: false, level: null, updatedAt: null },
            regulatory: { available: false, level: null, updatedAt: null },
            news: { available: false, level: null, updatedAt: null },
          },
        })),
      },
    ],
  }
}

describe("BusinessIntelligenceEntryGate logic", () => {
  const SEGMENT_ACTIVE = "11111111-1111-4111-8111-111111111111"
  const SEGMENT_DELETED = "99999999-9999-4999-8999-999999999999"
  const catalog = createMockCatalog([SEGMENT_ACTIVE])

  let store: Record<string, string>
  let routerReplace = vi.fn<(href: string) => void>()

  beforeEach(() => {
    store = {}
    routerReplace = vi.fn()

    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = String(value)
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
      get length() {
        return Object.keys(store).length
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    }

    vi.stubGlobal("window", { sessionStorage: mockStorage })
    vi.stubGlobal("sessionStorage", mockStorage)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-05T10:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // Simule la résolution effectuée par BusinessIntelligenceEntryGate
  function evaluateEntryGate({
    catalogState,
    issue = null,
  }: {
    catalogState: BusinessIntelligenceCatalog
    issue?: "unknown_segment" | "macro_not_allowed" | "malformed_segment" | null
  }) {
    if (issue) {
      clearBusinessIntelligenceSession()
      return { action: "landing", issue, targetHref: null }
    }

    const session = getBusinessIntelligenceSession()
    if (!session) {
      return { action: "landing", issue: null, targetHref: null }
    }

    if (catalogState.state === "ready") {
      const exists = catalogState.macros.some((macro) =>
        macro.segments.some((segment) => segment.id === session.segmentId),
      )
      if (!exists) {
        clearBusinessIntelligenceSession()
        return { action: "landing", issue: null, targetHref: null }
      }
    }

    const targetHref = buildBusinessIntelligenceHref(session.segmentId, "home")
    routerReplace(targetHref)
    return { action: "redirect", issue: null, targetHref }
  }

  it("affiche la landing sans redirection lorsqu'aucune session n'existe (première visite)", () => {
    const result = evaluateEntryGate({ catalogState: catalog })

    expect(result.action).toBe("landing")
    expect(result.targetHref).toBeNull()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it("reprend automatiquement le segment et déclenche router.replace vers /intelligence?segment=<id>&tab=home si session fraîche", () => {
    setBusinessIntelligenceSession(SEGMENT_ACTIVE)
    vi.advanceTimersByTime(5 * 60 * 1000) // 5 min < 15 min

    const result = evaluateEntryGate({ catalogState: catalog })

    expect(result.action).toBe("redirect")
    expect(result.targetHref).toBe(`/intelligence?segment=${SEGMENT_ACTIVE}&tab=home`)
    expect(routerReplace).toHaveBeenCalledWith(`/intelligence?segment=${SEGMENT_ACTIVE}&tab=home`)
  })

  it("supprime la session et affiche la landing si la session a expiré (>= 15 min)", () => {
    setBusinessIntelligenceSession(SEGMENT_ACTIVE)
    vi.advanceTimersByTime(BI_SESSION_TTL_MS) // 15 min

    const result = evaluateEntryGate({ catalogState: catalog })

    expect(result.action).toBe("landing")
    expect(result.targetHref).toBeNull()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(store[BI_SESSION_STORAGE_KEY]).toBeUndefined()
  })

  it("supprime la session et reste sur la landing si le segment mémorisé n'existe plus dans le catalogue", () => {
    setBusinessIntelligenceSession(SEGMENT_DELETED)

    const result = evaluateEntryGate({ catalogState: catalog })

    expect(result.action).toBe("landing")
    expect(result.targetHref).toBeNull()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(store[BI_SESSION_STORAGE_KEY]).toBeUndefined()
  })

  it("supprime la session et affiche la landing avec le message d'issue lorsqu'une URL avec segment invalide est accédée", () => {
    setBusinessIntelligenceSession(SEGMENT_ACTIVE)

    const result = evaluateEntryGate({ catalogState: catalog, issue: "unknown_segment" })

    expect(result.action).toBe("landing")
    expect(result.issue).toBe("unknown_segment")
    expect(result.targetHref).toBeNull()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(store[BI_SESSION_STORAGE_KEY]).toBeUndefined()
  })
})
