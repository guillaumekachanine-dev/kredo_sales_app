// Layout commun à toutes les pages du module Missions.
//
// La barre d'onglets de section (SectionNavBarSlot) a été descendue dans
// `(tabbed)/layout.tsx` : la page racine `/missions` porte désormais le nouveau
// shell Engagements (navigation secondaire verticale), qui doublonnerait la
// barre d'onglets horizontale. Les pages `(tabbed)` (Missions, Projets)
// conservent la barre via leur propre layout.

export default function MissionsLayout({
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
