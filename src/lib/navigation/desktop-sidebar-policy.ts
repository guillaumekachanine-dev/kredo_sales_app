// ─────────────────────────────────────────────────────────────────────────────
//  Politique Shell d'auto-repli de la sidebar principale Desktop (SHELL 6.5)
//
//  Fonction pure — aucune dépendance React / Zustand / composant métier.
//  Le Shell (DesktopSidebar) l'utilise pour décider si la page courante est un
//  workspace secondaire permanent (rail `SectionRail`) qui doit s'afficher avec
//  la navigation principale repliée. Aucun workspace ne pilote plus la sidebar
//  lui-même.
//
//  Elle NE remplace PAS les redirections de routes historiques (`/missions/actives`,
//  `/staffing`, `/recruitment`…) : celles-ci gardent leurs contrats existants.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Préfixes canoniques des workspaces Desktop à rail permanent.
 * Un pathname est « auto-replié » s'il est exactement l'un de ces préfixes ou
 * un descendant direct (`prefix` ou `prefix/...`).
 *
 * Volontairement absents (la navigation principale reste dépliée) :
 *   /cockpit · /agenda · /prospection/accounts · /settings · /
 * `/prospection/accounts` (accueil Comptes & Contacts) n'est PAS un workspace
 * secondaire : le cockpit Account Intelligence gère son propre verrou de repli
 * via `CrmTabbedShell`.
 */
export const DESKTOP_SIDEBAR_AUTO_COLLAPSE_PREFIXES = [
  "/missions", // Engagements + Opportunités (/missions/opps)
  "/consultants",
  "/finance",
  "/intelligence", // Business Intelligence
  "/prospection-intelligence",
  "/reports",
  "/veille",
  "/knowledge",
  "/automations",
] as const

/**
 * `true` si la page correspondante doit s'afficher avec la sidebar principale
 * repliée. Accepte un pathname seul (le `?query` / `#hash` éventuel est ignoré).
 */
export function shouldAutoCollapseDesktopSidebar(pathname: string): boolean {
  if (!pathname) return false
  const path = pathname.split("?")[0].split("#")[0]

  return DESKTOP_SIDEBAR_AUTO_COLLAPSE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  )
}

/**
 * État visuel effectif de la sidebar principale, composé de quatre entrées
 * indépendantes et composables :
 *  - `preferredCollapsed`   : préférence durable de l'utilisateur (cookie) ;
 *  - `workspaceAutoCollapsed` : politique Shell dérivée du pathname ;
 *  - `intelligencePanelOpen` : état d'ouverture du Cockpit Intelligence, lu
 *    directement par le Shell depuis `useIntelligencePanel` (les deux rails ne
 *    peuvent pas être dépliés en même temps) ;
 *  - `externalCollapseRequestCount` : nombre de verrous externes exceptionnels
 *    pour les surfaces dont l'état ne peut pas être dérivé directement par le
 *    Shell — actuellement le cockpit CRM uniquement (voir `useSidebarCollapse`).
 *
 * La sidebar est repliée dès qu'au moins une de ces contraintes le demande ;
 * quand toutes retombent, la préférence utilisateur reprend la main sans
 * mémorisation intermédiaire.
 */
export function resolveDesktopSidebarCollapsed(input: {
  preferredCollapsed: boolean
  workspaceAutoCollapsed: boolean
  intelligencePanelOpen: boolean
  externalCollapseRequestCount: number
}): boolean {
  return (
    input.preferredCollapsed ||
    input.workspaceAutoCollapsed ||
    input.intelligencePanelOpen ||
    input.externalCollapseRequestCount > 0
  )
}
