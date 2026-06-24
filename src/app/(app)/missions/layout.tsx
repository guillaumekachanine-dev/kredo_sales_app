import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

// Layout commun à toutes les pages du module Missions.
// Les onglets sont dérivés du pathname par SectionNavBar :
//   /missions, /missions/actives, /missions/planning → tabs "Engagements"
//   /missions/opps → pas de tabs (sidebar standalone "Opportunités")

export default function MissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBarSlot />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
