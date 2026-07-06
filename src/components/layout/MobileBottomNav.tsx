"use client"

import Link from "next/link"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileBottomNav — Barre de navigation mobile fixe (menu central)
//
//  Affiche en permanence dans l'ordre exact :
//    1. Cockpit
//    2. CRM
//    3. Menu        (ouvre le menu complet)
//    4. Staffing
//    5. Intelligence
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
      id: "cockpit",
      label: "Cockpit",
      icon: "cockpit",
      isActive: pathname.startsWith("/cockpit"),
      href: "/cockpit",
      type: "link" as const,
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
      id: "menu",
      label: "Menu",
      icon: "navigation",
      isActive: isMenuOpen,
      onClick: onMenuToggle,
      type: "button" as const,
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
        const isMenuButton = btn.id === "menu"

        const inner = (
          <>
            <div
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-[var(--radius-medium)] transition-[background-color,color] duration-[var(--motion-duration-fast)]",
                isMenuButton
                  ? "text-primary"
                  : isActive
                    ? "text-primary-fg"
                    : "text-primary-fg/72"
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
          "flex min-h-[var(--layout-mobile-tap-target)] flex-1 flex-col items-center justify-center gap-1 px-1 text-center select-none",
          "transition-[color,opacity,transform,background-color,box-shadow] duration-[var(--motion-duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
          isMenuButton
            ? "relative -mt-5 h-[4.125rem] max-w-[4.375rem] rounded-[var(--radius-medium)] bg-gradient-to-b from-surface to-surface-hover font-semibold text-primary shadow-[0_16px_30px_-18px_rgba(0,0,0,0.48)] [box-shadow:0_16px_30px_-18px_rgba(0,0,0,0.48),inset_0_-3px_0_rgba(200,154,43,0.74)]"
            : "h-full",
          !isMenuButton && (isActive ? "font-semibold text-primary-fg" : "text-primary-fg/72 hover:text-primary-fg")
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
