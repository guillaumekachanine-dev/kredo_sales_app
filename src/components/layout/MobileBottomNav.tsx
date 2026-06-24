"use client"

import Link from "next/link"
import { MainMenuItem, mainMenuItems, getActiveModuleHref } from "@/lib/navigation/main-menu.config"
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
  const activeHref = getActiveModuleHref(pathname)

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] flex h-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom))] items-center justify-around border-t border-white/12 bg-[var(--color-bg-mobile-nav)] px-2 pb-[var(--safe-area-bottom)]"
    >
      {primaryNavItems.map((item) => {
        const href = item.href!
        const isActive = href === activeHref
        const togglesRail = isActive && activeHasRail

        const inner = (
          <>
            <div
              className={cn(
                "rounded-[var(--radius-medium)] p-1.5 transition-[background-color,color] duration-[var(--motion-duration-fast)]",
                isActive ? "bg-white/14 text-primary-fg" : "text-primary-fg/72"
              )}
            >
              {item.icon && getNavigationIcon(item.icon)}
            </div>
            <span className="max-w-full truncate text-[10px] tracking-tight">
              {item.shortLabel ?? item.label}
            </span>
          </>
        )

        const className = cn(
          "flex h-full min-h-[var(--layout-mobile-tap-target)] flex-1 flex-col items-center justify-center gap-1 px-1 text-center",
          "transition-[color,opacity] duration-[var(--motion-duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
          isActive ? "font-semibold text-primary-fg" : "text-primary-fg/72 hover:text-primary-fg"
        )

        if (togglesRail) {
          return (
            <button
              key={href}
              type="button"
              onClick={onActiveModulePress}
              aria-label={item.label}
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
            aria-label={item.label}
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
