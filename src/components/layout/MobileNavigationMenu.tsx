"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { mainMenuItems, MainMenuItem } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { cn } from "@/lib/utils"

function MenuIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

export function MobileNavigationMenu() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // S'affiche uniquement sur la page Cockpit mobile
  if (pathname !== "/cockpit") return null

  const renderModuleItem = (item: MainMenuItem) => {
    const isClickable = !item.disabled && !item.comingSoon && !!item.href
    const activeHref = item.href ? (pathname === item.href || pathname.startsWith(item.href + "/")) : false
    
    // Si le module a des sous-pages (onglets), on affiche un bloc conteneur
    if (item.tabs && item.tabs.length > 0) {
      return (
        <div key={item.label} className="rounded-lg border border-border/40 bg-surface-raised p-2.5 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-primary/10 text-primary">
              {item.icon && getNavigationIcon(item.icon)}
            </div>
            <span className="text-[11px] font-bold text-heading leading-none">{item.label}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/30">
            {item.tabs.map((tab) => {
              const isTabActive = pathname === tab.href
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-center text-center py-1 px-2 rounded-md text-[9px] font-semibold transition-colors min-h-[30px] border border-transparent bg-canvas text-body leading-tight",
                    isTabActive && "border-primary bg-primary/5 text-primary font-bold"
                  )}
                >
                  {tab.shortLabel ?? tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      )
    }

    // Si le module est désactivé / bientôt disponible
    if (!isClickable) {
      return (
        <div
          key={item.label}
          className="flex items-center gap-2.5 p-2 rounded-lg border border-border/20 bg-surface-raised/40 opacity-50 min-h-[36px] cursor-not-allowed"
        >
          <div className="p-1 rounded bg-muted/10 text-muted">
            {item.icon && getNavigationIcon(item.icon)}
          </div>
          <span className="text-[11px] font-semibold text-muted leading-none">{item.label}</span>
          <span className="ml-auto shrink-0 rounded-full border border-border/30 bg-muted/10 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider text-muted">
            Bientôt
          </span>
        </div>
      )
    }

    // Module simple cliquable (sans sous-onglets)
    return (
      <Link
        key={item.label}
        href={item.href!}
        onClick={() => setIsOpen(false)}
        className={cn(
          "flex items-center gap-2.5 p-2 rounded-lg border border-border/40 bg-surface-raised hover:bg-surface-hover transition-colors min-h-[36px]",
          activeHref && "border-primary bg-primary/5 text-primary font-semibold"
        )}
      >
        <div className={cn("p-1 rounded bg-primary/10 text-primary", activeHref && "bg-primary text-white")}>
          {item.icon && getNavigationIcon(item.icon)}
        </div>
        <span className="text-[11px] font-semibold text-heading leading-none">{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Bouton FAB à gauche, symétrique à l'IntelligenceFAB */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu de navigation"
        className="fixed z-[var(--z-fab)] left-4 bottom-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full shadow-[0_2px_12px_rgba(37,84,184,0.35)] transition-transform active:scale-90 bg-primary text-primary-fg"
      >
        <MenuIcon />
      </button>

      {/* Drawer contenant le menu de navigation complet */}
      <AppDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Navigation"
        side="bottom"
        icon={
          <span className="inline-flex size-5 items-center justify-center text-primary">
            <MenuIcon />
          </span>
        }
      >
        <div className="space-y-4 pb-4">
          {mainMenuItems.map((group) => {
            // Groupe de catégories (ex: Commerce, Ressources, Finance...)
            if (group.items) {
              return (
                <div key={group.label} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-[9px] font-extrabold uppercase tracking-widest text-muted shrink-0">
                      {group.label}
                    </h3>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map((item) => renderModuleItem(item))}
                  </div>
                </div>
              )
            }

            // Éléments racines directs (ex: Cockpit, Agenda, Paramètres)
            return (
              <div key={group.label} className="grid grid-cols-1 gap-1.5">
                {renderModuleItem(group)}
              </div>
            )
          })}
        </div>
      </AppDrawer>
    </>
  )
}
