"use client"

import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"

export type CrmLauncherDestination = "cockpit" | "contacts" | "opportunities"

/**
 * Hook personnalisé unique pour centraliser l'action d'ouverture d'un compte CRM
 * en fonction de la destination choisie ("cockpit" | "contacts" | "opportunities").
 */
export function useOpenCrmAccount() {
  const { openTab: openCrmTab } = useCrmTabStore()
  const { openCompany: openCompanyDrawer } = useCrmDrawer()

  return ({
    companyId,
    companyName,
    destination,
  }: {
    companyId: string
    companyName: string
    destination: CrmLauncherDestination
  }) => {
    if (destination === "cockpit") {
      // 1. Ouvrir le cockpit intelligence du compte dans un nouvel onglet CRM
      openCrmTab({
        entityType: "company-intelligence",
        entityId: companyId,
        title: companyName,
      })
    } else if (destination === "contacts") {
      // 2. Ouvrir le drawer d'identité du compte
      openCompanyDrawer(companyId)
    } else if (destination === "opportunities") {
      // 3. Fallback : Ouvrir le drawer d'identité du compte car il n'existe pas de
      // sous-onglet direct ou de drawer dédié uniquement aux opportunités d'une entreprise.
      console.log(`[useOpenCrmAccount] Fallback opportunities -> ouverture drawer compte pour ${companyName} (${companyId})`)
      openCompanyDrawer(companyId)
    }
  }
}
