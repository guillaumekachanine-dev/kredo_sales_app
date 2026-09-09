// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — contrat de navigation secondaire (SHELL-0018 V2)
//
//  Chantier : docs/FEATURES/consultants_workspace/
//  Standard : docs/navigation_architecture/SHELL-0018/02-SECONDARY-RAIL-STANDARD.md
//  Cible    : docs/navigation_architecture/SHELL-0018/09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09.md §B.3
//
//  Contrat URL (pathname stable `/consultants`, aucun redirect nouveau) :
//    /consultants                              → Vue d'ensemble (racine, sans paramètre)
//    /consultants?section=collaborateurs
//    /consultants?section=activite-conges
//    /consultants?section=candidats
//    /consultants?section=pool-competences     → compat historique (Mobile : vue Pool ;
//                                                Desktop : module « Pool de compétences »)
//    /consultants?module=pool-competences      → module Desktop « Pool de compétences »
//    /consultants?module=production-conges
//    /consultants?module=matching-profil
//
//  Phase 7.2 — alignement cible :
//   - libellés produit : Synthèse → « Vue d'ensemble », Candidats → « Vivier Candidats »,
//     « Activités & congés » → « Activité & Congés » (les clés techniques restent stables) ;
//   - `pool-competences` **sort des chapitres Desktop** et devient un **Module Desktop**
//     (`CONSULTANTS_CONTEXTUAL_MODULES`). Le composant et la Data existants
//     (`src/features/consultants/skills/`, `get-consultants-skills.ts`) sont réutilisés tels quels.
//   - `pool-competences` **reste une section adressable** (`CONSULTANTS_SECTIONS`, 5 entrées) pour
//     la navigation Mobile et la compatibilité `?section=pool-competences` :
//     `SEPARATE IMPLEMENTATION` / dette adaptative (voir dette SKILLS-1), **pas un oubli**.
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
  synthese: "Vue d’ensemble",
  collaborateurs: "Collaborateurs",
  "activite-conges": "Activité & Congés",
  candidats: "Vivier Candidats",
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
    label: "Vue d’ensemble",
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
    label: "Activité & Congés",
    href: "/consultants?section=activite-conges",
    external: false,
    internalizedAtLot: 5,
  },
  {
    key: "candidats",
    label: "Vivier Candidats",
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

// ─────────────────────────────────────────────────────────────────────────────
//  Chapitres Desktop (Phase 7.2)
//
//  Le rail Desktop ne rend QUE ces quatre chapitres. `pool-competences` en est
//  volontairement absent : il est devenu un Module Desktop (voir plus bas). Il
//  reste néanmoins une section adressable (`CONSULTANTS_SECTIONS`) pour la
//  navigation Mobile et la compatibilité `?section=pool-competences`.
// ─────────────────────────────────────────────────────────────────────────────

export type ConsultantsDesktopChapter = Exclude<ConsultantsInShellSection, "pool-competences">

export const CONSULTANTS_DESKTOP_CHAPTER_KEYS = [
  "synthese",
  "collaborateurs",
  "activite-conges",
  "candidats",
] as const satisfies readonly ConsultantsDesktopChapter[]

const DESKTOP_CHAPTER_KEY_SET = new Set<string>(CONSULTANTS_DESKTOP_CHAPTER_KEYS)

/** Chapitres rendus dans la section « Chapitres » du `SectionRail` Desktop. */
export const CONSULTANTS_DESKTOP_CHAPTERS: readonly ConsultantsSectionEntry[] =
  CONSULTANTS_SECTIONS.filter((entry) => DESKTOP_CHAPTER_KEY_SET.has(entry.key))

// ─────────────────────────────────────────────────────────────────────────────
//  Modules contextuels du rail Consultants Workspace
//   - `pool-competences` : ex-chapitre monté en module Desktop (Phase 7.2 / TRANSFORM).
//   - `production-conges` : Lot 12.
//   - `matching-profil`   : Lot 13.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSULTANTS_CONTEXTUAL_MODULES = [
  "pool-competences",
  "production-conges",
  "matching-profil",
] as const
export type ConsultantsContextualModule = (typeof CONSULTANTS_CONTEXTUAL_MODULES)[number]

const CONTEXTUAL_MODULE_SET = new Set<string>(CONSULTANTS_CONTEXTUAL_MODULES)

export function parseConsultantsModule(
  raw: string | string[] | null | undefined,
): ConsultantsContextualModule | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && CONTEXTUAL_MODULE_SET.has(value)
    ? (value as ConsultantsContextualModule)
    : null
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

// ─────────────────────────────────────────────────────────────────────────────
//  Résolution Desktop pure (Phase 7.2)
//
//  Traduit les paramètres d'URL bruts en un état Desktop effectif :
//   - `chapter` : l'un des quatre chapitres Desktop ;
//   - `module`  : le module ouvert au-dessus du chapitre (ou `null`).
//
//  Compatibilité `?section=pool-competences` : sur Desktop, `pool-competences`
//  n'est plus un chapitre. La requête est interprétée comme un accès de
//  compatibilité au **module** « Pool de compétences », rendu au-dessus du
//  chapitre support « Vue d'ensemble » (`synthese`). Aucun `permanentRedirect`
//  n'est ajouté : l'ancien bookmark continue de fonctionner, réinterprété selon
//  le device.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultantsDesktopEntry {
  chapter: ConsultantsDesktopChapter
  module: ConsultantsContextualModule | null
}

export function resolveConsultantsDesktopEntry(
  rawSection: string | string[] | null | undefined,
  rawModule: string | string[] | null | undefined,
): ConsultantsDesktopEntry {
  const requestedSection = parseConsultantsSection(rawSection)
  const requestedModule = parseConsultantsModule(rawModule)

  if (requestedSection === "pool-competences") {
    return {
      chapter: CONSULTANTS_ROOT_SECTION,
      module: requestedModule ?? "pool-competences",
    }
  }

  return { chapter: requestedSection, module: requestedModule }
}
