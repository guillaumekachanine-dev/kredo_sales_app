import { describe, expect, it } from "vitest"
import {
  MOBILE_PRIORITY_ACCOUNT_LIMIT,
  extractMobilePriorityAccountIdsFromUiPrefs,
  mergeMobilePriorityAccountIdsIntoUiPrefs,
  sanitizeMobilePriorityAccountIds,
  toggleMobilePriorityAccountId,
} from "@/lib/accounts-contacts/mobile-account-custom-list"

describe("mobile account custom list helpers", () => {
  it("sanitizes ids by trimming, deduplicating, and enforcing the limit", () => {
    const input = [
      " company-1 ",
      "company-2",
      "company-1",
      "",
      ...Array.from({ length: MOBILE_PRIORITY_ACCOUNT_LIMIT + 3 }, (_, index) => `company-${index + 3}`),
    ]

    expect(sanitizeMobilePriorityAccountIds(input)).toEqual([
      "company-1",
      "company-2",
      "company-3",
      "company-4",
      "company-5",
      "company-6",
      "company-7",
      "company-8",
      "company-9",
      "company-10",
    ])
  })

  it("reads pinned ids from profile ui_prefs", () => {
    const uiPrefs = {
      theme: "light",
      mobile_account_quick_search: {
        pinned_company_ids: [" account-a ", "account-b", "account-a"],
      },
    }

    expect(extractMobilePriorityAccountIdsFromUiPrefs(uiPrefs)).toEqual(["account-a", "account-b"])
  })

  it("merges pinned ids without dropping unrelated preferences", () => {
    const uiPrefs = {
      theme: "light",
      mobile_account_quick_search: {
        last_query: "acme",
      },
    }

    expect(mergeMobilePriorityAccountIdsIntoUiPrefs(uiPrefs, ["account-a"])).toEqual({
      theme: "light",
      mobile_account_quick_search: {
        last_query: "acme",
        pinned_company_ids: ["account-a"],
      },
    })
  })

  it("removes an already pinned id and blocks additions past the limit", () => {
    expect(toggleMobilePriorityAccountId(["account-a", "account-b"], "account-a")).toEqual({
      nextIds: ["account-b"],
      status: "removed",
    })

    const fullList = Array.from({ length: MOBILE_PRIORITY_ACCOUNT_LIMIT }, (_, index) => `account-${index}`)
    expect(toggleMobilePriorityAccountId(fullList, "account-overflow")).toEqual({
      nextIds: fullList,
      status: "limit",
    })
  })
})
