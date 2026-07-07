const STORAGE_KEY = "kredo_mobile_priority_accounts"
const CHANGE_EVENT = "kredo:mobile-priority-accounts-change"
export const MOBILE_PRIORITY_ACCOUNT_LIMIT = 10

function sanitizeIds(value: unknown): string[] {
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
    return sanitizeIds(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeMobilePriorityAccountIds(ids: string[]) {
  if (typeof window === "undefined") return

  const next = sanitizeIds(ids)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange(next)
}

export function toggleMobilePriorityAccountId(ids: string[], accountId: string): {
  nextIds: string[]
  status: "added" | "removed" | "limit"
} {
  const trimmedId = accountId.trim()
  if (!trimmedId) {
    return { nextIds: sanitizeIds(ids), status: "limit" }
  }

  const currentIds = sanitizeIds(ids)
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
