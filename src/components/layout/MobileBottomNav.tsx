"use client"

import Link from "next/link"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileBottomNav — Barre de navigation mobile fixe (4 boutons principaux)
//
//  Affiche en permanence dans l'ordre exact :
//    1. Navigation  (ouvre le menu complet)
//    2. CRM         (vers /prospection)
//    3. Staffing    (vers /missions/opps)
//    4. Intelligence (vers /reports)
//
//  Sémantique du tap :
//    · Navigation                → toggle le menu complet via callback
//    · Module inactif            → navigation (<Link>)
//    · Module actif avec rail    → toggle du rail (<button>)
// ─────────────────────────────────────────────────────────────────────────────

interface MobileBottomNavProps {
  pathname: string
  isRailOpen: boolean
  /** Le module actif possède-t-il un rail d'onglets cliquables ? */
  activeHasRail: boolean
  onActiveModulePress: () => void
  isMenuOpen: boolean
  onMenuToggle: () => void
}

export function MobileBottomNav({
  pathname,
  isRailOpen,
  activeHasRail,
  onActiveModulePress,
  isMenuOpen,
  onMenuToggle,
}: MobileBottomNavProps) {
  const buttons = [
    {
      id: "navigation",
      label: "Navigation",
      icon: "navigation",
      isActive: isMenuOpen,
      onClick: onMenuToggle,
      type: "button" as const,
    },
    {
      id: "crm",
      label: "CRM",
      icon: "crm",
      isActive: pathname.startsWith("/prospection"),
      href: "/prospection",
      type: "link" as const,
    },
    {
      id: "staffing",
      label: "Staffing",
      icon: "staffing",
      isActive: pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment"),
      href: "/missions/opps",
      type: "link" as const,
    },
    {
      id: "intelligence",
      label: "Intelligence",
      icon: "reports",
      isActive: pathname.startsWith("/reports") || pathname.startsWith("/veille"),
      href: "/reports",
      type: "link" as const,
    },
  ]

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] flex h-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom))] items-center justify-around border-t border-white/12 bg-[var(--color-bg-mobile-nav)] px-2 pb-[var(--safe-area-bottom)]"
    >
      {buttons.map((btn) => {
        const isActive = btn.isActive
        const togglesRail = btn.type === "link" && isActive && activeHasRail

        const inner = (
          <>
            <div
              className={cn(
                "rounded-[var(--radius-medium)] p-1.5 transition-[background-color,color] duration-[var(--motion-duration-fast)]",
                isActive ? "bg-white/14 text-primary-fg" : "text-primary-fg/72"
              )}
            >
              {getNavigationIcon(btn.icon)}
            </div>
            <span className="max-w-full truncate text-[10px] tracking-tight">
              {btn.label}
            </span>
          </>
        )

        const className = cn(
          "flex h-full min-h-[var(--layout-mobile-tap-target)] flex-1 flex-col items-center justify-center gap-1 px-1 text-center select-none",
          "transition-[color,opacity] duration-[var(--motion-duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
          isActive ? "font-semibold text-primary-fg" : "text-primary-fg/72 hover:text-primary-fg"
        )

        if (btn.type === "button") {
          return (
            <button
              key={btn.id}
              type="button"
              onClick={btn.onClick}
              aria-label={btn.label}
              aria-current={isActive ? "page" : undefined}
              aria-expanded={isMenuOpen}
              className={className}
            >
              {inner}
            </button>
          )
        }

        if (togglesRail) {
          return (
            <button
              key={btn.id}
              type="button"
              onClick={onActiveModulePress}
              aria-label={btn.label}
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
            key={btn.id}
            href={btn.href!}
            aria-label={btn.label}
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
