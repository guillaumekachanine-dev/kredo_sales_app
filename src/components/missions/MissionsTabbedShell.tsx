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
  return match?.label ?? "Vue d'ensemble"
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

  // Sur mobile : pas de tabs, rendu direct
  if (isMobile) {
    return <>{children}</>
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
          <MissionsEntityPanel tab={tab} />
        </div>
      ))}
    </div>
  )
}
