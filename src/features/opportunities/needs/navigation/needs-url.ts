// ─────────────────────────────────────────────────────────────────────────────
//  Chapitre Besoins & staffing — builder d'URL (Lot 6).
//
//  Contrat URL du chapitre (OPP-26 / NAVIGATION-02) :
//    /missions/opps?section=besoins
//      &opp=<id>                          ← besoin sélectionné (PRODUCT-03 / OPP-23)
//      &stage= &priority= &practice=       ← filtres (repris de `url-state.ts`)
//      &sort=acv &direction=asc|desc       ← tri ACV
//
//  Abandonnés : `?scope=` (le staffing devient le rail droit, plus une bascule)
//  et `?view=` (Kanban retiré — OPP-25 ; Planning = chapitre dédié, Lot 9). La
//  compat d'entrée `?scope=needs|staffing → besoins` reste portée par
//  `parseOpportunitiesSection` (OPP-16).
//
//  Module isomorphe — pas de dépendance React. Le pathname est constant
//  (`OPPORTUNITIES_CANONICAL_PATH`) : le workspace ne migre pas de pathname (OPP-02).
// ─────────────────────────────────────────────────────────────────────────────

import { OPPORTUNITIES_CANONICAL_PATH } from "@/features/opportunities/navigation/opportunities-sections"
import type { NeedsFilterState } from "../data/opportunities-needs.types"

/** Params du chapitre gérés par ce builder (les autres = tiers, préservés). */
const MANAGED_KEYS = ["opp", "stage", "priority", "practice", "sort", "direction"] as const

/** Params de l'ancien contrat `NeedsStaffingWorkspace` toujours retirés ici. */
const DROPPED_KEYS = ["scope", "view"] as const

export interface NeedsUrlPatch {
  /** `undefined` = inchangé · `null` ou `""` = retiré · sinon posé. */
  opp?: string | null
  filters?: Partial<NeedsFilterState>
}

function applyValue(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (value === undefined) return
  if (value === null || value === "") {
    params.delete(key)
    return
  }
  params.set(key, value)
}

/**
 * Construit l'URL du chapitre Besoins à partir de la query courante + d'un patch.
 * `section=besoins` est toujours posé ; `scope`/`view` toujours retirés ; tous
 * les autres query params (tiers) sont conservés.
 */
export function buildNeedsHref(searchParamsString: string, patch: NeedsUrlPatch = {}): string {
  const params = new URLSearchParams(searchParamsString)

  params.set("section", "besoins")
  for (const key of DROPPED_KEYS) params.delete(key)

  applyValue(params, "opp", patch.opp)

  if (patch.filters) {
    for (const key of ["stage", "priority", "practice", "sort", "direction"] as const) {
      if (key in patch.filters) {
        applyValue(params, key, patch.filters[key] ?? null)
      }
    }
  }

  const query = params.toString()
  return query ? `${OPPORTUNITIES_CANONICAL_PATH}?${query}` : OPPORTUNITIES_CANONICAL_PATH
}

export { MANAGED_KEYS as NEEDS_CHAPTER_QUERY_KEYS }
