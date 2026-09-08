import type { ReactNode } from "react"
import type { ConsultantsInShellSection } from "../navigation/consultants-sections"

// ─────────────────────────────────────────────────────────────────────────────
//  Shell Mobile du Consultants Workspace — coquille minimale (Lot 1).
//
//  La navigation inter-chapitres sur Mobile reste portée par la bottom nav
//  (`getMobileTabsForPath`), volontairement non modifiée à ce stade. Le design
//  Mobile détaillé (5 entrées, cartes d'action, synthèse pipeline) est cadré
//  aux Lots 3 et 8. Cette coquille n'est ici que le point de couture serveur
//  qui distribuera les vues Mobile dédiées.
// ─────────────────────────────────────────────────────────────────────────────

interface ConsultantsMobileShellProps {
  activeSection: ConsultantsInShellSection
  children: ReactNode
}

export function ConsultantsMobileShell({ children }: ConsultantsMobileShellProps) {
  return <div className="h-full min-h-0 bg-canvas text-body">{children}</div>
}
