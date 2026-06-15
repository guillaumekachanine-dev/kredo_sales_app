// Shell partagé pour les onglets du module Consultants :
//   /consultants/collaborateurs
//   /consultants/pool-competences
//   /consultants/suivi-manager
//
// Pas de MissionsTabbedShell-like ici pour l'instant (pas de record tabs).
// Le layout reste neutre : le contenu de chaque onglet est autonome.

export default function ConsultantsTabbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
