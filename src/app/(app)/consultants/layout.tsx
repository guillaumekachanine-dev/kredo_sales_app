import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

// Layout commun au module Équipe (consultants) :
//   /consultants                  → Synthèse
//   /consultants/pool-competences → Pool de compétences
//   /consultants/activite-conges  → Activité & congés
//   /consultants/suivi-manager    → Suivi manager

export default function ConsultantsLayout({
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
