/**
 * A7 — Intensité SI (MASTER STUDY, E2 §4.3).
 *
 * Ce module est volontairement SANS RÉSEAU. Il décrit une offre d'emploi déjà
 * normalisée, la classe par practice KREDO, l'apparie à un compte et agrège la
 * mesure. Tout ce qui touche l'API France Travail — OAuth, noms de paramètres,
 * pagination — vit derrière l'adaptateur `fetch-offers`, non écrit tant qu'aucun
 * appel réel n'a pu être joué : ces détails ne se devinent pas, ils se constatent.
 *
 * Pourquoi cette frontière
 * ────────────────────────
 * L'API « Offres d'emploi v2 » n'expose AUCUN filtre SIREN ni SIRET. L'énoncé
 * d'origine de A7 — « interroger par SIREN » — n'a donc pas de chemin d'exécution.
 * Le rattachement offre → compte se fait en deux temps : une enveloppe de requête
 * dérivée du registre (NAF, départements des établissements), puis un appariement
 * sur le nom de l'employeur. Cet appariement est faillible et une part des offres
 * est publiée en employeur anonymisé : la mesure publie donc SON PROPRE TAUX DE
 * RAPPEL. Un comptage dont on ignore la couverture n'est pas une mesure.
 */

import type { OfferPracticeSlug } from '@/lib/config/practices'

/** Une offre France Travail, réduite aux seuls champs dont A7 a besoin. */
export interface NormalizedJobOffer {
  /** Identifiant de l'offre chez France Travail — sert de clé de déduplication. */
  id: string
  intitule: string
  description?: string | null
  /** Code ROME de l'offre. `M18xx` = famille Systèmes d'information. */
  romeCode?: string | null
  /** Nom de l'employeur. `null` quand l'offre est publiée en anonyme. */
  employerName?: string | null
  /** Code postal ou département du lieu de travail. */
  departement?: string | null
  /** Date de création de l'offre, ISO. */
  dateCreation?: string | null
  /** URL publique de l'offre — la preuve opposable. */
  url?: string | null
}

/** Enveloppe de requête dérivée du registre, faute de filtre SIREN. */
export interface SearchEnvelope {
  /** Division NAF sur 2 chiffres (`3030Z` → `30`), granularité du filtre secteur. */
  nafDivision: string | null
  /** Départements des établissements connus, dédupliqués. */
  departements: string[]
  /** Formes normalisées du nom légal, utilisées pour l'appariement a posteriori. */
  employerAliases: string[]
}

export type EmployerMatchLevel = 'exact' | 'strong' | 'none'

export interface EmployerMatch {
  level: EmployerMatchLevel
  /** Alias qui a produit l'appariement, pour que la décision soit relisible. */
  via: string | null
}

export interface ClassifiedOffer {
  offer: NormalizedJobOffer
  practice: OfferPracticeSlug | null
  /** Termes qui ont déclenché la classification — jamais une boîte noire. */
  matchedTerms: string[]
  employerMatch: EmployerMatch
}

/** Le résultat de A7 pour un compte, à une date donnée. */
export interface HiringIntensity {
  companyId: string
  measuredAt: string
  /** Offres SI rattachées au compte avec un appariement retenu. */
  offersMatched: number
  /** Répartition par practice KREDO, en slugs `offer_practices.slug`. */
  byPractice: Partial<Record<OfferPracticeSlug, number>>
  /** Offres SI de l'enveloppe dont l'employeur est anonymisé : l'angle mort. */
  offersAnonymous: number
  /** Offres SI de l'enveloppe attribuées à un autre employeur. */
  offersOtherEmployer: number
  /**
   * Part des offres SI de l'enveloppe qu'on a su attribuer, anonymes comprises au
   * dénominateur. C'est la couverture de la mesure, pas sa précision.
   */
  recall: number
  /** Seuil de déclenchement du signal, porté par la mesure pour être relisible. */
  threshold: number
  /** `true` si `offersMatched >= threshold`. */
  emitsSignal: boolean
}
