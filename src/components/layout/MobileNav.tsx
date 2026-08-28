"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getMobileTabsForPath } from "@/lib/navigation/main-menu.config"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileSectionRail } from "./MobileSectionRail"
import { MobileNavigationMenu, type MenuItemId } from "./MobileNavigationMenu"
import {
  useMobileNavigationHistory,
  useMobileNavigationHistoryStore,
} from "@/hooks/use-mobile-navigation-history"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileNav — coquille de navigation mobile (point d'entrée unique)
//
//  Détient l'état d'ouverture du rail, du menu complet et du sous-module déployé,
//  les synchronise avec l'historique mobile (restauration d'état UI exact),
//  et contrôle les 5 boutons de la bottom nav.
// ─────────────────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname()
  const [isRailOpen, setRailOpen] = useState(false)
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [expandedMenuId, setExpandedMenuId] = useState<MenuItemId | null>(null)

  const { canGoBack, canGoForward, goBack, goForward } = useMobileNavigationHistory()
  const registerShellProvider = useMobileNavigationHistoryStore((s) => s.registerShellProvider)
  const isNavigatingHistory = useMobileNavigationHistoryStore((s) => s.isNavigatingHistory)

  const clickableTabs = getMobileTabsForPath(pathname)
  const activeHasRail = clickableTabs.length > 1

  function closeMenu() {
    setMenuOpen(false)
    setExpandedMenuId(null)
  }

  // Enregistrement du provider de capture / restauration pour le shell
  useEffect(() => {
    return registerShellProvider({
      getShellState: () => ({
        menuOpen: isMenuOpen,
        railOpen: isRailOpen,
        expandedMenuId,
      }),
      applyShellState: (state) => {
        setMenuOpen(state.menuOpen)
        setRailOpen(state.railOpen)
        setExpandedMenuId(state.expandedMenuId as MenuItemId | null)
      },
    })
  }, [isMenuOpen, isRailOpen, expandedMenuId, registerShellProvider])

  // Ferme le rail et le menu à tout changement de route standard (hors transition d'historique)
  useEffect(() => {
    if (isNavigatingHistory) return

    const timeout = window.setTimeout(() => {
      setRailOpen(false)
      setMenuOpen(false)
      setExpandedMenuId(null)
    }, 0)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [pathname, isNavigatingHistory])

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
        onMenuToggle={() => {
          setMenuOpen((open) => {
            if (open) setExpandedMenuId(null)
            return !open
          })
        }}
        onMenuDismiss={closeMenu}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={goBack}
        onGoForward={goForward}
      />
      <MobileNavigationMenu
        isOpen={isMenuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open)
          if (!open) setExpandedMenuId(null)
        }}
        expandedId={expandedMenuId}
        onExpandedChange={setExpandedMenuId}
      />
    </>
  )
}
