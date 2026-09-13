import { OpportunitiesDesktopFrame } from "@/features/opportunities/desktop/OpportunitiesDesktopShell"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// Layout du workspace Opportunités (`/missions/opps`).
//
// Audit d'ouverture des pages (O-1, docs/audits/AUDIT-OUVERTURE-DES-PAGES.md) :
// le chrome Desktop est rendu ICI, sans donnée, piloté par l'URL. Route group
// `(workspace)` : la fiche `/missions/opps/[id]` n'hérite pas de ce chrome.

export default async function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  const device = await getDashboardDevice()

  if (device === "mobile") return children

  return <OpportunitiesDesktopFrame>{children}</OpportunitiesDesktopFrame>
}
