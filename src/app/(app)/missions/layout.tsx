import { getModuleTabs } from "@/lib/navigation/main-menu.config"
import { SectionNavBar } from "@/components/layout/SectionNavBar"

// Layout commun à toutes les pages du module Missions :
//   /missions           → vue d'ensemble
//   /missions/actives   → (tabbed)/actives
//   /missions/opps      → (tabbed)/opps
//   /missions/planning  → (tabbed)/planning
//
// SectionNavBar est rendu ici (routing tabs) ; SectionTabBar (record tabs)
// reste dans MissionsTabbedShell, uniquement pour les sous-pages (tabbed).

const missionsTabs = getModuleTabs("/missions")

export default function MissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBar tabs={missionsTabs} />
      {/* min-h-0 indispensable : permet aux enfants flex de dépasser
          leur contenu et d'activer l'overflow interne (MissionsTabbedShell) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
