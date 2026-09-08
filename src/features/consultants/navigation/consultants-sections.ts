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
//  Lot 1 : seuls `synthese` et `collaborateurs` sont rendus dans le shell via
//  `?section=`. Les trois autres chapitres pointent vers leur emplacement actuel
//  (`external: true`) et migreront vers `?section=` dans leur lot dédié.
// ─────────────────────────────────────────────────────────────────────────────

export type ConsultantsSection =
  | "synthese"
  | "collaborateurs"
  | "activite-conges"
  | "candidats"
  | "pool-competences"

/** État racine canonique (rendu sans paramètre `section`). */
export const CONSULTANTS_ROOT_SECTION = "synthese" as const

/** Sections réellement rendues par le shell `/consultants` (Lot 1). */
export const CONSULTANTS_IN_SHELL_SECTIONS = ["synthese", "collaborateurs"] as const
export type ConsultantsInShellSection = (typeof CONSULTANTS_IN_SHELL_SECTIONS)[number]

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
    href: "/consultants/activite-conges",
    external: true,
    internalizedAtLot: 5,
  },
  {
    key: "candidats",
    label: "Candidats",
    href: "/recruitment",
    external: true,
    internalizedAtLot: 8,
  },
  {
    key: "pool-competences",
    label: "Pool de compétences",
    href: "/consultants/pool-competences",
    external: true,
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
  return value === "collaborateurs" ? "collaborateurs" : CONSULTANTS_ROOT_SECTION
}

/** Construit le href canonique d'une section rendue dans le shell. */
export function buildConsultantsSectionHref(section: ConsultantsInShellSection): string {
  return section === CONSULTANTS_ROOT_SECTION
    ? "/consultants"
    : `/consultants?section=${section}`
}
