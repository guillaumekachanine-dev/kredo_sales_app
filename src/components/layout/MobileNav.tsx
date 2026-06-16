"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getSectionTabsForPath } from "@/lib/navigation/main-menu.config"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileSectionRail } from "./MobileSectionRail"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileNav — coquille de navigation mobile (point d'entrée unique)
//
//  Détient l'état d'ouverture du rail et le partage entre la bottom nav (qui le
//  toggle) et le rail (qui l'affiche). Résout les onglets du module actif via
//  getSectionTabsForPath(pathname) — pas de prop-drilling à travers les layouts.
//
//  Le rail ne propose que les onglets RÉELLEMENT navigables (on filtre les
//  `comingSoon`/`disabled`) : mobile = action, pas une liste de « Bientôt »
//  grisés. Il n'apparaît donc que là où il existe ≥ 2 destinations vivantes.
// ─────────────────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname()
  const [isRailOpen, setRailOpen] = useState(false)

  const clickableTabs = getSectionTabsForPath(pathname).filter(
    (tab) => !tab.disabled && !tab.comingSoon
  )
  const activeHasRail = clickableTabs.length > 1

  // Ferme le rail à tout changement de route — couvre la sélection d'un onglet
  // ET le retour navigateur. La fermeture immédiate sur sélection est aussi
  // gérée par onSelect (ceinture + bretelles, pour le ressenti).
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRailOpen(false)
    }, 0)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [pathname])

  return (
    <>
      {isRailOpen && activeHasRail ? (
        <MobileSectionRail
          tabs={clickableTabs}
          pathname={pathname}
          onSelect={() => setRailOpen(false)}
          onDismiss={() => setRailOpen(false)}
        />
      ) : null}
      <MobileBottomNav
        pathname={pathname}
        isRailOpen={isRailOpen}
        activeHasRail={activeHasRail}
        onActiveModulePress={() => setRailOpen((open) => !open)}
      />
    </>
  )
}
