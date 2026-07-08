import type { Json } from "@/types/database"

export const CRM_ACCOUNT_LAUNCHER_LIMIT = 10
const STORAGE_KEY = "kredo_mobile_priority_accounts"
const CHANGE_EVENT = "kredo:mobile-priority-accounts-change"

const NEW_PREFS_SECTION_KEY = "crm_account_launcher"
const NEW_PREFS_PINNED_IDS_KEY = "pinned_company_ids"

const OLD_PREFS_SECTION_KEY = "mobile_account_quick_search"
const OLD_PREFS_PINNED_IDS_KEY = "pinned_company_ids"

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function sanitizeCrmLauncherAccountIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const next: string[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const trimmed = item.trim()
    if (!trimmed || next.includes(trimmed)) continue
    next.push(trimmed)
    if (next.length >= CRM_ACCOUNT_LAUNCHER_LIMIT) break
  }

  return next
}

function emitChange(ids: string[]) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<string[]>(CHANGE_EVENT, {
      detail: ids,
    }),
  )
}

export function readCrmLauncherAccountIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitizeCrmLauncherAccountIds(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeCrmLauncherAccountIds(ids: string[]) {
  if (typeof window === "undefined") return

  const next = sanitizeCrmLauncherAccountIds(ids)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange(next)
}

export function extractCrmLauncherAccountIdsFromUiPrefs(uiPrefs: unknown): string[] {
  const prefs = asRecord(uiPrefs)
  
  // 1. Essayer de lire la nouvelle clé
  const newSection = asRecord(prefs[NEW_PREFS_SECTION_KEY])
  const newPinned = newSection[NEW_PREFS_PINNED_IDS_KEY]
  
  if (Array.isArray(newPinned) && newPinned.length > 0) {
    return sanitizeCrmLauncherAccountIds(newPinned)
  }
  
  // 2. Fallback sur l'ancienne clé
  const oldSection = asRecord(prefs[OLD_PREFS_SECTION_KEY])
  const oldPinned = oldSection[OLD_PREFS_PINNED_IDS_KEY]
  
  return sanitizeCrmLauncherAccountIds(oldPinned)
}

export function mergeCrmLauncherAccountIdsIntoUiPrefs(uiPrefs: unknown, ids: string[]): Json {
  const prefs = asRecord(uiPrefs)
  const newSection = asRecord(prefs[NEW_PREFS_SECTION_KEY])
  const sanitizedIds = sanitizeCrmLauncherAccountIds(ids)

  return {
    ...prefs,
    [NEW_PREFS_SECTION_KEY]: {
      ...newSection,
      [NEW_PREFS_PINNED_IDS_KEY]: sanitizedIds,
    },
  } as unknown as Json
}

export async function fetchPersistedCrmLauncherAccountIds(): Promise<string[]> {
  if (typeof window === "undefined") return []

  const response = await fetch("/api/prospection/accounts/launcher/pinned", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const payload = (await response.json()) as { pinnedIds?: unknown }
  const pinnedIds = sanitizeCrmLauncherAccountIds(payload.pinnedIds)
  writeCrmLauncherAccountIds(pinnedIds)
  return pinnedIds
}

export async function persistCrmLauncherAccountIds(ids: string[]): Promise<string[]> {
  if (typeof window === "undefined") return sanitizeCrmLauncherAccountIds(ids)

  const nextIds = sanitizeCrmLauncherAccountIds(ids)
  const response = await fetch("/api/prospection/accounts/launcher/pinned", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinnedIds: nextIds }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const payload = (await response.json()) as { pinnedIds?: unknown }
  const persistedIds = sanitizeCrmLauncherAccountIds(payload.pinnedIds ?? nextIds)
  writeCrmLauncherAccountIds(persistedIds)
  return persistedIds
}

export function toggleCrmLauncherAccountId(ids: string[], accountId: string): {
  nextIds: string[]
  status: "added" | "removed" | "limit"
} {
  const trimmedId = accountId.trim()
  if (!trimmedId) {
    return { nextIds: sanitizeCrmLauncherAccountIds(ids), status: "limit" }
  }

  const currentIds = sanitizeCrmLauncherAccountIds(ids)
  if (currentIds.includes(trimmedId)) {
    return {
      nextIds: currentIds.filter((id) => id !== trimmedId),
      status: "removed",
    }
  }

  if (currentIds.length >= CRM_ACCOUNT_LAUNCHER_LIMIT) {
    return { nextIds: currentIds, status: "limit" }
  }

  return {
    nextIds: [...currentIds, trimmedId],
    status: "added",
  }
}

export function sortIdsByPriority<T extends { id: string }>(items: T[], priorityIds: string[]): T[] {
  if (priorityIds.length === 0) return items

  const order = new Map(priorityIds.map((id, index) => [id, index]))

  return [...items].sort((left, right) => {
    const leftRank = order.get(left.id)
    const rightRank = order.get(right.id)

    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank
    if (leftRank !== undefined) return -1
    if (rightRank !== undefined) return 1
    return 0
  })
}
