import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"
import { MissionsTabbedShell } from "@/components/missions/MissionsTabbedShell"

// Sous-pages onglets du module Missions (Missions actives, Projets, liste Opps).
// La barre d'onglets de section vit ici (et non dans `../layout.tsx`) : la page
// racine `/missions` porte le nouveau shell Engagements à navigation verticale.

export default async function TabbedMissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const device = await getDashboardDevice()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionNavBarSlot />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MissionsTabbedShell isMobile={device === "mobile"}>{children}</MissionsTabbedShell>
      </div>
    </div>
  )
}
