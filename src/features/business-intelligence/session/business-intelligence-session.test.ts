import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BI_SESSION_STORAGE_KEY,
  BI_SESSION_TTL_MS,
  clearBusinessIntelligenceSession,
  getBusinessIntelligenceSession,
  isBusinessIntelligenceSessionExpired,
  setBusinessIntelligenceSession,
} from "./business-intelligence-session"

function createMockSessionStorage(): Storage {
  let store: Record<string, string> = {}
  return {
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
}

describe("business-intelligence-session helper", () => {
  const SEGMENT_A = "11111111-1111-4111-8111-111111111111"
  const SEGMENT_B = "22222222-2222-4222-8222-222222222222"
  let mockStorage: Storage

  beforeEach(() => {
    mockStorage = createMockSessionStorage()
    // Configurer window et sessionStorage dans l'environnement de test Node
    const mockWindow = {
      sessionStorage: mockStorage,
    } as unknown as Window & typeof globalThis

    vi.stubGlobal("window", mockWindow)
    vi.stubGlobal("sessionStorage", mockStorage)

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-05T10:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("retourne null lorsqu'aucune session n'est enregistrée", () => {
    expect(getBusinessIntelligenceSession()).toBeNull()
  })

  it("enregistre et restitue une session valide de moins de 15 minutes", () => {
    setBusinessIntelligenceSession(SEGMENT_A)
    const session = getBusinessIntelligenceSession()

    expect(session).toEqual({
      segmentId: SEGMENT_A,
      lastVisitedAt: new Date("2026-09-05T10:00:00.000Z").getTime(),
    })
  })

  it("conserve la session après 14 minutes et 59 secondes", () => {
    setBusinessIntelligenceSession(SEGMENT_A)
    vi.advanceTimersByTime(BI_SESSION_TTL_MS - 1000)

    const session = getBusinessIntelligenceSession()
    expect(session).not.toBeNull()
    expect(session?.segmentId).toBe(SEGMENT_A)
  })

  it("considère la session comme expirée et la supprime après 15 minutes révolues", () => {
    setBusinessIntelligenceSession(SEGMENT_A)
    vi.advanceTimersByTime(BI_SESSION_TTL_MS)

    const session = getBusinessIntelligenceSession()
    expect(session).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()
  })

  it("supprime et retourne null en cas de JSON corrompu", () => {
    mockStorage.setItem(BI_SESSION_STORAGE_KEY, "{ invalid json ...")

    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()
  })

  it("supprime et retourne null en cas de format invalide ou incomplet", () => {
    // Manque segmentId
    mockStorage.setItem(BI_SESSION_STORAGE_KEY, JSON.stringify({ lastVisitedAt: Date.now() }))
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()

    // segmentId vide
    mockStorage.setItem(BI_SESSION_STORAGE_KEY, JSON.stringify({ segmentId: "   ", lastVisitedAt: Date.now() }))
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()

    // lastVisitedAt non numérique
    mockStorage.setItem(BI_SESSION_STORAGE_KEY, JSON.stringify({ segmentId: SEGMENT_A, lastVisitedAt: "invalid" }))
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()
  })

  it("met à jour la session lors d'un changement de segment", () => {
    setBusinessIntelligenceSession(SEGMENT_A)
    expect(getBusinessIntelligenceSession()?.segmentId).toBe(SEGMENT_A)

    vi.advanceTimersByTime(5 * 60 * 1000)
    setBusinessIntelligenceSession(SEGMENT_B)

    const session = getBusinessIntelligenceSession()
    expect(session?.segmentId).toBe(SEGMENT_B)
    expect(session?.lastVisitedAt).toBe(new Date("2026-09-05T10:05:00.000Z").getTime())
  })

  it("supprime la session lors de l'appel explicite à clearBusinessIntelligenceSession", () => {
    setBusinessIntelligenceSession(SEGMENT_A)
    expect(getBusinessIntelligenceSession()).not.toBeNull()

    clearBusinessIntelligenceSession()
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(mockStorage.getItem(BI_SESSION_STORAGE_KEY)).toBeNull()
  })

  it("évalue correctement isBusinessIntelligenceSessionExpired", () => {
    const baseTime = Date.now()
    expect(isBusinessIntelligenceSessionExpired(baseTime, baseTime + 10 * 60 * 1000)).toBe(false)
    expect(isBusinessIntelligenceSessionExpired(baseTime, baseTime + 15 * 60 * 1000)).toBe(true)
    expect(isBusinessIntelligenceSessionExpired(baseTime, baseTime + 20 * 60 * 1000)).toBe(true)
  })

  it("gère l'environnement SSR (sans window) sans lever d'erreur", () => {
    vi.stubGlobal("window", undefined)
    expect(getBusinessIntelligenceSession()).toBeNull()
    expect(() => setBusinessIntelligenceSession(SEGMENT_A)).not.toThrow()
    expect(() => clearBusinessIntelligenceSession()).not.toThrow()
  })
})
