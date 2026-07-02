"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { getSectionTabsForPath } from "@/lib/navigation/main-menu.config"
import { SectionTabBar } from "@/components/layout/SectionTabBar"
import { MissionsEntityPanel } from "./MissionsEntityPanel"

// homeLabel dérivé du config navigation — source unique de vérité
function useHomeLabelForPath(pathname: string): string {
  const tabs = getSectionTabsForPath(pathname)
  const match = tabs.find((t) => t.href === pathname)
  return match?.label ?? "Synthèse"
}

interface MissionsTabbedShellProps {
  children: React.ReactNode
  isMobile?: boolean
}

export function MissionsTabbedShell({
  children,
  isMobile = false,
}: MissionsTabbedShellProps) {
  const pathname = usePathname()
  const homeLabel = useHomeLabelForPath(pathname)
  const { tabs, activeTabId, setActiveTab } = useMissionsTabStore()

  // Quand on change de sous-page (actives → opps → planning), on revient sur
  // "home" pour afficher la liste de la nouvelle page sans fermer les tabs ouverts.
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setActiveTab("home")
    }
  }, [pathname, setActiveTab])

  // Sur mobile : rendu de la liste si "home", sinon rendu de la fiche active avec bouton de retour
  if (isMobile) {
    if (activeTabId === "home") {
      return <>{children}</>
    }

    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return <>{children}</>

    return (
      <div className="flex flex-col h-full bg-canvas overflow-y-auto">
        {/* Mobile Header with Back Button */}
        <div className="sticky top-0 bg-surface border-b border-border z-10 px-4 py-3 flex items-center gap-3 select-none shadow-sm">
          <button
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold text-heading truncate">{activeTab.title}</h2>
          </div>
        </div>

        <div className="flex-1">
          <MissionsEntityPanel tab={activeTab} isMobile={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionTabBar homeLabel={homeLabel} />

      {/* Home tab — liste Next.js de la page courante */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          activeTabId !== "home" && "hidden"
        )}
      >
        {children}
      </div>

      {/* Record tabs — fiches entités ouvertes */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex-1 overflow-y-auto",
            tab.id !== activeTabId && "hidden"
          )}
        >
          <MissionsEntityPanel tab={tab} isActive={tab.id === activeTabId} />
        </div>
      ))}
    </div>
  )
}
