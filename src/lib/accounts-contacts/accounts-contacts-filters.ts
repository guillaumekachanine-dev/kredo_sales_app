import { fold } from "@/lib/search/normalize"
import type { AccountRow, ContactRow } from "./accounts-contacts-data"

export type AccountsContactsTab = "overview" | "accounts" | "contacts"

export type SortAccountsValue = "alphabetique" | "activite"

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
  includeRevenue: string[]
  includeSize: string[]
  hasEmail: boolean
  missingEmail: boolean
  hasStudy: boolean
  hasPhone: boolean
  sortAccounts: SortAccountsValue
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
  includeRevenue: "incRevenue",
  includeSize: "incSize",
  hasEmail: "hasEmail",
  missingEmail: "missingEmail",
  hasStudy: "hasStudy",
  hasPhone: "hasPhone",
  sortAccounts: "sortAcc",
} as const

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key)
  if (!raw) return []
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean)
}

function readBool(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "1"
}

function parseSortAccounts(value: string | null): SortAccountsValue {
  if (value === "alphabetique" || value === "activite") return value
  return "alphabetique"
}

export function parseFilters(params: URLSearchParams): AccountsContactsFilters {
  const rawTab = params.get(KEYS.tab)
  const tab: AccountsContactsTab = rawTab === "contacts" ? "contacts" : rawTab === "overview" ? "overview" : "accounts"

  return {
    tab,
    q: params.get(KEYS.q)?.trim() ?? "",
    includeStatus: readList(params, KEYS.includeStatus),
    excludeStatus: readList(params, KEYS.excludeStatus),
    includePriority: readList(params, KEYS.includePriority),
    excludePriority: readList(params, KEYS.excludePriority),
    includeSector: readList(params, KEYS.includeSector),
    excludeSector: readList(params, KEYS.excludeSector),
    includeRole: readList(params, KEYS.includeRole),
    excludeRole: readList(params, KEYS.excludeRole),
    includeRevenue: readList(params, KEYS.includeRevenue),
    includeSize: readList(params, KEYS.includeSize),
    hasEmail: readBool(params, KEYS.hasEmail),
    missingEmail: readBool(params, KEYS.missingEmail),
    hasStudy: readBool(params, KEYS.hasStudy),
    hasPhone: readBool(params, KEYS.hasPhone),
    sortAccounts: parseSortAccounts(params.get(KEYS.sortAccounts)),
  }
}

export { KEYS as FILTER_KEYS }

function passesIncludeExclude(value: string, include: string[], exclude: string[]): boolean {
  if (include.length > 0 && !include.includes(value)) return false
  if (exclude.length > 0 && exclude.includes(value)) return false
  return true
}

function parseRevenueToMillions(revenueStr: string | null): number | null {
  if (!revenueStr) return null
  const cleaned = revenueStr.replace(/\s+/g, "").replace(",", ".").toLowerCase()
  if (cleaned.includes("mds") || cleaned.includes("billion") || cleaned.includes("milliard")) {
    const num = parseFloat(cleaned)
    if (Number.isFinite(num)) {
      return num * 1000
    }
  }
  const num = parseFloat(cleaned)
  if (Number.isFinite(num)) {
    return num
  }
  return null
}

