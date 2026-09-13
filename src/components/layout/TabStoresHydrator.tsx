"use client"

import { useEffect } from "react"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { useEngagementsTabStore, useOpportunitiesTabStore } from "@/lib/tabs/missions-tab-store"

// Réhydrate les stores d'onglets persistés APRÈS le premier rendu client, pour que
// celui-ci reproduise exactement le rendu serveur (audit d'ouverture des pages, O-4 —
// voir `createTabStore`). Sans rendu : un effet, monté une fois dans AppShell.
export function TabStoresHydrator() {
  useEffect(() => {
    for (const store of [useCrmTabStore, useEngagementsTabStore, useOpportunitiesTabStore]) {
      if (!store.persist.hasHydrated()) void store.persist.rehydrate()
    }
  }, [])

  return null
}
