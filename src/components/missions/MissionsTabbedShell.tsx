"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { SectionTabBar } from "@/components/layout/SectionTabBar"
import { MissionsEntityPanel } from "./MissionsEntityPanel"

const SEGMENT_LABELS: Record<string, string> = {
  "/missions/actives": "Missions actives",
  "/missions/opps": "Opportunités",
  "/missions/planning": "Planning",
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
  const homeLabel = SEGMENT_LABELS[pathname] ?? "Liste"
  const { tabs, activeTabId, setActiveTab } = useMissionsTabStore()

  // Quand on change de page (actives → opps → planning), on revient sur "home"
  // pour afficher la liste de la nouvelle page, sans fermer les tabs ouverts.
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

      {/* Home tab — le contenu Next.js de la page (liste) */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          activeTabId !== "home" && "hidden"
        )}
      >
        {children}
      </div>

      {/* Record tabs — fiches ouvertes */}
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
