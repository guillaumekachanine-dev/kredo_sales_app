import { ConsultantsDesktopFrame } from "@/features/consultants/desktop/ConsultantsDesktopShell"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Layout commun au module Consultants.
//
// SHELL-0018 V2 — chantier Consultants Workspace (Lot 14 / SHELL 6.2) : navigation
// secondaire verticale `SectionRail`, aucun onglet horizontal, route group
// historique supprimé.
//
// Audit d'ouverture des pages (O-1, docs/audits/AUDIT-OUVERTURE-DES-PAGES.md) :
// le chrome Desktop est rendu ICI, sans donnée, piloté par l'URL. Il s'affiche dès
// le début de la navigation et reste en place d'un chapitre à l'autre ; seul le
// contenu passe par `./loading.tsx`.

export default async function ConsultantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ConsultantsDesktopFrame>{children}</ConsultantsDesktopFrame>
    </div>
  )
}
