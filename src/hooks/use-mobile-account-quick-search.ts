"use client"

import { create } from "zustand"
import type { MobileAccountLookupEntry } from "@/lib/accounts-contacts/mobile-account-lookup"
import {
  fetchPersistedMobilePriorityAccountIds,
  persistMobilePriorityAccountIds,
  readMobilePriorityAccountIds,
  sanitizeMobilePriorityAccountIds,
  toggleMobilePriorityAccountId,
  writeMobilePriorityAccountIds,
} from "@/lib/accounts-contacts/mobile-account-custom-list"

export type MobileAccountQuickSearchPreset = "list" | "custom" | "campaign" | "news"

type LoadStatus = "idle" | "loading" | "ready" | "error"
type TogglePinnedAccountResult = "added" | "removed" | "limit" | "error"

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
  syncPinnedIds: () => Promise<void>
  togglePinnedAccount: (accountId: string) => Promise<TogglePinnedAccountResult>
}

function getDefaultPreset(): MobileAccountQuickSearchPreset {
  return "custom"
}

export const useMobileAccountQuickSearch = create<MobileAccountQuickSearchState>((set, get) => ({
  isOpen: false,
  query: "",
  preset: "custom",
  entries: [],
  pinnedIds: [],
  loadStatus: "idle",
  errorMessage: null,

  open: (preset) => {
    get().hydratePinnedIds()

    set({
      isOpen: true,
      query: "",
      preset: preset ?? getDefaultPreset(),
      errorMessage: null,
    })

    void get().syncPinnedIds()
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

  syncPinnedIds: async () => {
    get().hydratePinnedIds()

    try {
      const pinnedIds = await fetchPersistedMobilePriorityAccountIds()
      set({ pinnedIds, errorMessage: null })
    } catch (error) {
      console.error("[mobile-account-quick-search] failed to sync pinned ids", error)
    }
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

      const payload = (await response.json()) as {
        accounts?: MobileAccountLookupEntry[]
        pinnedIds?: unknown
      }
      const pinnedIds = sanitizeMobilePriorityAccountIds(payload.pinnedIds)

      if (pinnedIds.length > 0 || get().pinnedIds.length > 0) {
        writeMobilePriorityAccountIds(pinnedIds)
      }

      set({
        entries: payload.accounts ?? [],
        pinnedIds,
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

  togglePinnedAccount: async (accountId) => {
    const previousIds = get().pinnedIds
    const result = toggleMobilePriorityAccountId(get().pinnedIds, accountId)
    if (result.status === "limit") return "limit"

    writeMobilePriorityAccountIds(result.nextIds)
    set({ pinnedIds: result.nextIds })

    try {
      const persistedIds = await persistMobilePriorityAccountIds(result.nextIds)
      set({ pinnedIds: persistedIds })
      return result.status
    } catch (error) {
      console.error("[mobile-account-quick-search] failed to persist pinned ids", error)
      writeMobilePriorityAccountIds(previousIds)
      set({ pinnedIds: previousIds })
      return "error"
    }
  },
}))

export function openMobileAccountQuickSearch(preset?: MobileAccountQuickSearchPreset) {
  useMobileAccountQuickSearch.getState().open(preset)
}
