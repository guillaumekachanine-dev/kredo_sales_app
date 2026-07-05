"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getNavigationIcon } from "./navigation-icons"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { cn } from "@/lib/utils"

interface MenuItem {
  id: string
  label: string
  icon: string
  href?: string
  disabled?: boolean
  comingSoon?: boolean
  tabs?: { label: string; shortLabel?: string; href: string; icon: string; disabled?: boolean; comingSoon?: boolean }[]
}

const mainItems: MenuItem[] = [
  { id: "cockpit", label: "Cockpit", icon: "cockpit", href: "/cockpit" },
  { id: "agenda", label: "Agenda", icon: "calendar", href: "/agenda" },
  {
    id: "crm",
    label: "CRM & prospection",
    icon: "crm",
    tabs: [
      { label: "Synthèse", href: "/prospection", icon: "crm" },
      { label: "Comptes & Contacts", shortLabel: "Comptes", href: "/prospection/accounts", icon: "equipe" },
      { label: "Approche sectorielle", shortLabel: "Secteurs", href: "/prospection/approche-sectorielle", icon: "veille" },
      { label: "Activité", href: "/prospection/suivi", icon: "calendar" },
    ],
  },
  {
    id: "besoins",
    label: "Besoins & Staffing",
    icon: "sales",
    tabs: [
      { label: "Besoins & Staffing", shortLabel: "Besoins", href: "/missions/opps", icon: "sales" },
      { label: "Recrutement", href: "/recruitment", icon: "recrutement" },
    ],
  },
  {
    id: "missions",
    label: "Contrats actifs",
    icon: "engagements",
    tabs: [
      { label: "Synthèse", href: "/missions", icon: "engagements" },
      { label: "Missions", href: "/missions/actives", icon: "sales" },
      { label: "Projets", href: "/missions/projets", icon: "automations" },
    ],
  },
  {
    id: "consultants",
    label: "équipe & compétences",
    icon: "equipe",
    tabs: [
      { label: "Synthèse", href: "/consultants", icon: "equipe" },
      { label: "Pool de compétences", shortLabel: "Compétences", href: "/consultants/pool-competences", icon: "knowledge" },
      { label: "Activité & congés", shortLabel: "Activité", href: "/consultants/activite-conges", icon: "calendar" },
    ],
  },
  { id: "finance", label: "Finance", icon: "finance", href: "/finance" },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: "reports",
    tabs: [
      { label: "Business Intelligence", shortLabel: "BI", href: "/intelligence", icon: "bi", disabled: true, comingSoon: true },
      { label: "Rapports & rédaction", shortLabel: "Rapports", href: "/reports", icon: "reports" },
      { label: "Veille & actualités", shortLabel: "Veille", href: "/veille", icon: "veille", disabled: true, comingSoon: true },
    ],
  },
  {
    id: "tools",
    label: "Outils",
    icon: "settings",
    tabs: [
      { label: "Knowledge Hub", href: "/knowledge", icon: "knowledge" },
      { label: "Automatisations", href: "/automations", icon: "automations" },
      { label: "Paramètres", href: "/settings", icon: "settings" },
    ],
  },
]

interface MobileNavigationMenuProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function MenuIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

