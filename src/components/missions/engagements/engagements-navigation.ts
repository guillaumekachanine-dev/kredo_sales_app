// ─────────────────────────────────────────────────────────────────────────────
//  Engagements Workspace — contrat de navigation secondaire (SHELL-0018 V2)
//
//  Cible : docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md §B.2
//  Livraison Phase 7.3B : docs/navigation_architecture/SHELL-0018/13-PHASE-7.3B-ENGAGEMENTS-ALIGNMENT-2026-09-10.md
//
//  Contrat URL (pathname stable `/missions`, aucun redirect nouveau) :
//    /missions                                → Synthèse (compat : sans `?vue=`)
//    /missions?vue=synthese|missions-at|projets|activite-conges|planning-at
//    /missions?vue=<chapitre>&module=production-conges   → module « Production & Congés »
//    /missions?vue=<chapitre>&module=atlas-portefeuille  → module « Atlas du portefeuille »
//
//  Phase 7.3B — alignement cible :
//   - `activite-conges` : clé technique CONSERVÉE, libellé produit
//     « Activité & congés » → « Rentabilité des engagements » (TRANSFORM label,
//     le contenu était déjà une vue rentabilité réelle / théorique / écart) ;
//   - `planning-at` : clé CONSERVÉE, libellé « Planning des engagements » →
//     « Planning & Échéances » (RENAME) ;
//   - modules contextuels REUSE : « Production & Congés »
//     (`src/features/consultants/modules/production-leave/`) et « Atlas du
//     portefeuille » (`PortfolioAtlasDialog` + `getEngagementsOverview`) ;
//   - « Mission : analyse des marges » reste NEW/FUTURE : aucune capacité
//     module réellement branchable (seule existe l'action Cockpit
//     `analyze_margins`) — pas de bouton mort.
// ─────────────────────────────────────────────────────────────────────────────

export const ENGAGEMENTS_VIEWS = [
  "synthese",
  "missions-at",
  "projets",
  "activite-conges",
  "planning-at",
] as const

export type EngagementsView = (typeof ENGAGEMENTS_VIEWS)[number]

export const ENGAGEMENTS_ROOT_VIEW: EngagementsView = "synthese"

const VIEW_SET = new Set<string>(ENGAGEMENTS_VIEWS)

/** Libellés produit affichés dans le rail et le header (SHELL-0018 §B.2). */
export const ENGAGEMENTS_VIEW_LABELS: Record<EngagementsView, string> = {
  synthese: "Synthèse",
  "missions-at": "Missions AT",
  projets: "Projets",
  "activite-conges": "Rentabilité des engagements",
  "planning-at": "Planning & Échéances",
}

/**
 * Résout la vue active depuis `?vue=`. Compat historique : `planning-engagements`
 * → `planning-at`. Toute valeur inconnue retombe sur la racine `synthese`.
 */
export function parseEngagementsView(
  raw: string | string[] | undefined | null,
): EngagementsView {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === "planning-engagements") return "planning-at"
  return value && VIEW_SET.has(value) ? (value as EngagementsView) : ENGAGEMENTS_ROOT_VIEW
}

export function buildEngagementsViewHref(view: EngagementsView): string {
  return `/missions?vue=${view}`
}

// ─── Modules contextuels ─────────────────────────────────────────────────────

export const ENGAGEMENTS_CONTEXTUAL_MODULES = [
  "production-conges",
  "atlas-portefeuille",
] as const

export type EngagementsContextualModule = (typeof ENGAGEMENTS_CONTEXTUAL_MODULES)[number]

const MODULE_SET = new Set<string>(ENGAGEMENTS_CONTEXTUAL_MODULES)

export const ENGAGEMENTS_MODULE_LABELS: Record<EngagementsContextualModule, string> = {
  "production-conges": "Production & Congés",
  "atlas-portefeuille": "Atlas du portefeuille",
}

export function parseEngagementsModule(
  raw: string | string[] | undefined | null,
): EngagementsContextualModule | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && MODULE_SET.has(value)
    ? (value as EngagementsContextualModule)
    : null
}

/** Href d'ouverture d'un module au-dessus de la vue courante (ou de fermeture si `module` est null). */
export function buildEngagementsModuleHref(
  view: EngagementsView,
  module: EngagementsContextualModule | null,
): string {
  const base = buildEngagementsViewHref(view)
  return module ? `${base}&module=${module}` : base
}
