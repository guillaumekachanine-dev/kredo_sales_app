import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BI_SESSION_STORAGE_KEY,
  clearBusinessIntelligenceSession,
  getBusinessIntelligenceSession,
  setBusinessIntelligenceSession,
} from "./business-intelligence-session"

describe("BusinessIntelligenceSessionTracker logic & lifecycle", () => {
  const SEGMENT_A = "11111111-1111-4111-8111-111111111111"
  const SEGMENT_B = "22222222-2222-4222-8222-222222222222"

  let store: Record<string, string>
  let docListeners: Record<string, ((event?: unknown) => void)[]>
  let winListeners: Record<string, ((event?: unknown) => void)[]>
  let routerReplace = vi.fn<(href: string) => void>()

  beforeEach(() => {
    store = {}
    docListeners = {}
    winListeners = {}
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

    const mockDoc = {
      visibilityState: "visible" as DocumentVisibilityState,
      addEventListener: vi.fn((event: string, cb: (e?: unknown) => void) => {
        docListeners[event] = docListeners[event] ?? []
        docListeners[event].push(cb)
      }),
      removeEventListener: vi.fn((event: string, cb: (e?: unknown) => void) => {
        docListeners[event] = (docListeners[event] ?? []).filter((l) => l !== cb)
      }),
    }

    const mockWin = {
      sessionStorage: mockStorage,
      addEventListener: vi.fn((event: string, cb: (e?: unknown) => void) => {
        winListeners[event] = winListeners[event] ?? []
        winListeners[event].push(cb)
      }),
      removeEventListener: vi.fn((event: string, cb: (e?: unknown) => void) => {
        winListeners[event] = (winListeners[event] ?? []).filter((l) => l !== cb)
      }),
    }

    vi.stubGlobal("window", mockWin)
    vi.stubGlobal("document", mockDoc)
    vi.stubGlobal("sessionStorage", mockStorage)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-05T10:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // Simule le cycle de vie du tracker
  function mountTracker(segmentId: string) {
    let isExpired = false
    let currentSegment = segmentId

    setBusinessIntelligenceSession(currentSegment)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (!isExpired) setBusinessIntelligenceSession(currentSegment)
      } else if (document.visibilityState === "visible") {
        const session = getBusinessIntelligenceSession()
        if (!session) {
          isExpired = true
          clearBusinessIntelligenceSession()
          routerReplace("/intelligence")
        } else {
          setBusinessIntelligenceSession(currentSegment)
        }
      }
    }

    const handlePageHide = () => {
      if (!isExpired) setBusinessIntelligenceSession(currentSegment)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return {
      updateSegment: (newSegmentId: string) => {
        currentSegment = newSegmentId
        setBusinessIntelligenceSession(currentSegment)
      },
      unmount: () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        window.removeEventListener("pagehide", handlePageHide)
        if (!isExpired) setBusinessIntelligenceSession(currentSegment)
      },
    }
  }

  it("mémorise le segment actif et son horodatage dès le montage", () => {
    const tracker = mountTracker(SEGMENT_A)
    const session = getBusinessIntelligenceSession()

    expect(session).toEqual({
      segmentId: SEGMENT_A,
      lastVisitedAt: new Date("2026-09-05T10:00:00.000Z").getTime(),
    })

    tracker.unmount()
  })

  it("actualise l'horodatage lors d'un passage en arrière-plan (visibilityState: hidden)", () => {
    const tracker = mountTracker(SEGMENT_A)

    vi.advanceTimersByTime(4 * 60 * 1000) // 10:04
    ;(document as unknown as { visibilityState: DocumentVisibilityState }).visibilityState = "hidden"

    for (const listener of docListeners["visibilitychange"] ?? []) listener()

    const session = getBusinessIntelligenceSession()
    expect(session?.lastVisitedAt).toBe(new Date("2026-09-05T10:04:00.000Z").getTime())

    tracker.unmount()
  })

  it("conserve le workspace lors d'un retour visible avant 15 minutes", () => {
    const tracker = mountTracker(SEGMENT_A)

    vi.advanceTimersByTime(4 * 60 * 1000) // 10:04 - passage en arrière-plan
    ;(document as unknown as { visibilityState: DocumentVisibilityState }).visibilityState = "hidden"
    for (const listener of docListeners["visibilitychange"] ?? []) listener()

    vi.advanceTimersByTime(6 * 60 * 1000) // 10:10 (6 min d'inactivité < 15 min)
    ;(document as unknown as { visibilityState: DocumentVisibilityState }).visibilityState = "visible"
    for (const listener of docListeners["visibilitychange"] ?? []) listener()

    expect(routerReplace).not.toHaveBeenCalled()
    const session = getBusinessIntelligenceSession()
    expect(session).not.toBeNull()
    expect(session?.segmentId).toBe(SEGMENT_A)
    // Horodatage rafraîchi au retour
    expect(session?.lastVisitedAt).toBe(new Date("2026-09-05T10:10:00.000Z").getTime())

    tracker.unmount()
  })

  it("purge la session et redirige vers /intelligence lors d'un retour visible après plus de 15 minutes", () => {
    const tracker = mountTracker(SEGMENT_A)

    vi.advanceTimersByTime(4 * 60 * 1000) // 10:04 - passage en arrière-plan
    ;(document as unknown as { visibilityState: DocumentVisibilityState }).visibilityState = "hidden"
    for (const listener of docListeners["visibilitychange"] ?? []) listener()

    vi.advanceTimersByTime(16 * 60 * 1000) // 10:20 (16 min d'inactivité >= 15 min)
    ;(document as unknown as { visibilityState: DocumentVisibilityState }).visibilityState = "visible"
    for (const listener of docListeners["visibilitychange"] ?? []) listener()

    expect(routerReplace).toHaveBeenCalledWith("/intelligence")
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(store[BI_SESSION_STORAGE_KEY]).toBeUndefined()

    // Le démontage consécutif à l'expiration ne doit pas recréer la session
    tracker.unmount()
    expect(getBusinessIntelligenceSession()).toBeNull()
  })

  it("actualise l'horodatage lors de la navigation vers une autre page (démontage)", () => {
    const tracker = mountTracker(SEGMENT_A)

    vi.advanceTimersByTime(3 * 60 * 1000) // 10:03 - l'utilisateur navigue vers CRM
    tracker.unmount()

    const session = getBusinessIntelligenceSession()
    expect(session?.lastVisitedAt).toBe(new Date("2026-09-05T10:03:00.000Z").getTime())
    expect(session?.segmentId).toBe(SEGMENT_A)
  })

  it("actualise le segmentId mémorisé lors d'un changement de segment", () => {
    const tracker = mountTracker(SEGMENT_A)
    expect(getBusinessIntelligenceSession()?.segmentId).toBe(SEGMENT_A)

    vi.advanceTimersByTime(2 * 60 * 1000)
    tracker.updateSegment(SEGMENT_B)

    const session = getBusinessIntelligenceSession()
    expect(session?.segmentId).toBe(SEGMENT_B)
    expect(session?.lastVisitedAt).toBe(new Date("2026-09-05T10:02:00.000Z").getTime())

    tracker.unmount()
  })

  it("nettoie les écouteurs d'événements au démontage", () => {
    const tracker = mountTracker(SEGMENT_A)
    expect(docListeners["visibilitychange"]?.length).toBe(1)
    expect(winListeners["pagehide"]?.length).toBe(1)

    tracker.unmount()
    expect(docListeners["visibilitychange"]?.length).toBe(0)
    expect(winListeners["pagehide"]?.length).toBe(0)
  })
})
