export const BI_SESSION_STORAGE_KEY = "kredo:business-intelligence:session"
export const BI_SESSION_TTL_MS = 15 * 60 * 1000 // 15 minutes d'inactivité

export type BusinessIntelligenceSessionMemory = {
  segmentId: string
  lastVisitedAt: number
}

/**
 * Détermine si une session Business Intelligence a expiré (durée écoulée >= 15 min).
 */
export function isBusinessIntelligenceSessionExpired(
  lastVisitedAt: number,
  now: number = Date.now(),
): boolean {
  return now - lastVisitedAt >= BI_SESSION_TTL_MS
}

/**
 * Récupère le segment BI mémorisé en session s'il est valide et non expiré.
 * En cas de valeur corrompue ou expirée, nettoie automatiquement le sessionStorage.
 */
export function getBusinessIntelligenceSession(
  now: number = Date.now(),
): BusinessIntelligenceSessionMemory | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null

  try {
    const raw = window.sessionStorage.getItem(BI_SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as BusinessIntelligenceSessionMemory).segmentId !== "string" ||
      !(parsed as BusinessIntelligenceSessionMemory).segmentId.trim() ||
      typeof (parsed as BusinessIntelligenceSessionMemory).lastVisitedAt !== "number" ||
      Number.isNaN((parsed as BusinessIntelligenceSessionMemory).lastVisitedAt)
    ) {
      clearBusinessIntelligenceSession()
      return null
    }

    const memory = parsed as BusinessIntelligenceSessionMemory
    if (isBusinessIntelligenceSessionExpired(memory.lastVisitedAt, now)) {
      clearBusinessIntelligenceSession()
      return null
    }

    return memory
  } catch {
    clearBusinessIntelligenceSession()
    return null
  }
}

/**
 * Enregistre ou actualise le segment actif et son horodatage de consultation.
 */
export function setBusinessIntelligenceSession(
  segmentId: string,
  visitedAt: number = Date.now(),
): void {
  if (typeof window === "undefined" || !window.sessionStorage) return

  try {
    const payload: BusinessIntelligenceSessionMemory = {
      segmentId: segmentId.trim(),
      lastVisitedAt: visitedAt,
    }
    window.sessionStorage.setItem(BI_SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignorer silencieusement les exceptions de quota ou de navigation privée stricte
  }
}

/**
 * Supprime la mémoire de session Business Intelligence.
 */
export function clearBusinessIntelligenceSession(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return

  try {
    window.sessionStorage.removeItem(BI_SESSION_STORAGE_KEY)
  } catch {
    // Ignorer silencieusement
  }
}
