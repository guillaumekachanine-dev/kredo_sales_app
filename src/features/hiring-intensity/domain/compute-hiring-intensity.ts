/**
 * Agrégation A7 : d'un lot d'offres à une mesure d'intensité SI datée.
 *
 * Le contrat E2 §4.3 produit deux écritures : un `account_fact`
 * `it_hiring_intensity` (la mesure) et un `account_signal` `hiring_signal` (émis
 * au franchissement du seuil). Ce module calcule les deux décisions ; il n'écrit
 * rien — l'écriture suppose qu'un appel réel ait tourné.
 *
 * La mesure publie sa propre couverture. Sans elle, « 18 offres » ne veut rien
 * dire : on ignore si c'est 18 sur 20 attribuables ou 18 sur 200 dont 180
 * anonymes. C'est la différence entre un comptage et une mesure.
 */

import type { OfferPracticeSlug } from '@/lib/config/practices'
import type {
  ClassifiedOffer,
  HiringIntensity,
  NormalizedJobOffer,
} from './hiring-intensity.types'
import { classifyOffer, isInformationSystemsOffer } from './classify-offer'
import { matchEmployer } from './match-employer'

/**
 * Seuil par défaut d'émission du signal. C'est un choix de politique commerciale,
 * pas une propriété des données : trois postes SI ouverts simultanément chez un
 * compte cessent d'être du renouvellement et deviennent un chantier. Il est porté
 * par la mesure pour qu'un lecteur puisse en juger.
 */
export const DEFAULT_HIRING_SIGNAL_THRESHOLD = 3

export interface ComputeInput {
  companyId: string
  /** Offres de l'enveloppe, toutes entreprises confondues. */
  offers: NormalizedJobOffer[]
  /** Alias issus de `buildSearchEnvelope`. */
  employerAliases: string[]
  measuredAt: string
  threshold?: number
}

export interface ComputeResult {
  intensity: HiringIntensity
  /** Offres retenues, avec leur classement et leur appariement — la trace. */
  matched: ClassifiedOffer[]
}

export function computeHiringIntensity({
  companyId,
  offers,
  employerAliases,
  measuredAt,
  threshold = DEFAULT_HIRING_SIGNAL_THRESHOLD,
}: ComputeInput): ComputeResult {
  // Une même offre peut revenir sur plusieurs pages de résultats.
  const uniques = new Map<string, NormalizedJobOffer>()
  for (const offer of offers) {
    if (offer.id && !uniques.has(offer.id)) uniques.set(offer.id, offer)
  }

  const matched: ClassifiedOffer[] = []
  const byPractice: Partial<Record<OfferPracticeSlug, number>> = {}
  let anonymous = 0
  let otherEmployer = 0

  for (const offer of uniques.values()) {
    if (!isInformationSystemsOffer(offer)) continue

    const employerName = (offer.employerName ?? '').trim()
    if (!employerName) {
      anonymous += 1
      continue
    }

    const employerMatch = matchEmployer(employerName, employerAliases)
    if (employerMatch.level === 'none') {
      otherEmployer += 1
      continue
    }

    const { practice, matchedTerms } = classifyOffer(offer)
    matched.push({ offer, practice, matchedTerms, employerMatch })
    if (practice) byPractice[practice] = (byPractice[practice] ?? 0) + 1
  }

  const attribuables = matched.length + otherEmployer
  const totalSi = attribuables + anonymous

  return {
    intensity: {
      companyId,
      measuredAt,
      offersMatched: matched.length,
      byPractice,
      offersAnonymous: anonymous,
      offersOtherEmployer: otherEmployer,
      recall: totalSi === 0 ? 0 : Number((attribuables / totalSi).toFixed(3)),
      threshold,
      emitsSignal: matched.length >= threshold,
    },
    matched,
  }
}

/**
 * Résumé lisible de la mesure, destiné à `account_facts.value_text`.
 * Il énonce toujours la couverture : une mesure qui tait son angle mort se lit
 * comme une certitude, et c'est exactement ce que A11 interdit.
 */
export function describeIntensity(intensity: HiringIntensity): string {
  if (intensity.offersMatched === 0) {
    return `Aucune offre SI attribuée au compte sur l'enveloppe interrogée (${intensity.offersAnonymous} offre(s) SI à employeur anonymisé, non attribuables).`
  }
  const ventilation = Object.entries(intensity.byPractice)
    .sort((a, b) => b[1] - a[1])
    .map(([practice, count]) => `${practice} ${count}`)
    .join(', ')
  const couverture = Math.round(intensity.recall * 100)
  return (
    `${intensity.offersMatched} offre(s) SI attribuée(s) au compte` +
    (ventilation ? ` (${ventilation})` : '') +
    `. Couverture de la mesure : ${couverture} % des offres SI de l'enveloppe portent un employeur identifiable` +
    (intensity.offersAnonymous > 0 ? `, ${intensity.offersAnonymous} sont anonymisées.` : '.')
  )
}
