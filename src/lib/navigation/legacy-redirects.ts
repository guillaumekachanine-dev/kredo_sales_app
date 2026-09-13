// ─────────────────────────────────────────────────────────────────────────────
//  Redirections permanentes des routes historiques (audit d'ouverture des pages,
//  O-5 — docs/audits/AUDIT-OUVERTURE-DES-PAGES.md).
//
//  Déclarées dans `next.config.ts` → `redirects()` : le 308 part AVANT tout rendu.
//  Portées par une `page.tsx` + `permanentRedirect()`, ces routes passaient par
//  le moteur de rendu sous `(app)/loading.tsx` : le navigateur recevait d'abord
//  un squelette de page, puis l'instruction de redirection en fin de flux.
//
//  Module volontairement sans aucune dépendance : il est importé par
//  `next.config.ts`, évalué hors du graphe applicatif.
//
//  Hors de cette table, et c'est voulu :
//   - `/staffing` : la destination dépend des query params
//     (`resolveLegacyStaffingRedirect`), elle reste une page ;
//   - `/agenda` : redirection calculée (device, fuseau, jour ouvré) — F-9 de
//     docs/performance-data-audit/ a tranché de ne pas la déplacer.
//
//  Les query params de la requête d'origine sont conservés par Next et fusionnés
//  avec ceux de la destination.
// ─────────────────────────────────────────────────────────────────────────────

export interface LegacyRedirect {
  source: string
  destination: string
}

export const LEGACY_PERMANENT_REDIRECTS: readonly LegacyRedirect[] = [
  // Business Intelligence (ex-prospection sectorielle)
  { source: "/prospection", destination: "/intelligence" },
  { source: "/prospection/sector-studies", destination: "/intelligence" },
  { source: "/prospection/approche-sectorielle", destination: "/intelligence" },
  { source: "/prospection/approche-sectorielle/:slug", destination: "/intelligence" },
  // Engagements (SHELL-0018 Lot 6.3)
  { source: "/missions/actives", destination: "/missions?vue=missions-at" },
  { source: "/missions/projets", destination: "/missions?vue=projets" },
  // Consultants Workspace (Lots 5 et 10)
  { source: "/consultants/activite-conges", destination: "/consultants?section=activite-conges" },
  { source: "/consultants/pool-competences", destination: "/consultants?section=pool-competences" },
  { source: "/recruitment", destination: "/consultants?section=candidats" },
]
