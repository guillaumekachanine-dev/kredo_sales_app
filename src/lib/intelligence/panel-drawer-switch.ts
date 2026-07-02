"use client"

import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"

// Le panneau Cockpit Intelligence peut ouvrir deux familles de drawers
// globaux distincts (EventDrawer, CrmIdentityDrawerHost) qui sont chacun
// leur propre <dialog>. Les ouvrir simultanément empilerait deux backdrops.
// Quand on bascule de l'un à l'autre : on ferme le premier, on laisse sa
// sortie (.kredo-drawer-out-*, 0.26s dans globals.css) se jouer, puis on
// ouvre le second — un repli/dépliage rapide plutôt qu'un empilement brut.
const DRAWER_SWITCH_DELAY_MS = 260

export function openEventFromIntelligencePanel(eventId: string) {
  const crmTarget = useCrmDrawer.getState().target
  if (crmTarget) {
    // Fermeture ferme, sans suivre la logique "returnTo" (on change de
    // famille de drawer, on ne revient pas en arrière dans la même famille).
    useCrmDrawer.setState({ target: null })
    window.setTimeout(() => {
      useEventDrawerStore.getState().openEventDrawer(eventId)
    }, DRAWER_SWITCH_DELAY_MS)
    return
  }
  useEventDrawerStore.getState().openEventDrawer(eventId)
}

export function openContactFromIntelligencePanel(contactId: string) {
  if (useEventDrawerStore.getState().isOpen) {
    useEventDrawerStore.getState().closeEventDrawer()
    window.setTimeout(() => {
      useCrmDrawer.getState().openContact(contactId)
    }, DRAWER_SWITCH_DELAY_MS)
    return
  }
  useCrmDrawer.getState().openContact(contactId)
}
