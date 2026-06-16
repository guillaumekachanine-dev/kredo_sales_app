"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SectionTab } from "@/lib/navigation/main-menu.config"
import { cn } from "@/lib/utils"
import { sectionTabItemClasses, sectionTabListClasses } from "./section-tab-styles"

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
    <nav
      aria-label="Navigation de section"
      className={sectionTabListClasses("bg-canvas border-b border-border shrink-0 px-6")}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const isClickable = !tab.disabled && !tab.comingSoon

        const baseClasses = cn(
          sectionTabItemClasses({
            active: isActive,
            disabled: !isClickable,
          }),
          "-mb-px mr-5 last:mr-0",
        )

        const content = (
          <>
            <span>{tab.label}</span>
            {tab.comingSoon && (
              <span className="rounded-full border border-border bg-canvas px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">
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
          <div key={tab.href} className={baseClasses} aria-disabled="true" title={tab.label}>
            {content}
          </div>
        )
      })}
    </nav>
  )
}
