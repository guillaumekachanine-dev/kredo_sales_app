"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { openMobileAccountQuickSearch } from "@/hooks/use-mobile-account-quick-search"
import { SectionTab } from "@/lib/navigation/main-menu.config"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileSectionRail — rail contextuel d'onglets, mobile uniquement
//
//  Se déplie juste au-dessus de la bottom nav quand l'utilisateur tape l'icône
//  du module DÉJÀ actif. Les onglets sont de vraies routes (<Link href>) — pas
//  de state : refresh-safe, deep-link et bouton retour acquis nativement.
//
//  Rattachement visuel à la nav : même famille bleue (`bg-primary`), séparé par
//  un liseré `border-white/10` (convention sidebar). Onglet actif = capsule
//  blanche / texte bleu (`bg-primary-fg text-primary`).
// ─────────────────────────────────────────────────────────────────────────────

interface MobileSectionRailProps {
  tabs: SectionTab[]
  pathname: string
  onSelect: () => void
  onDismiss: () => void
}

export function MobileSectionRail({ tabs, pathname, onSelect, onDismiss }: MobileSectionRailProps) {
  const railRef = useRef<HTMLDivElement>(null)

  // Tap extérieur → ferme le rail. Le setTimeout(0) évite que le tap d'ouverture
  // (sur la bottom nav) soit immédiatement capté comme un tap extérieur.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        onDismiss()
      }
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [onDismiss])

  return (
    <div
      ref={railRef}
      role="tablist"
      className="kredo-rail-in fixed left-0 right-0 z-[calc(var(--z-bottom-nav)-1)] border-t border-white/10 bg-primary-deep bottom-[var(--layout-bottom-nav-height)]"
    >
      <div className="flex items-stretch gap-1 overflow-x-auto scrollbar-none px-3 h-11">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const isUnavailable = tab.disabled || tab.comingSoon

          if (isUnavailable) {
            return (
              <div
                key={tab.href}
                className="flex shrink-0 items-center justify-center px-3.5 text-xs whitespace-nowrap text-primary-fg/30 cursor-not-allowed select-none gap-1.5"
              >
                <span>{tab.shortLabel ?? tab.label}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-fg/40">
                  Bientôt
                </span>
              </div>
            )
          }

          if (tab.href === "/prospection/accounts") {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => {
                  onSelect()
                  openMobileAccountQuickSearch()
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex shrink-0 items-center justify-center px-3.5 text-xs whitespace-nowrap transition-[color,opacity] duration-[var(--motion-duration-fast)] active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
                  isActive
                    ? "text-primary-fg font-medium"
                    : "text-primary-fg/55 hover:text-primary-fg/85"
                )}
              >
                {tab.shortLabel ?? tab.label}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute bottom-1.5 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-primary-fg transition-all duration-300 ease-out",
                    isActive ? "w-5 opacity-100" : "w-0 opacity-0"
                  )}
                />
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onSelect}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex shrink-0 items-center justify-center px-3.5 text-xs whitespace-nowrap transition-[color,opacity] duration-[var(--motion-duration-fast)] active:scale-95",
                "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
                isActive
                  ? "text-primary-fg font-medium"
                  : "text-primary-fg/55 hover:text-primary-fg/85"
              )}
            >
              {tab.shortLabel ?? tab.label}
              {/* Indicateur souligné — écho de la SectionNavBar desktop, croît depuis le centre */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-1.5 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-primary-fg transition-all duration-300 ease-out",
                  isActive ? "w-5 opacity-100" : "w-0 opacity-0"
                )}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
