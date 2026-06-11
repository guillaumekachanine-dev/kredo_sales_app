"use client"

import Link from "next/link"
import { MainMenuItem, mainMenuItems } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileBottomNav — dérivée du config, modules marqués `primary: true`
//
//  Source unique : main-menu.config.ts · Affiche `shortLabel` sinon `label`.
//  Fond bleu de marque (`bg-primary`), contenu blanc — miroir de la sidebar
//  desktop. Présentationnel : piloté par MobileNav (pathname + rail).
//
//  Sémantique du tap :
//    · module inactif            → navigation (<Link>)
//    · module actif AVEC rail    → toggle du rail (<button>)
//    · module actif SANS rail    → navigation (<Link>, no-op vers lui-même)
// ─────────────────────────────────────────────────────────────────────────────

function collectPrimaryItems(items: MainMenuItem[]): MainMenuItem[] {
  const result: MainMenuItem[] = []
  for (const item of items) {
    if (item.primary && item.href) {
      result.push(item)
    }
    if (item.items) {
      result.push(...collectPrimaryItems(item.items))
    }
  }
  return result
}

const primaryNavItems = collectPrimaryItems(mainMenuItems)

interface MobileBottomNavProps {
  pathname: string
  isRailOpen: boolean
  /** Le module actif possède-t-il un rail d'onglets cliquables ? */
  activeHasRail: boolean
  onActiveModulePress: () => void
}

export function MobileBottomNav({
  pathname,
  isRailOpen,
  activeHasRail,
  onActiveModulePress,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-primary border-t border-white/10 flex items-center justify-around px-2 z-50">
      {primaryNavItems.map((item) => {
        const href = item.href!
        const isActive = pathname === href || pathname.startsWith(href + "/")
        const togglesRail = isActive && activeHasRail

        const inner = (
          <>
            <div
              className={cn(
                "p-1 rounded-md transition-colors",
                isActive ? "bg-white/10 text-primary-fg" : "text-primary-fg/60"
              )}
            >
              {item.icon && getNavigationIcon(item.icon)}
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-full">
              {item.shortLabel ?? item.label}
            </span>
          </>
        )

        const className = cn(
          "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 transition-all duration-150 active:scale-95 text-center px-1",
          isActive ? "text-primary-fg font-semibold" : "text-primary-fg/60 hover:text-primary-fg"
        )

        if (togglesRail) {
          return (
            <button
              key={href}
              type="button"
              onClick={onActiveModulePress}
              aria-current="page"
              aria-expanded={isRailOpen}
              className={className}
            >
              {inner}
            </button>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={className}
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
