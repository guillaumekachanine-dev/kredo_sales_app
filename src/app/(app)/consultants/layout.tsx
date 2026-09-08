// Layout commun au module Consultants.
//
// SHELL-0018 V2 — chantier Consultants Workspace, Lot 1 :
// la barre d'onglets horizontale (`SectionNavBarSlot`) est descendue dans
// `(tabbed)/layout.tsx`. La page racine `/consultants` porte désormais le shell
// Consultants (navigation secondaire verticale `SectionRail`), qui doublonnerait
// la barre horizontale. Les sous-routes `(tabbed)` (Activités & congés, Pool de
// compétences) conservent la barre via leur propre layout jusqu'à leur migration
// vers `/consultants?section=…` (Lots 5-6).

export default function ConsultantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
