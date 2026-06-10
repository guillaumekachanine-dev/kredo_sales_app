import { fold } from "@/lib/search/normalize"
import type { AccountRow, ContactRow } from "./accounts-contacts-data"

export type AccountsContactsTab = "accounts" | "contacts"

export type AccountsContactsFilters = {
  tab: AccountsContactsTab
  q: string
  includeStatus: string[]
  excludeStatus: string[]
  includePriority: string[]
  excludePriority: string[]
  includeSector: string[]
  excludeSector: string[]
  includeRole: string[]
  excludeRole: string[]
  minScore: number | null
  hasEmail: boolean
  missingEmail: boolean
  hasStudy: boolean
  hasPhone: boolean
}

// URL param keys — kept short and readable.
const KEYS = {
  tab: "tab",
  q: "q",
  includeStatus: "incStatus",
  excludeStatus: "excStatus",
  includePriority: "incPriority",
  excludePriority: "excPriority",
  includeSector: "incSector",
  excludeSector: "excSector",
  includeRole: "incRole",
  excludeRole: "excRole",
  minScore: "minScore",
  hasEmail: "hasEmail",
  missingEmail: "missingEmail",
  hasStudy: "hasStudy",
  hasPhone: "hasPhone",
} as const

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key)
  if (!raw) return []
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean)
}

function readBool(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "1"
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseFilters(params: URLSearchParams): AccountsContactsFilters {
  return {
    tab: params.get(KEYS.tab) === "contacts" ? "contacts" : "accounts",
    q: params.get(KEYS.q)?.trim() ?? "",
    includeStatus: readList(params, KEYS.includeStatus),
    excludeStatus: readList(params, KEYS.excludeStatus),
    includePriority: readList(params, KEYS.includePriority),
    excludePriority: readList(params, KEYS.excludePriority),
    includeSector: readList(params, KEYS.includeSector),
    excludeSector: readList(params, KEYS.excludeSector),
    includeRole: readList(params, KEYS.includeRole),
    excludeRole: readList(params, KEYS.excludeRole),
    minScore: readNumber(params, KEYS.minScore),
    hasEmail: readBool(params, KEYS.hasEmail),
    missingEmail: readBool(params, KEYS.missingEmail),
    hasStudy: readBool(params, KEYS.hasStudy),
    hasPhone: readBool(params, KEYS.hasPhone),
  }
}

export { KEYS as FILTER_KEYS }

function passesIncludeExclude(value: string, include: string[], exclude: string[]): boolean {
  if (include.length > 0 && !include.includes(value)) return false
  if (exclude.length > 0 && exclude.includes(value)) return false
  return true
}

export function filterAccounts(
  accounts: AccountRow[],
  filters: AccountsContactsFilters,
  studyIds: ReadonlySet<string>
): AccountRow[] {
  const needle = fold(filters.q)
  return accounts.filter((account) => {
    if (!passesIncludeExclude(account.status, filters.includeStatus, filters.excludeStatus)) return false
    if (!passesIncludeExclude(account.priority, filters.includePriority, filters.excludePriority)) return false
    if (!passesIncludeExclude(account.sector, filters.includeSector, filters.excludeSector)) return false
    if (filters.minScore !== null && (account.score === null || account.score < filters.minScore)) return false
    if (filters.hasEmail && account.emailCount === 0) return false
    if (filters.missingEmail && account.emailCount > 0) return false
    if (filters.hasStudy && !studyIds.has(account.id)) return false
    if (needle.length > 0) {
      const haystack = fold(
        `${account.name} ${account.sector} ${account.location} ${account.segment} ${account.summary}`
      )
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export function filterContacts(contacts: ContactRow[], filters: AccountsContactsFilters): ContactRow[] {
  const needle = fold(filters.q)
  return contacts.filter((contact) => {
    const role = contact.relationshipRole ?? ""
    if (filters.includeRole.length > 0 && !filters.includeRole.includes(role)) return false
    if (filters.excludeRole.length > 0 && filters.excludeRole.includes(role)) return false
    if (filters.hasEmail && !contact.email) return false
    if (filters.missingEmail && contact.email) return false
    if (filters.hasPhone && !contact.phone) return false
    if (needle.length > 0) {
      const haystack = fold(
        `${contact.fullName} ${contact.email ?? ""} ${contact.jobTitle} ${contact.companyName} ${contact.companySector}`
      )
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}
