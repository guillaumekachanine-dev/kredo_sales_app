import {
  CRM_ACCOUNT_LAUNCHER_LIMIT,
  sanitizeCrmLauncherAccountIds,
  extractCrmLauncherAccountIdsFromUiPrefs,
  mergeCrmLauncherAccountIdsIntoUiPrefs,
  readCrmLauncherAccountIds,
  writeCrmLauncherAccountIds,
  toggleCrmLauncherAccountId,
  sortIdsByPriority,
} from "@/lib/crm/account-launcher-preferences"

export const MOBILE_PRIORITY_ACCOUNT_LIMIT = CRM_ACCOUNT_LAUNCHER_LIMIT

export { sortIdsByPriority }

export function sanitizeMobilePriorityAccountIds(value: unknown): string[] {
  return sanitizeCrmLauncherAccountIds(value)
}

export function extractMobilePriorityAccountIdsFromUiPrefs(uiPrefs: unknown): string[] {
  return extractCrmLauncherAccountIdsFromUiPrefs(uiPrefs)
}

export function mergeMobilePriorityAccountIdsIntoUiPrefs(uiPrefs: unknown, ids: string[]) {
  return mergeCrmLauncherAccountIdsIntoUiPrefs(uiPrefs, ids)
}

export function readMobilePriorityAccountIds(): string[] {
  return readCrmLauncherAccountIds()
}

export function writeMobilePriorityAccountIds(ids: string[]) {
  writeCrmLauncherAccountIds(ids)
}

export function toggleMobilePriorityAccountId(ids: string[], accountId: string) {
  return toggleCrmLauncherAccountId(ids, accountId)
}

const STORAGE_KEY = "kredo_mobile_priority_accounts"
const CHANGE_EVENT = "kredo:mobile-priority-accounts-change"

export function getMobilePriorityAccountsStorageKey() {
  return STORAGE_KEY
}

export function getMobilePriorityAccountsChangeEvent() {
  return CHANGE_EVENT
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
  const pinnedIds = sanitizeCrmLauncherAccountIds(payload.pinnedIds)
  writeCrmLauncherAccountIds(pinnedIds)
  return pinnedIds
}

export async function persistMobilePriorityAccountIds(ids: string[]): Promise<string[]> {
  if (typeof window === "undefined") return sanitizeCrmLauncherAccountIds(ids)

  const nextIds = sanitizeCrmLauncherAccountIds(ids)
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
  const persistedIds = sanitizeCrmLauncherAccountIds(payload.pinnedIds ?? nextIds)
  writeCrmLauncherAccountIds(persistedIds)
  return persistedIds
}
