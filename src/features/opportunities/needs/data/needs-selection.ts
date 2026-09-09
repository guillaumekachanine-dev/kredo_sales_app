// ─────────────────────────────────────────────────────────────────────────────
//  Chapitre Besoins & staffing — parsing de la sélection + des filtres (Lot 5).
//
//  Réutilise `parseNeedsStaffingUrlState` pour les filtres (`stage` / `priority`
//  / `practice` / `sort` / `direction`) : aucun parseur de filtre recréé. On y
//  ajoute seulement `?opp=` (sélection d'entité, PRODUCT-03).
//
//  `scope` et `view` de l'ancien contrat sont **ignorés** ici : le chapitre
//  Besoins n'a plus de bascule `scope` (le staffing devient le rail droit) ;
//  `view` est arbitré au Lot 6 (PRODUCT-02 / NAVIGATION-02).
// ─────────────────────────────────────────────────────────────────────────────

import { parseNeedsStaffingUrlState } from "@/lib/needs-staffing/url-state"
import type { NeedsFilterState, NeedsSelectionState } from "./opportunities-needs.types"

type RawSearchParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key)
  const value = params[key]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeId(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseNeedsFilters(params: RawSearchParams): NeedsFilterState {
  const { stage, priority, practice, sort, direction } = parseNeedsStaffingUrlState(params)
  return { stage, priority, practice, sort, direction }
}

export function parseNeedsSelection(params: RawSearchParams): NeedsSelectionState {
  return {
    requestedNeedId: normalizeId(readParam(params, "opp")),
    filters: parseNeedsFilters(params),
  }
}