export function filterAccounts(
  accounts: AccountRow[],
  filters: AccountsContactsFilters,
  studyIds: ReadonlySet<string>,
  contactsByAccountId?: Map<string, ContactRow[]>
): AccountRow[] {
  const needle = fold(filters.q)
  return accounts.filter((account) => {
    if (!passesIncludeExclude(account.status, filters.includeStatus, filters.excludeStatus)) return false
    if (!passesIncludeExclude(account.priority, filters.includePriority, filters.excludePriority)) return false
    if (!passesIncludeExclude(account.sector, filters.includeSector, filters.excludeSector)) return false
    if (filters.hasEmail && account.emailCount === 0) return false
    if (filters.missingEmail && account.emailCount > 0) return false
    if (filters.hasStudy && !studyIds.has(account.id)) return false
    
    // Revenue Filter (Chiffre d'affaires)
    if (filters.includeRevenue.length > 0) {
      const rev = parseRevenueToMillions(account.revenue)
      if (rev === null) {
        return false
      } else {
        const matches = filters.includeRevenue.some((range) => {
          if (range === "0-100M€") return rev >= 0 && rev <= 100
          if (range === "100-300M€") return rev > 100 && rev <= 300
          if (range === "300-500M€") return rev > 300 && rev <= 500
          if (range === "500-999M€") return rev > 500 && rev <= 999
          if (range === "+1Mds") return rev >= 1000
          return false
        })
        if (!matches) return false
      }
    }

    // Size Filter (employee count)
    if (filters.includeSize.length > 0) {
      const count = account.employeeCount
      if (count === null) {
        return false
      } else {
        const matches = filters.includeSize.some((range) => {
          if (range === "1-50") return count >= 1 && count <= 50
          if (range === "50-200") return count > 50 && count <= 200
          if (range === "201-500") return count > 200 && count <= 500
          if (range === "501-1000") return count > 500 && count <= 1000
          if (range === "1000-2000") return count > 1000 && count <= 2000
          if (range === "2000-5000") return count > 2000 && count <= 5000
          if (range === "+5k") return count > 5000
          return false
        })
        if (!matches) return false
      }
    }

    if (needle.length > 0) {
      // Collect search string from all contacts associated with this account
      let contactHaystack = ""
      if (contactsByAccountId) {
        const accountContacts = contactsByAccountId.get(account.id)
        if (accountContacts && accountContacts.length > 0) {
          contactHaystack = accountContacts
            .map((c) => `${c.fullName} ${c.email ?? ""} ${c.phone ?? ""} ${c.jobTitle ?? ""} ${c.relationshipRole ?? ""}`)
            .join(" ")
        }
      }

      const haystack = fold(
        `${account.name} ${account.sector} ${account.location ?? ""} ${account.segment ?? ""} ${account.summary ?? ""} ${account.description ?? ""} ${account.tier ?? ""} ${account.status ?? ""} ${account.priority ?? ""} ${account.revenue ?? ""} ${account.website ?? ""} ${contactHaystack}`
      )
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export function matchContactByQuery(
  contact: ContactRow,
  query: string,
  parentAcc?: AccountRow
): boolean {
  const needle = fold(query)
  if (!needle) return true

  let accountHaystack = ""
  if (parentAcc) {
    accountHaystack = `${parentAcc.name} ${parentAcc.sector} ${parentAcc.location ?? ""} ${parentAcc.segment ?? ""} ${parentAcc.tier ?? ""} ${parentAcc.status ?? ""} ${parentAcc.priority ?? ""} ${parentAcc.revenue ?? ""} ${parentAcc.website ?? ""}`
  }

  const haystack = fold(
    `${contact.fullName} ${contact.firstName ?? ""} ${contact.lastName ?? ""} ${contact.email ?? ""} ${contact.phone ?? ""} ${contact.jobTitle ?? ""} ${contact.relationshipRole ?? ""} ${contact.companyName} ${contact.companySector} ${accountHaystack}`
  )

  return haystack.includes(needle)
}

export function filterContacts(
  contacts: ContactRow[],
  filters: AccountsContactsFilters,
  accountsById?: Map<string, AccountRow>
): ContactRow[] {
  return contacts.filter((contact) => {
    const role = contact.relationshipRole ?? ""
    if (filters.includeRole.length > 0 && !filters.includeRole.includes(role)) return false
    if (filters.excludeRole.length > 0 && filters.excludeRole.includes(role)) return false
    if (filters.hasEmail && !contact.email) return false
    if (filters.missingEmail && contact.email) return false
    if (filters.hasPhone && !contact.phone) return false
    
    if (filters.q.trim().length > 0) {
      const parentAcc = accountsById && contact.companyId ? accountsById.get(contact.companyId) : undefined
      if (!matchContactByQuery(contact, filters.q, parentAcc)) return false
    }
    return true
  })
}
