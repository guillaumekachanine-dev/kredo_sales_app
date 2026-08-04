"use client"

import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import { useCrmDrawer } from "@/hooks/use-crm-drawer"
import { usePathname, useRouter } from "next/navigation"

export type CrmLauncherDestination = "cockpit" | "contacts" | "opportunities"

/**
 * Hook personnalisé unique pour centraliser l'action d'ouverture d'un compte CRM
 * en fonction de la destination choisie ("cockpit" | "contacts" | "opportunities").
 */
export function useOpenCrmAccount() {
  const { openTab: openCrmTab } = useCrmTabStore()
  const { openCompany: openCompanyDrawer } = useCrmDrawer()
  const pathname = usePathname()
  const router = useRouter()

  return ({
    companyId,
    companyName,
    destination,
  }: {
    companyId: string
    companyName: string
    destination: CrmLauncherDestination
  }) => {
    const isIntelligencePage =
      pathname.startsWith("/intelligence") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/veille")

    if (isIntelligencePage) {
      // 1. Ouvrir le cockpit intelligence du compte dans un nouvel onglet CRM
      openCrmTab({
        entityType: "company-intelligence",
        entityId: companyId,
        title: companyName,
      })
      // 2. Renvoyer vers la page CRM & Prospection
      router.push("/prospection/accounts")
    } else {
      if (destination === "cockpit") {
        // 1. Ouvrir le cockpit intelligence du compte dans un nouvel onglet CRM
        openCrmTab({
          entityType: "company-intelligence",
          entityId: companyId,
          title: companyName,
        })
        if (!pathname.startsWith("/prospection")) {
          router.push("/prospection/accounts")
        }
      } else if (destination === "contacts") {
        // 2. Ouvrir le drawer d'identité du compte
        openCompanyDrawer(companyId)
      } else if (destination === "opportunities") {
        // 3. Fallback : Ouvrir le drawer d'identité du compte car il n'existe pas de
        // sous-onglet direct ou de drawer dédié uniquement aux opportunités d'une entreprise.
        openCompanyDrawer(companyId)
      }
    }
  }
}
