// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — contrat des modules contextuels (Lot 10)
//
//  Chantier : docs/FEATURES/opportunities_workspace/ (§ 13).
//  Standard : SHELL-0018 Lot 3.1 — un module n'apparaît dans `contextualModules`
//  que s'il est (1) directement utile, (2) contextualisé sans reconstruction
//  manuelle, (3) réellement fonctionnel. Aucun bouton mort, aucun placeholder.
//
//  Trois modules, tous branchés sur des capacités EXISTANTES (aucun composant
//  copié, aucun loader forké, aucune deuxième modale / moteur / mission) :
//    - matching     → `MatchingDialog` (moteur unique `src/lib/staffing-matching/`)
//    - simulation   → `FinancialModelingDesktopDialog` (@/features/financial-modeling)
//    - post-mortem  → `MissionComposerDesktop` (mission `post-mortem-commercial`)
//
//  Décisions actées à ce lot (Decision Log § 16) :
//   - OPP-30 / CROSS-01 : point d'entrée Matching = `MatchingDialog` besoin-centrique
//     monté tel quel ; visible sur les chapitres qui portent une opportunité
//     sélectionnée (`besoins`, `planning`). Aucun launcher partagé nouveau.
//   - OPP-30 / CROSS-02 : Post-Mortem = `MissionComposerDesktop` monté dans un
//     `AppDialog` thémé cockpit ; aucune nouvelle mission / workflow / trigger.
//   - OPP-30 / CROSS-03 : Simulation devis = toujours disponible ; le préset
//     opportunité/besoin est appliqué quand un contexte existe, sinon flash nu.
//
//  Contrat URL : `?module=matching|simulation|post-mortem`, orthogonal à
//  `?section=` et `?opp=` (le module s'ouvre AU-DESSUS du chapitre courant et de
//  sa sélection). `buildOpportunitiesSectionHref` retire `module` au changement
//  de chapitre (état d'exploration éphémère, comme `opp`).
//
//  Module isomorphe (client + serveur) — aucune dépendance Supabase / n8n / React.
// ─────────────────────────────────────────────────────────────────────────────

import type { OpportunitiesSection } from "../navigation/opportunities-sections"

export type OpportunitiesModule = "matching" | "simulation" | "post-mortem"

/** Ordre canonique dans la section « Modules » du rail. */
export const OPPORTUNITIES_MODULE_KEYS = [
  "matching",
  "simulation",
  "post-mortem",
] as const

const MODULE_KEY_SET = new Set<string>(OPPORTUNITIES_MODULE_KEYS)

export const OPPORTUNITIES_MODULE_LABELS: Record<OpportunitiesModule, string> = {
  matching: "Matching profil",
  simulation: "Simulation devis",
  "post-mortem": "Post-Mortem",
}

/**
 * Un module n'est proposé que là où il est réellement actionnable (§ 13) :
 *  - `matching` exige une opportunité en contexte → chapitres `besoins` / `planning`
 *    (leurs loaders résolvent toujours une sélection tant qu'il existe ≥ 1 besoin) ;
 *  - `simulation` et `post-mortem` sont autonomes → disponibles partout.
 */
const MODULE_APPLICABILITY: Record<
  OpportunitiesModule,
  (section: OpportunitiesSection) => boolean
> = {
  matching: (section) => section === "besoins" || section === "planning",
  simulation: () => true,
  "post-mortem": () => true,
}

/** Modules affichables dans le rail pour un chapitre donné, dans l'ordre canonique. */
export function opportunitiesModulesForSection(
  section: OpportunitiesSection,
): OpportunitiesModule[] {
  return OPPORTUNITIES_MODULE_KEYS.filter((key) => MODULE_APPLICABILITY[key](section))
}

type RawSearchParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key)
  const value = params[key]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Résout le module actif à partir des query params ET du chapitre courant.
 * Une valeur absente, inconnue, ou non applicable au chapitre → `null`
 * (le module n'ouvre rien, aucun overlay fantôme).
 */
export function parseOpportunitiesModule(
  params: RawSearchParams,
  section: OpportunitiesSection,
): OpportunitiesModule | null {
  const raw = readParam(params, "module")?.trim()
  if (!raw || !MODULE_KEY_SET.has(raw)) return null
  const moduleKey = raw as OpportunitiesModule
  return opportunitiesModulesForSection(section).includes(moduleKey) ? moduleKey : null
}

interface SearchParamsSnapshot {
  toString(): string
}

/**
 * Construit le href d'ouverture / fermeture d'un module.
 * - `nextModule` non nul : pose / met à jour `module`, préserve `section`, `opp`
 *   et tous les autres query params ;
 * - `nextModule` nul : retire `module` (fermeture) — c'est le `closeHref`.
 */
export function buildOpportunitiesModuleHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  nextModule: OpportunitiesModule | null,
): string {
  const next = new URLSearchParams(searchParams.toString())
  if (nextModule) next.set("module", nextModule)
  else next.delete("module")
  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}
