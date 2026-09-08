import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

// Shell des sous-routes historiques du module Consultants :
//   /consultants/activite-conges
//   /consultants/pool-competences
//
// SHELL-0018 V2 — chantier Consultants Workspace : elles conservent la barre
// d'onglets horizontale (`SectionNavBarSlot`) jusqu'à leur migration vers le
// contrat `/consultants?section=…` (Lots 5-6). La page racine `/consultants` ne
// passe PAS par ce layout et porte le shell vertical `SectionRail`.

export default function ConsultantsTabbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionNavBarSlot />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
