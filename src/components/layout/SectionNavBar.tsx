"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SectionTab, getSectionTabsForPath } from "@/lib/navigation/main-menu.config"
import { cn } from "@/lib/utils"
import { sectionTabItemClasses, sectionTabListClasses } from "./section-tab-styles"

// ─────────────────────────────────────────────────────────────────────────────
//  SectionNavBar — barre d'onglets de routing intra-module
//
//  Quand `tabs` n'est pas passé en prop, les onglets sont dérivés du pathname
//  via getSectionTabsForPath (matching le plus spécifique). Cela permet aux
//  layouts de rendre <SectionNavBar /> sans connaître le module courant.
// ─────────────────────────────────────────────────────────────────────────────

import { useCrmAccountLauncherStore } from "@/hooks/use-crm-account-launcher"

interface SectionNavBarProps {
  tabs?: SectionTab[]
}

export function SectionNavBar({ tabs: propTabs }: SectionNavBarProps) {
  const pathname = usePathname()
  const tabs = propTabs ?? getSectionTabsForPath(pathname)
  const openLauncher = useCrmAccountLauncherStore((s) => s.open)

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

        const handleLinkClick = (e: React.MouseEvent) => {
          if (tab.href === "/prospection/accounts") {
            e.preventDefault()
            openLauncher()
          }
        }

        if (isClickable) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={handleLinkClick}
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
