/**
 * Enveloppe de requête A7, dérivée du registre — pas d'un filtre SIREN.
 *
 * L'API « Offres d'emploi v2 » ne sait pas filtrer par entreprise. On construit
 * donc le plus petit périmètre qui contienne certainement les offres du compte —
 * sa division NAF et les départements de ses établissements — puis on apparie sur
 * le nom de l'employeur (`match-employer.ts`).
 *
 * Les entrées viennent des faits déjà écrits par le socle A1 : `legal_id`,
 * `establishment`, et `companies.naf_code`. Aucun appel réseau ici.
 */

import type { SearchEnvelope } from './hiring-intensity.types'

export interface EnvelopeInput {
  /** Raison sociale exacte du registre, ex. « THALES ALENIA SPACE FRANCE ». */
  legalName: string | null
  /** Nom du compte dans Kredo, souvent différent du nom légal. */
  accountName?: string | null
  /** `companies.naf_code`, ex. `3030Z`. */
  nafCode: string | null
  /** Adresses des établissements (faits `establishment`), une par ligne. */
  establishmentAddresses: string[]
}

/**
 * Département depuis un code postal français.
 * La Corse (20xxx) est rendue `20` : le code postal ne permet pas de trancher
 * entre 2A et 2B, et inventer l'un des deux serait une donnée fausse.
 * L'outre-mer (97x/98x) tient sur trois chiffres.
 */
export function departementFromPostalCode(code: string): string | null {
  if (!/^\d{5}$/.test(code)) return null
  if (code.startsWith('97') || code.startsWith('98')) return code.slice(0, 3)
  if (code.startsWith('20')) return '20'
  return code.slice(0, 2)
}

export function extractDepartements(addresses: string[]): string[] {
  const found = new Set<string>()
  for (const address of addresses) {
    // Un code postal est un groupe de 5 chiffres isolé — pas les 5 premiers
    // chiffres d'un numéro de voie ni d'un SIRET collé au libellé.
    for (const match of address.matchAll(/\b(\d{5})\b/g)) {
      const dept = departementFromPostalCode(match[1])
      if (dept) found.add(dept)
    }
  }
  return [...found].sort()
}

/** `3030Z` → `30`. La division NAF est la granularité du filtre secteur. */
export function nafDivision(nafCode: string | null): string | null {
  if (!nafCode) return null
  const digits = nafCode.replace(/\D/g, '')
  return digits.length >= 2 ? digits.slice(0, 2) : null
}

export function buildSearchEnvelope(input: EnvelopeInput): SearchEnvelope {
  const aliases: string[] = []
  const push = (value: string | null | undefined) => {
    const trimmed = (value ?? '').trim()
    if (trimmed && !aliases.includes(trimmed)) aliases.push(trimmed)
  }

  push(input.legalName)
  push(input.accountName)

  // Un nom de compte Kredo agrège parfois deux entités (« ArianeGroup / Arianespace »,
  // « Leonardo / Telespazio »). Chaque branche devient un alias à part entière :
  // l'appariement se fera sur celle qui correspond, pas sur la chaîne complète qui
  // ne correspond à aucun employeur réel.
  for (const part of (input.accountName ?? '').split(/[/|]/)) push(part)

  return {
    nafDivision: nafDivision(input.nafCode),
    departements: extractDepartements(input.establishmentAddresses),
    employerAliases: aliases,
  }
}
