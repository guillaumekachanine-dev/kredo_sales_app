"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getSectionTabsForPath, SectionTab } from "@/lib/navigation/main-menu.config"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileSectionRail } from "./MobileSectionRail"
import { MobileNavigationMenu } from "./MobileNavigationMenu"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileNav — coquille de navigation mobile (point d'entrée unique)
//
//  Détient l'état d'ouverture du rail et du drawer de navigation complet,
//  et les partage entre la bottom nav, le rail et le drawer.
// ─────────────────────────────────────────────────────────────────────────────

export function getMobileTabsForPath(pathname: string): SectionTab[] {
  if (pathname.startsWith("/prospection")) {
    return getSectionTabsForPath(pathname)
  }
  if (pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")) {
    return [
      { label: "Besoins & Staffing", shortLabel: "Besoins", href: "/missions/opps" },
      { label: "Recrutement", shortLabel: "Recrutement", href: "/recruitment" },
    ]
  }
  if (pathname.startsWith("/reports") || pathname.startsWith("/veille")) {
    return [
      { label: "Rapports & Rédaction", shortLabel: "Rapports", href: "/reports" },
      { label: "Veille & Actualités", shortLabel: "Veille", href: "/veille" },
    ]
  }
  return getSectionTabsForPath(pathname).filter(
    (tab) => !tab.disabled && !tab.comingSoon
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [isRailOpen, setRailOpen] = useState(false)
  const [isMenuOpen, setMenuOpen] = useState(false)

  const clickableTabs = getMobileTabsForPath(pathname)
  const activeHasRail = clickableTabs.length > 1

  // Ferme le rail et le menu à tout changement de route
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRailOpen(false)
      setMenuOpen(false)
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
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />
      <MobileNavigationMenu isOpen={isMenuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
