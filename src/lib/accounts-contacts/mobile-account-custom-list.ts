import type { Json } from "@/types/database"

const STORAGE_KEY = "kredo_mobile_priority_accounts"
const CHANGE_EVENT = "kredo:mobile-priority-accounts-change"
const PREFS_SECTION_KEY = "mobile_account_quick_search"
const PREFS_PINNED_IDS_KEY = "pinned_company_ids"
export const MOBILE_PRIORITY_ACCOUNT_LIMIT = 10

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function sanitizeMobilePriorityAccountIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const next: string[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const trimmed = item.trim()
    if (!trimmed || next.includes(trimmed)) continue
    next.push(trimmed)
    if (next.length >= MOBILE_PRIORITY_ACCOUNT_LIMIT) break
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

export function getMobilePriorityAccountsStorageKey() {
  return STORAGE_KEY
}

export function getMobilePriorityAccountsChangeEvent() {
  return CHANGE_EVENT
}

export function readMobilePriorityAccountIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitizeMobilePriorityAccountIds(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeMobilePriorityAccountIds(ids: string[]) {
  if (typeof window === "undefined") return

  const next = sanitizeMobilePriorityAccountIds(ids)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange(next)
}

export function extractMobilePriorityAccountIdsFromUiPrefs(uiPrefs: unknown): string[] {
  const prefs = asRecord(uiPrefs)
  const mobilePrefs = asRecord(prefs[PREFS_SECTION_KEY])
  return sanitizeMobilePriorityAccountIds(mobilePrefs[PREFS_PINNED_IDS_KEY])
}

export function mergeMobilePriorityAccountIdsIntoUiPrefs(
  uiPrefs: unknown,
  ids: string[],
): Json {
  const prefs = asRecord(uiPrefs)
  const mobilePrefs = asRecord(prefs[PREFS_SECTION_KEY])

  return {
    ...prefs,
    [PREFS_SECTION_KEY]: {
      ...mobilePrefs,
      [PREFS_PINNED_IDS_KEY]: sanitizeMobilePriorityAccountIds(ids),
    },
  }
}

export async function fetchPersistedMobilePriorityAccountIds(): Promise<string[]> {
  if (typeof window === "undefined") return []

  const response = await fetch("/api/prospection/accounts/mobile-priority", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const payload = (await response.json()) as { pinnedIds?: unknown }
  const pinnedIds = sanitizeMobilePriorityAccountIds(payload.pinnedIds)
  writeMobilePriorityAccountIds(pinnedIds)
  return pinnedIds
}

export async function persistMobilePriorityAccountIds(ids: string[]): Promise<string[]> {
  if (typeof window === "undefined") return sanitizeMobilePriorityAccountIds(ids)

  const nextIds = sanitizeMobilePriorityAccountIds(ids)
  const response = await fetch("/api/prospection/accounts/mobile-priority", {
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
  const persistedIds = sanitizeMobilePriorityAccountIds(payload.pinnedIds ?? nextIds)
  writeMobilePriorityAccountIds(persistedIds)
  return persistedIds
}

export function toggleMobilePriorityAccountId(ids: string[], accountId: string): {
  nextIds: string[]
  status: "added" | "removed" | "limit"
} {
  const trimmedId = accountId.trim()
  if (!trimmedId) {
    return { nextIds: sanitizeMobilePriorityAccountIds(ids), status: "limit" }
  }

  const currentIds = sanitizeMobilePriorityAccountIds(ids)
  if (currentIds.includes(trimmedId)) {
    return {
      nextIds: currentIds.filter((id) => id !== trimmedId),
      status: "removed",
    }
  }

  if (currentIds.length >= MOBILE_PRIORITY_ACCOUNT_LIMIT) {
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
