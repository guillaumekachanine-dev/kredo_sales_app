import { getModuleTabs } from "@/lib/navigation/main-menu.config"
import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

// Layout commun à toutes les pages du module Consultants :
//   /consultants                  → Synthèse (accueil)
//   /consultants/collaborateurs   → (tabbed)/collaborateurs
//   /consultants/pool-competences → (tabbed)/pool-competences
//   /consultants/suivi-manager    → (tabbed)/suivi-manager
//
// SectionNavBar est rendu ici (routing tabs) ; uniquement sur desktop
// (SectionNavBarSlot gate côté serveur, ADR-0006).

const consultantsTabs = getModuleTabs("/consultants")

export default function ConsultantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBarSlot tabs={consultantsTabs} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
