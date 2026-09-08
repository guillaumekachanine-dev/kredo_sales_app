// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — contrat de navigation secondaire (SHELL-0018 V2)
//
//  Chantier : docs/FEATURES/consultants_workspace/
//  Standard : docs/navigation_architecture/SHELL-0018/02-SECONDARY-RAIL-STANDARD.md
//
//  Contrat URL cible (C-05) :
//    /consultants                              → Synthèse (racine, sans paramètre)
//    /consultants?section=collaborateurs
//    /consultants?section=activite-conges      (Lot 5)
//    /consultants?section=candidats            (Lot 8)
//    /consultants?section=pool-competences     (Lot 6)
//
//  Internalisation progressive (`external: false`) : `synthese` + `collaborateurs`
//  (Lot 1), `activite-conges` (Lot 5), `pool-competences` (Lot 6), `candidats`
//  (Lot 8). La route `/recruitment` est dépréciée et redirige de façon permanente vers `/consultants?section=candidats` (Lot 10).
// ─────────────────────────────────────────────────────────────────────────────

export type ConsultantsSection =
  | "synthese"
  | "collaborateurs"
  | "activite-conges"
  | "candidats"
  | "pool-competences"

/** État racine canonique (rendu sans paramètre `section`). */
export const CONSULTANTS_ROOT_SECTION = "synthese" as const

/** Sections réellement rendues par le shell `/consultants` via `?section=`. */
export const CONSULTANTS_IN_SHELL_SECTIONS = [
  "synthese",
  "collaborateurs",
  "activite-conges",
  "candidats",
  "pool-competences",
] as const
export type ConsultantsInShellSection = (typeof CONSULTANTS_IN_SHELL_SECTIONS)[number]

const IN_SHELL_SECTION_SET = new Set<string>(CONSULTANTS_IN_SHELL_SECTIONS)

/** Libellé affiché dans le header de la zone principale (jamais dans le chapeau). */
export const HEADER_TITLE_BY_SECTION: Record<ConsultantsSection, string> = {
  synthese: "Synthèse",
  collaborateurs: "Collaborateurs",
  "activite-conges": "Activités & congés",
  candidats: "Candidats",
  "pool-competences": "Pool de compétences",
}

export interface ConsultantsSectionEntry {
  key: ConsultantsSection
  label: string
  href: string
  /**
   * `true` tant que la section n'est pas rendue dans le shell `/consultants` :
   * le rail y renvoie par un lien direct (route existante) plutôt que par
   * `?section=`. Passe à `false` au lot qui internalise la section.
   */
  external: boolean
  /** Lot du chantier qui internalise la section (documentaire). */
  internalizedAtLot: number | null
}

export const CONSULTANTS_SECTIONS: readonly ConsultantsSectionEntry[] = [
  {
    key: "synthese",
    label: "Synthèse",
    href: "/consultants",
    external: false,
    internalizedAtLot: 1,
  },
  {
    key: "collaborateurs",
    label: "Collaborateurs",
    href: "/consultants?section=collaborateurs",
    external: false,
    internalizedAtLot: 1,
  },
  {
    key: "activite-conges",
    label: "Activités & congés",
    href: "/consultants?section=activite-conges",
    external: false,
    internalizedAtLot: 5,
  },
  {
    key: "candidats",
    label: "Candidats",
    href: "/consultants?section=candidats",
    external: false,
    internalizedAtLot: 8,
  },
  {
    key: "pool-competences",
    label: "Pool de compétences",
    href: "/consultants?section=pool-competences",
    external: false,
    internalizedAtLot: 6,
  },
]

/**
 * Résout la section active du shell à partir du paramètre d'URL `section`.
 * Toute valeur inconnue (ou une section pas encore internalisée) retombe sur
 * l'état racine `synthese`.
 */
export function parseConsultantsSection(
  raw: string | string[] | null | undefined,
): ConsultantsInShellSection {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && IN_SHELL_SECTION_SET.has(value)
    ? (value as ConsultantsInShellSection)
    : CONSULTANTS_ROOT_SECTION
}

/** Construit le href canonique d'une section rendue dans le shell. */
export function buildConsultantsSectionHref(section: ConsultantsInShellSection): string {
  return section === CONSULTANTS_ROOT_SECTION
    ? "/consultants"
    : `/consultants?section=${section}`
}

/** Modules contextuels du rail Consultants Workspace (Lots 12 et 13). */
export const CONSULTANTS_CONTEXTUAL_MODULES = [
  "production-conges",
  "matching-profil",
] as const
export type ConsultantsContextualModule = (typeof CONSULTANTS_CONTEXTUAL_MODULES)[number]

export function parseConsultantsModule(
  raw: string | string[] | null | undefined,
): ConsultantsContextualModule | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === "production-conges") return "production-conges"
  if (value === "matching-profil") return "matching-profil"
  return null
}

export function buildConsultantsModuleHref(
  section: ConsultantsInShellSection,
  module: ConsultantsContextualModule | null,
  personId?: string | null,
): string {
  const base = buildConsultantsSectionHref(section)
  if (!module) return base
  const separator = base.includes("?") ? "&" : "?"
  const personQuery = personId ? `&person=${encodeURIComponent(personId)}` : ""
  return `${base}${separator}module=${module}${personQuery}`
}
