"use client"

import { create } from "zustand"
import type { MobileAccountLookupEntry } from "@/lib/accounts-contacts/mobile-account-lookup"
import {
  readMobilePriorityAccountIds,
  toggleMobilePriorityAccountId,
  writeMobilePriorityAccountIds,
} from "@/lib/accounts-contacts/mobile-account-custom-list"

export type MobileAccountQuickSearchPreset = "list" | "custom" | "campaign" | "news"

type LoadStatus = "idle" | "loading" | "ready" | "error"

interface MobileAccountQuickSearchState {
  isOpen: boolean
  query: string
  preset: MobileAccountQuickSearchPreset
  entries: MobileAccountLookupEntry[]
  pinnedIds: string[]
  loadStatus: LoadStatus
  errorMessage: string | null
  open: (preset?: MobileAccountQuickSearchPreset) => void
  close: () => void
  setQuery: (query: string) => void
  setPreset: (preset: MobileAccountQuickSearchPreset) => void
  ensureEntries: () => Promise<void>
  hydratePinnedIds: () => void
  togglePinnedAccount: (accountId: string) => "added" | "removed" | "limit"
}

function getDefaultPreset(pinnedIds: string[]): MobileAccountQuickSearchPreset {
  return pinnedIds.length > 0 ? "custom" : "list"
}

export const useMobileAccountQuickSearch = create<MobileAccountQuickSearchState>((set, get) => ({
  isOpen: false,
  query: "",
  preset: "list",
  entries: [],
  pinnedIds: [],
  loadStatus: "idle",
  errorMessage: null,

  open: (preset) => {
    get().hydratePinnedIds()
    const pinnedIds = get().pinnedIds

    set({
      isOpen: true,
      query: "",
      preset: preset ?? getDefaultPreset(pinnedIds),
      errorMessage: null,
    })

    void get().ensureEntries()
  },

  close: () => {
    set({ isOpen: false, query: "", errorMessage: null })
  },

  setQuery: (query) => set({ query }),
  setPreset: (preset) => set({ preset }),

  hydratePinnedIds: () => {
    set({ pinnedIds: readMobilePriorityAccountIds() })
  },

  ensureEntries: async () => {
    const { loadStatus } = get()
    if (loadStatus === "loading" || loadStatus === "ready") return

    set({ loadStatus: "loading", errorMessage: null })

    try {
      const response = await fetch("/api/prospection/accounts/mobile-lookup", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = (await response.json()) as { accounts?: MobileAccountLookupEntry[] }

      set({
        entries: payload.accounts ?? [],
        loadStatus: "ready",
        errorMessage: null,
      })
    } catch (error) {
      console.error("[mobile-account-quick-search] failed to fetch entries", error)
      set({
        loadStatus: "error",
        errorMessage: "Impossible de charger les comptes.",
      })
    }
  },

  togglePinnedAccount: (accountId) => {
    const result = toggleMobilePriorityAccountId(get().pinnedIds, accountId)
    if (result.status === "limit") return "limit"

    writeMobilePriorityAccountIds(result.nextIds)
    set({ pinnedIds: result.nextIds })
    return result.status
  },
}))

export function openMobileAccountQuickSearch(preset?: MobileAccountQuickSearchPreset) {
  useMobileAccountQuickSearch.getState().open(preset)
}
