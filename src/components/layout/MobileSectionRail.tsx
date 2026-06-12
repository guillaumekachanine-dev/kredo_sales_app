"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
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
      className="kredo-rail-in fixed bottom-[calc(4rem+1px)] left-0 right-0 z-40 bg-primary-deep border-t border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-stretch gap-1 overflow-x-auto scrollbar-none px-3 h-11">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onSelect}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center justify-center shrink-0 px-3.5 text-xs whitespace-nowrap transition-colors duration-150 active:scale-95",
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
