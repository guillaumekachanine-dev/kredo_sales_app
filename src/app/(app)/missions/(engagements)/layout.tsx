import { EngagementsDesktopFrame } from "@/components/missions/engagements/EngagementsDesktopView"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

// ─────────────────────────────────────────────────────────────────────────────
//  Layout du workspace Engagements (`/missions`).
//
//  Audit d'ouverture des pages (O-1, docs/audits/AUDIT-OUVERTURE-DES-PAGES.md) :
//  le chrome du module (thème, rail, header) est rendu ICI, sans aucune donnée,
//  au lieu d'être rendu par la page après ses requêtes. Il apparaît donc dès le
//  début de la navigation et reste en place d'un chapitre à l'autre ; seul le
//  contenu passe par `./loading.tsx`.
//
//  Route group `(engagements)` : `/missions/opps` est un autre workspace
//  (Opportunités) et ne doit pas hériter de ce chrome.
// ─────────────────────────────────────────────────────────────────────────────

export default async function EngagementsLayout({ children }: { children: React.ReactNode }) {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return (
      <div data-theme="edito-bright-engagements" className="h-full min-h-0 bg-canvas text-body">
        {children}
      </div>
    )
  }

  return <EngagementsDesktopFrame>{children}</EngagementsDesktopFrame>
}
