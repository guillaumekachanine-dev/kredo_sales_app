// Layout commun à toutes les pages du module Missions.
//
// Deux workspaces vivent sous ce segment, chacun avec son propre chrome porté par
// un layout de route group (audit d'ouverture des pages, O-1) :
//   - `(engagements)/`         → `/missions`       (Engagements, `?vue=`)
//   - `opps/(workspace)/`      → `/missions/opps`  (Opportunités, `?section=`)
// Les routes historiques `/missions/actives` et `/missions/projets` sont des
// redirections déclarées dans `next.config.ts` (src/lib/navigation/legacy-redirects.ts).

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
