"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SectionTab } from "@/lib/navigation/main-menu.config"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  SectionNavBar — barre d'onglets de routing intra-module
//
//  Rendu en haut de chaque module, au-dessus du SectionTabBar (record tabs).
//  Reçoit les tabs depuis getModuleTabs() dans le layout du module.
//
//  Hiérarchie visuelle :
//    AppHeader            (layout global)
//    ─────────────────────
//    SectionNavBar   ← routing : Vue d'ensemble / Actives / Opps / Planning
//    ─────────────────────
//    SectionTabBar   ← record tabs : fiches ouvertes (missions uniquement)
//    ─────────────────────
//    Contenu de page
// ─────────────────────────────────────────────────────────────────────────────

interface SectionNavBarProps {
  tabs: SectionTab[]
}

export function SectionNavBar({ tabs }: SectionNavBarProps) {
  const pathname = usePathname()

  if (tabs.length === 0) return null

  return (
    <div className="bg-canvas border-b border-border flex items-stretch shrink-0 overflow-x-auto scrollbar-none select-none px-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const isClickable = !tab.disabled && !tab.comingSoon

        const baseClasses = cn(
          "flex items-center gap-2 px-1 h-10 text-xs font-medium whitespace-nowrap transition-all duration-150 relative shrink-0",
          "border-b-2 -mb-px mr-5 last:mr-0",
          isActive
            ? "text-primary border-primary font-semibold"
            : "text-muted border-transparent hover:text-heading hover:border-border",
          !isClickable && "opacity-40 cursor-not-allowed pointer-events-none"
        )

        const content = (
          <>
            <span>{tab.label}</span>
            {tab.comingSoon && (
              <span className="text-[8px] font-bold text-muted/80 bg-border/60 px-1 py-0.5 rounded uppercase tracking-wider">
                Bientôt
              </span>
            )}
          </>
        )

        if (isClickable) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={baseClasses}
              aria-current={isActive ? "page" : undefined}
            >
              {content}
            </Link>
          )
        }

        return (
          <div key={tab.href} className={baseClasses}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
