// Modules canoniques d'Account Intelligence.
// Contrat : docs/FEATURES/cockpit_intelligence_features/account_intelligence/03-CONTRAT-NIVEAUX-ET-MODULES.md §3
//
// Ce sont ces identifiants qui circulent dans les contrats de lancement et dans
// `account_source_documents.serves_modules` — JAMAIS des libellés d'interface.
//
// Le précédent à ne pas reproduire : la branche V3 d'intel-030 mappe les sujets demandés
// par l'UI via `SUBJECT_TO_SEGMENTS`, dont les clés sont des chaînes françaises
// (`'Fiche d’identité'`, `'Métiers et chaîne de valeur'`…). Renommer un libellé à l'écran
// y casse silencieusement le périmètre d'analyse — le workflow retombe alors sur
// « étude complète » via un garde-fou, ce qui masque la panne au lieu de la signaler.

export const ACCOUNT_INTELLIGENCE_MODULES = [
  "entity_resolution",
  "identity",
  "size_and_financials",
  "ownership",
  "business_and_offering",
  "business_model",
  "customers_and_market",
  "history",
  "news",
  "ambitions",
  "sector_dynamics",
  "competition",
  "value_chain",
  "technology_trends",
  "regulatory",
  "organisation",
  "dependencies",
  "it_intensity",
  "kredo_relation",
  "issues",
] as const

export type AccountIntelligenceModule = (typeof ACCOUNT_INTELLIGENCE_MODULES)[number]

export type AccountIntelligenceLevel = 1 | 2 | 3 | 4

/**
 * Modules couverts par niveau. Cumulatif : L2 inclut L1, L3 inclut L1+L2, L4 inclut tout.
 * `optional` = proposé en paramètres avancés, décochable ; les autres sont couverts d'office.
 */
const LEVEL_MODULES: Record<AccountIntelligenceLevel, {
  covered: AccountIntelligenceModule[]
  optional: AccountIntelligenceModule[]
}> = {
  1: {
    covered: ["entity_resolution", "identity", "size_and_financials", "kredo_relation"],
    optional: ["ownership", "business_and_offering"],
  },
  2: {
    covered: [
      "business_and_offering", "business_model", "customers_and_market",
      "history", "news", "ambitions", "ownership",
    ],
    optional: [],
  },
  3: {
    covered: ["sector_dynamics", "competition", "value_chain", "technology_trends"],
    optional: ["regulatory", "dependencies"],
  },
  4: {
    covered: ["regulatory", "organisation", "dependencies", "it_intensity", "issues"],
    optional: [],
  },
}

/**
 * Modules d'un niveau, cumul des niveaux inférieurs compris.
 * `includeOptional` ajoute les modules de paramètres avancés.
 */
export function modulesForLevel(
  level: AccountIntelligenceLevel,
  options: { includeOptional?: boolean } = {}
): AccountIntelligenceModule[] {
  const seen = new Set<AccountIntelligenceModule>()
  for (let current = 1; current <= level; current += 1) {
    const bucket = LEVEL_MODULES[current as AccountIntelligenceLevel]
    for (const moduleId of bucket.covered) seen.add(moduleId)
    if (options.includeOptional) for (const moduleId of bucket.optional) seen.add(moduleId)
  }
  // Ordre canonique stable, indépendant de l'ordre de déclaration par niveau.
  return ACCOUNT_INTELLIGENCE_MODULES.filter((moduleId) => seen.has(moduleId))
}

/**
 * A1 — la résolution d'entité et l'identité ne sont jamais désactivables.
 * Mieux vaut une étude partielle de la bonne entreprise qu'une étude parfaite d'un homonyme.
 */
export const NON_DISABLEABLE_MODULES: readonly AccountIntelligenceModule[] = [
  "entity_resolution",
  "identity",
] as const

export function isAccountIntelligenceModule(value: string): value is AccountIntelligenceModule {
  return (ACCOUNT_INTELLIGENCE_MODULES as readonly string[]).includes(value)
}

/**
 * Modules dont la matière est INTERNE : ils ne justifient jamais à eux seuls une
 * recherche externe (axiome A7). `kredo_relation` est purement relationnel ;
 * les quatre modules d'écosystème lisent d'abord la Master Study et ne recherchent
 * que sur les écarts propres au compte.
 */
export const INTERNAL_FIRST_MODULES: readonly AccountIntelligenceModule[] = [
  "kredo_relation",
  "sector_dynamics",
  "competition",
  "value_chain",
  "regulatory",
] as const

/** Un module exige-t-il potentiellement une collecte externe ? */
export function requiresExternalResearch(moduleId: AccountIntelligenceModule): boolean {
  return moduleId !== "kredo_relation"
}
