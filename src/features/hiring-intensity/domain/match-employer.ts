/**
 * Appariement offre → compte, faute de filtre SIREN dans l'API (A7).
 *
 * C'est le maillon faible assumé de A7, et il est conçu pour se tromper dans le
 * sens sûr : mieux vaut ne pas rattacher une offre que la rattacher au mauvais
 * compte. Un faux positif contamine une mesure présentée à un DSI ; un faux
 * négatif se voit dans le taux de rappel, qui est publié avec la mesure.
 *
 * Le piège concret du segment Spatial-Défense : « THALES » seul apparie aussi
 * bien THALES ALENIA SPACE FRANCE que THALES SIX GTS FRANCE, qui sont deux
 * comptes distincts avec deux SIREN distincts. Un alias d'un seul mot n'autorise
 * donc jamais un appariement par inclusion.
 */

import type { EmployerMatch } from './hiring-intensity.types'
import { normalizeText } from './classify-offer'

/** Formes juridiques et mentions sans valeur discriminante. */
const LEGAL_FORMS = new Set([
  'sas', 'sasu', 'sa', 'sarl', 'eurl', 'snc', 'sci', 'gie', 'scop', 'se',
  'societe', 'groupe', 'group', 'france', 'holding', 'et', 'de', 'du', 'des', 'la', 'le', 'les',
])

/** Tokens signifiants d'un nom d'entreprise, formes juridiques retirées. */
export function employerTokens(name: string | null | undefined): string[] {
  return normalizeText(name)
    .split(' ')
    .filter((token) => token.length > 1 && !LEGAL_FORMS.has(token))
}

/**
 * `france` est retiré comme mot vide, mais il distingue réellement certaines
 * entités (« OHB FRANCE » vs « OHB SE »). On conserve donc la forme complète
 * pour l'égalité stricte, et la forme réduite pour l'inclusion.
 */
function fullKey(name: string | null | undefined): string {
  return normalizeText(name).split(' ').filter(Boolean).join(' ')
}

export function matchEmployer(
  employerName: string | null | undefined,
  aliases: string[],
): EmployerMatch {
  if (!employerName) return { level: 'none', via: null }

  const offerFull = fullKey(employerName)
  const offerTokens = employerTokens(employerName)
  if (offerTokens.length === 0) return { level: 'none', via: null }
  const offerSet = new Set(offerTokens)

  for (const alias of aliases) {
    if (!alias) continue
    if (offerFull && offerFull === fullKey(alias)) return { level: 'exact', via: alias }
  }

  for (const alias of aliases) {
    const aliasTokens = employerTokens(alias)
    if (aliasTokens.length === 0) continue

    // Alias d'un seul mot : égalité de l'ensemble des tokens exigée. Sans cette
    // règle, « Thales » avalerait les deux comptes Thales du segment.
    if (aliasTokens.length === 1) {
      if (offerTokens.length === 1 && offerTokens[0] === aliasTokens[0]) {
        return { level: 'strong', via: alias }
      }
      continue
    }

    // Alias de deux mots ou plus : tous ses tokens doivent être présents.
    if (aliasTokens.every((token) => offerSet.has(token))) return { level: 'strong', via: alias }
  }

  return { level: 'none', via: null }
}
