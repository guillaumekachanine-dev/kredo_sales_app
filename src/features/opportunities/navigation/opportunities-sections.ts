// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — contrat de navigation secondaire (SHELL-0018 V2)
//
//  Chantier : docs/FEATURES/opportunities_workspace/
//  Standard : docs/navigation_architecture/SHELL-0018/02-SECONDARY-RAIL-STANDARD.md
//
//  Contrat URL cible (OPP-04) :
//    /missions/opps                          → Synthèse (racine, SANS paramètre)
//    /missions/opps?section=besoins          → Besoins & staffing
//    /missions/opps?section=avant-vente      → Avant-vente
//    /missions/opps?section=planning         → Planning
//
//  Compat des anciennes URLs `scope` (OPP-16, NAVIGATION-01 volet parsing) :
//    /missions/opps?scope=needs      → résolu vers `besoins`
//    /missions/opps?scope=staffing   → résolu vers `besoins`
//  La résolution se fait AU PARSING (aucune redirection dure). Un `section`
//  explicite l'emporte toujours sur `scope`.
//
//  Module isomorphe (client + serveur) — aucune dépendance Supabase / n8n.
// ─────────────────────────────────────────────────────────────────────────────

export type OpportunitiesSection = "synthese" | "besoins" | "avant-vente" | "planning"

/** Route canonique du workspace (OPP-02 — inchangée). */
export const OPPORTUNITIES_CANONICAL_PATH = "/missions/opps"

/** État racine canonique, rendu SANS paramètre `section` (OPP-04). */
export const OPPORTUNITIES_ROOT_SECTION = "synthese" as const

/** Les 4 chapitres, dans l'ordre canonique du rail. */
export const OPPORTUNITIES_SECTION_KEYS = [
  "synthese",
  "besoins",
  "avant-vente",
  "planning",
] as const

const SECTION_KEY_SET = new Set<string>(OPPORTUNITIES_SECTION_KEYS)

/**
 * Paramètres décrivant l'état interne / éphémère d'UN chapitre : au changement de
 * chapitre ils sont retirés de l'URL (état du chapitre frère, non pertinent sur
 * la cible).
 * → OPP-17 (filtres legacy `NeedsStaffingWorkspace`), OPP-23/OPP-26 (`opp` =
 *   besoin sélectionné du chapitre Besoins), OPP-30 (`module` = module contextuel
 *   ouvert au-dessus du chapitre courant).
 */
export const LEGACY_NEEDS_STAFFING_QUERY_KEYS = [
  "scope",
  "view",
  "stage",
  "priority",
  "practice",
  "sort",
  "direction",
  "opp",
  "module",
] as const

/** Libellé affiché dans le header de la zone principale (jamais dans le chapeau). */
export const HEADER_TITLE_BY_SECTION: Record<OpportunitiesSection, string> = {
  synthese: "Vue d'ensemble",
  besoins: "Besoins & Staffing",
  "avant-vente": "Avant-vente Projets",
  planning: "Planning & Échéances",
}

export interface OpportunitiesSectionEntry {
  key: OpportunitiesSection
  label: string
}

export const OPPORTUNITIES_SECTIONS: readonly OpportunitiesSectionEntry[] = [
  { key: "synthese", label: "Vue d'ensemble" },
  { key: "besoins", label: "Besoins & Staffing" },
  { key: "avant-vente", label: "Avant-vente Projets" },
  { key: "planning", label: "Planning & Échéances" },
]

type RawSearchParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key)
  const value = params[key]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Résout le chapitre actif à partir des query params.
 *
 * Déterministe :
 * - `section` absent / `null` / vide → `synthese`, SAUF si `scope` (needs|staffing)
 *   est présent → `besoins` (compat OPP-16) ;
 * - `section` = valeur connue → cette valeur (`synthese` inclus) ;
 * - `section` = valeur inconnue → `synthese` (un `section` explicite l'emporte
 *   sur `scope`).
 */
export function parseOpportunitiesSection(params: RawSearchParams): OpportunitiesSection {
  const rawSection = readParam(params, "section")?.trim()

  if (rawSection) {
    return SECTION_KEY_SET.has(rawSection)
      ? (rawSection as OpportunitiesSection)
      : OPPORTUNITIES_ROOT_SECTION
  }

  const scope = readParam(params, "scope")
  if (scope === "needs" || scope === "staffing") return "besoins"

  return OPPORTUNITIES_ROOT_SECTION
}

interface SearchParamsSnapshot {
  toString(): string
}

/**
 * Construit le href canonique d'un chapitre.
 * - `synthese` (racine) : supprime `section` de l'URL ;
 * - autres chapitres : pose / met à jour `section` ;
 * - les paramètres métier legacy (`LEGACY_NEEDS_STAFFING_QUERY_KEYS`) sont
 *   retirés (état du chapitre frère) ;
 * - tous les autres query params (tiers) sont strictement préservés.
 */
export function buildOpportunitiesSectionHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  nextSection: OpportunitiesSection,
): string {
  const next = new URLSearchParams(searchParams.toString())

  next.delete("section")
  for (const key of LEGACY_NEEDS_STAFFING_QUERY_KEYS) next.delete(key)

  if (nextSection !== OPPORTUNITIES_ROOT_SECTION) next.set("section", nextSection)

  const query = next.toString()
  return query ? `${pathname}?${query}` : pathname
}

/** Aplati un `searchParams` de Server Component en chaîne de query. */
export function searchParamsToString(
  params: Record<string, string | string[] | undefined>,
): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) sp.append(key, item)
    } else if (typeof value === "string") {
      sp.append(key, value)
    }
  }
  return sp.toString()
}
