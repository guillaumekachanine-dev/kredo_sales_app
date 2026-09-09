// Layout commun à toutes les pages du module Missions (Engagements).
//
// SHELL-0018 Lot 6.3 : le groupe (tabbed) et son SectionNavBarSlot ont été
// définitivement retirés. La page racine `/missions` porte le shell Engagements
// unifié (navigation secondaire SectionRail via `?vue=`). Les sous-routes
// historiques `/missions/actives` et `/missions/projets` redirigent désormais
// de façon permanente vers leurs vues canoniques respectives.

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