export function MobileNavigationMenu({ isOpen, onOpenChange }: MobileNavigationMenuProps) {
  const pathname = usePathname()
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [displayGroup, setDisplayGroup] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Reset to main menu when drawer closes
  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setActiveGroup(null)
        setDisplayGroup(null)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  const handleGroupChange = (newGroup: string | null) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveGroup(newGroup)
      setDisplayGroup(newGroup)
      setIsTransitioning(false)
    }, 180)
  }

  const isCardActive = (item: MenuItem) => {
    if (item.id === "cockpit") return pathname === "/cockpit"
    if (item.id === "agenda") return pathname === "/agenda"
    if (item.id === "crm") return pathname.startsWith("/prospection")
    if (item.id === "finance") return pathname.startsWith("/finance")
    
    if (item.id === "besoins") {
      return pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")
    }
    if (item.id === "missions") {
      return pathname.startsWith("/missions") && !pathname.startsWith("/missions/opps")
    }
    if (item.id === "consultants") {
      return pathname.startsWith("/consultants")
    }
    if (item.id === "intelligence") {
      return pathname.startsWith("/reports") || pathname.startsWith("/veille") || pathname.startsWith("/intelligence")
    }
    if (item.id === "tools") {
      return pathname.startsWith("/knowledge") || pathname.startsWith("/automations") || pathname.startsWith("/settings")
    }
    return false
  }

  const isOutilsActive = pathname.startsWith("/knowledge") || pathname.startsWith("/automations") || pathname.startsWith("/settings")
  const activeGroupItem = mainItems.find(item => item.id === displayGroup)

  const titleElement = displayGroup === null ? (
    "Navigation"
  ) : (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleGroupChange(null)}
        className="inline-flex items-center justify-center size-8 rounded-full bg-slate-800/10 hover:bg-slate-800/20 border border-slate-700/10 active:scale-95 transition-all cursor-pointer text-heading shrink-0"
        aria-label="Retour au menu principal"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="truncate">{activeGroupItem?.label}</span>
    </div>
  )

  const iconElement = displayGroup === null ? (
    <span className="inline-flex size-5 items-center justify-center text-primary">
      <MenuIcon />
    </span>
  ) : (
    <span className="inline-flex size-5 items-center justify-center text-primary">
      {getNavigationIcon(activeGroupItem?.icon)}
    </span>
  )

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={onOpenChange}
      title=""
      subtitle={undefined}
      icon={undefined}
      side="bottom"
      headerClassName="!hidden"
      className="!bg-transparent !border-0 !shadow-none [--drawer-header-fade-start:transparent] max-h-[85vh] overflow-y-auto"
    >
      <div className="px-1 pb-6 min-h-[70vh] flex flex-col justify-center">
        <div
          className={cn(
            "transition-all duration-200 ease-out",
            isTransitioning ? "opacity-0 scale-[0.98] translate-y-1" : "opacity-100 scale-100 translate-y-0"
          )}
        >
          {displayGroup === null ? (
            /* Main Menu Grid - 8 items in 2 columns + rectangular Tools button */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {mainItems
                  .filter((item) => item.id !== "tools")
                  .map((item) => {
                    const isActive = isCardActive(item)
                    const isClickable = !item.disabled && !item.comingSoon
                    const hasSubMenu = !!item.tabs

                    // Disabled / Coming soon card
                    if (!isClickable) {
                      return (
                        <div
                          key={item.id}
                          className="h-[88px] flex flex-col items-center justify-center p-3 rounded-2xl border border-border/30 bg-surface-raised/50 backdrop-blur-md opacity-40 text-center gap-1.5 select-none cursor-not-allowed"
                        >
                          <div className="p-2 rounded-xl bg-muted/10 text-muted [&_svg]:size-6">
                            {getNavigationIcon(item.icon)}
                          </div>
                          <span className="text-[10px] font-bold text-muted leading-tight line-clamp-1">
                            {item.label}
                          </span>
                          <span className="rounded-full border border-border/30 bg-muted/10 px-1 py-0.5 text-[6px] font-bold uppercase tracking-wider text-muted">
                            Bientôt
                          </span>
                        </div>
                      )
                    }

                    const cardInner = (
                      <>
                        <div
                          className={cn(
                            "p-2 rounded-xl transition-all duration-200 [&_svg]:size-6",
                            isActive
                              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-fg shadow-[0_2px_8px_rgba(37,99,235,0.3)] scale-105"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {getNavigationIcon(item.icon)}
                        </div>
                        <span className="text-[10px] font-bold text-heading leading-tight line-clamp-1">
                          {item.label}
                        </span>
                        {hasSubMenu && (
                          <span className={cn("absolute right-2.5 top-2.5 transition-colors", isActive ? "text-primary/70" : "text-muted/50")}>
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        )}
                      </>
                    )

                    const cardClasses = cn(
                      "relative flex flex-col items-center justify-center h-[88px] p-3 rounded-2xl border transition-all duration-200 text-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:bg-surface-hover active:scale-95 select-none cursor-pointer",
                      isActive
                        ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-md text-primary font-bold shadow-[0_4px_16px_rgba(37,99,235,0.15)]"
                        : "border-border/90 bg-surface-raised/95 backdrop-blur-md text-heading"
                    )

                    // Card opening a sub-menu group
                    if (hasSubMenu) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleGroupChange(item.id)}
                          className={cardClasses}
                        >
                          {cardInner}
                        </button>
                      )
                    }

                    // Direct Link card
                    return (
                      <Link
                        key={item.id}
                        href={item.href!}
                        onClick={() => onOpenChange(false)}
                        className={cardClasses}
                      >
                        {cardInner}
                      </Link>
                    )
                  })}
              </div>

              {/* Outils Rectangular Button */}
              <button
                type="button"
                onClick={() => handleGroupChange("tools")}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:bg-surface-hover active:scale-[0.98] select-none cursor-pointer mt-1",
                  isOutilsActive
                    ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-md text-primary font-bold shadow-[0_4px_16px_rgba(37,99,235,0.15)]"
                    : "border-border/90 bg-surface-raised/95 backdrop-blur-md text-heading"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-200 [&_svg]:size-4",
                    isOutilsActive
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-fg shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {getNavigationIcon("settings")}
                </div>
                <span className="text-[11px] font-bold">Outils</span>
              </button>
            </div>
          ) : (
            /* Sub Menu Grid - 2 columns layout without header, plus back button at the bottom */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {activeGroupItem?.tabs?.map((subItem, index) => {
                  const isActive = pathname === subItem.href
                  const isClickable = !subItem.disabled && !subItem.comingSoon
                  const subTabs = activeGroupItem?.tabs ?? []
                  const isLastItem = index === subTabs.length - 1
                  const isOddCount = subTabs.length % 2 !== 0
                  const colSpanClass = isOddCount && isLastItem ? "col-span-2 h-[88px]" : "h-[88px]"

                  if (!isClickable) {
                    return (
                      <div
                        key={subItem.href}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border border-border/20 bg-surface-raised/40 opacity-50 text-center gap-1.5 select-none cursor-not-allowed",
                          colSpanClass
                        )}
                      >
                        <div className="p-2 rounded-xl bg-muted/10 text-muted [&_svg]:size-6">
                          {getNavigationIcon(subItem.icon)}
                        </div>
                        <span className="text-[10px] font-bold text-muted leading-tight line-clamp-1">
                          {subItem.shortLabel ?? subItem.label}
                        </span>
                        <span className="rounded-full border border-border/30 bg-muted/10 px-1 py-0.5 text-[6px] font-bold uppercase tracking-wider text-muted">
                          Bientôt
                        </span>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 text-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:bg-surface-hover active:scale-95 select-none cursor-pointer",
                        colSpanClass,
                        isActive
                          ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-md text-primary font-bold shadow-[0_4px_16px_rgba(37,99,235,0.15)]"
                          : "border-border/90 bg-surface-raised/95 backdrop-blur-md text-heading"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-xl transition-all duration-200 [&_svg]:size-6",
                          isActive
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-fg shadow-[0_2px_8px_rgba(37,99,235,0.3)] scale-105"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {getNavigationIcon(subItem.icon)}
                      </div>
                      <span className="text-[10px] font-bold text-heading leading-tight line-clamp-1">
                        {subItem.shortLabel ?? subItem.label}
                      </span>
                    </Link>
                  )
                })}
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => handleGroupChange(null)}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border/90 bg-surface-raised/95 backdrop-blur-md text-heading transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:bg-surface-hover active:scale-[0.98] select-none cursor-pointer mt-1"
              >
                <svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-[11px] font-bold">Retour au menu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </AppDrawer>
  )
}
