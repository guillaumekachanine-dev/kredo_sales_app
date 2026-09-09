// Layout commun au module Consultants.
//
// SHELL-0018 V2 — chantier Consultants Workspace (Lot 14 / SHELL 6.2) :
// La page racine `/consultants` porte le shell Consultants (navigation
// secondaire verticale `SectionRail`). Aucun composant d'onglets horizontaux
// n'est monté et le route group historique a été supprimé.

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
