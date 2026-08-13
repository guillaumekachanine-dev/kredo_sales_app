import 'server-only'

/**
 * Adaptateur API France Travail « Offres d'emploi v2 » (A7 / B2).
 *
 * Tout ce qui suit a été CONSTATÉ le 2026-08-13 par les sondes
 * `scripts/probe-france-travail-api.mjs` et `probe-france-travail-strategy.mjs`,
 * pas déduit d'une documentation. Les points établis :
 *
 *  1. `secteurActivite` n'accepte qu'une DIVISION NAF sur 2 chiffres. Le code
 *     complet est rejeté : `secteurActivite=3030Z` → HTTP 400
 *     « Valeur du paramètre "secteurActivite" incorrecte ».
 *  2. `departement` accepte plusieurs valeurs séparées par des virgules.
 *  3. Le nom de l'employeur est en `entreprise.nom`.
 *  4. L'anonymat se manifeste par un objet `entreprise` PRÉSENT dont `nom` est
 *     ABSENT (ex. `{"entrepriseAdaptee":false}`) — jamais par un `entreprise: null`.
 *  5. Le préfixe ROME `M18` décrit bien les métiers SI (M1879 = « Ingénieur Cloud
 *     computing »), ce que la sonde a vu sur un compte réel du segment.
 *  6. `motsCles` N'INDEXE PAS le nom de l'employeur : rechercher « thales alenia
 *     space », « arianegroup », « eutelsat » ou « telespazio » rend HTTP 204. Le
 *     rattachement ne peut donc pas passer par le mot-clé, d'où l'enveloppe
 *     géographique de `build-search-envelope.ts`.
 *  7. Les offres portent le `codeNAF` de leur employeur (les 4 offres Thales
 *     Alenia observées portent toutes `30.30Z`), ce qui rend l'enveloppe par
 *     division NAF fiable — et les divisions informatiques 62/63/72 ne
 *     contiennent aucune offre des comptes du segment.
 *  8. Statuts : 200 lot complet · 206 lot partiel · **204 aucun résultat**.
 *     Le 204 a un corps vide : le parser doit le traiter avant tout `JSON.parse`.
 */

import type { NormalizedJobOffer, SearchEnvelope } from '../domain/hiring-intensity.types'

const TOKEN_URL =
  process.env.FRANCE_TRAVAIL_TOKEN_URL ??
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
const SCOPE = process.env.FRANCE_TRAVAIL_SCOPE ?? 'api_offresdemploiv2 o2dsoffre'
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search'

/** Quota annoncé : 3 requêtes/seconde. On reste volontairement en dessous. */
const MIN_INTERVAL_MS = 400
/** L'API ne laisse consulter que les 1 150 premières offres d'une recherche. */
const MAX_OFFSET = 1000
const PAGE_SIZE = 150

export class FranceTravailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'FranceTravailError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let cachedToken: { value: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  // Le jeton vaut ~25 minutes (1499 s constatées). On garde une marge de 60 s.
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new FranceTravailError(
      'FRANCE_TRAVAIL_CLIENT_ID / _SECRET absents de l’environnement',
      0,
    )
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
    }),
  })
  if (!response.ok) {
    // Le corps peut contenir un descriptif d'erreur ; il ne contient jamais le secret.
    throw new FranceTravailError(`Échec de l’obtention du jeton`, response.status)
  }
  const payload = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) throw new FranceTravailError('Réponse sans access_token', 200)

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 1499) * 1000,
  }
  return cachedToken.value
}

interface RawOffer {
  id?: string
  intitule?: string
  description?: string
  romeCode?: string
  dateCreation?: string
  codeNAF?: string
  entreprise?: { nom?: string } | null
  lieuTravail?: { libelle?: string; codePostal?: string } | null
  origineOffre?: { urlOrigine?: string } | null
}

function normalize(raw: RawOffer): NormalizedJobOffer | null {
  if (!raw.id) return null
  return {
    id: raw.id,
    intitule: raw.intitule ?? '',
    description: raw.description ?? null,
    romeCode: raw.romeCode ?? null,
    // `entreprise` présent mais sans `nom` = offre anonymisée (point 4).
    employerName: raw.entreprise?.nom ?? null,
    departement: raw.lieuTravail?.codePostal?.slice(0, 2) ?? null,
    dateCreation: raw.dateCreation ?? null,
    url: raw.origineOffre?.urlOrigine ?? null,
  }
}

/**
 * Récupère toutes les offres de l'enveloppe, en paginant jusqu'au plafond de l'API.
 * Renvoie aussi `truncated` : l'enveloppe a-t-elle dépassé ce que l'API laisse voir ?
 * Une mesure calculée sur un lot tronqué doit le dire, sans quoi sa couverture ment.
 */
export async function fetchOffersForEnvelope(
  envelope: SearchEnvelope,
): Promise<{ offers: NormalizedJobOffer[]; total: number; truncated: boolean }> {
  if (!envelope.nafDivision || envelope.departements.length === 0) {
    return { offers: [], total: 0, truncated: false }
  }

  const token = await getAccessToken()
  const offers: NormalizedJobOffer[] = []
  let total = 0
  let offset = 0
  let truncated = false

  for (;;) {
    const params = new URLSearchParams({
      secteurActivite: envelope.nafDivision,
      departement: envelope.departements.join(','),
      range: `${offset}-${offset + PAGE_SIZE - 1}`,
    })
    const response = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    // 204 = aucun résultat, corps vide : ne jamais tenter de le parser (point 8).
    if (response.status === 204) break
    if (!response.ok && response.status !== 206) {
      throw new FranceTravailError(
        `Recherche en échec (secteur ${envelope.nafDivision}, dép. ${envelope.departements.join(',')})`,
        response.status,
      )
    }

    const contentRange = response.headers.get('Content-Range') ?? ''
    const totalMatch = contentRange.match(/\/(\d+)\s*$/)
    if (totalMatch) total = Number(totalMatch[1])

    const payload = (await response.json()) as { resultats?: RawOffer[] }
    const page = payload.resultats ?? []
    for (const raw of page) {
      const offer = normalize(raw)
      if (offer) offers.push(offer)
    }

    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    if (offset > MAX_OFFSET) {
      truncated = total > offers.length
      break
    }
    await sleep(MIN_INTERVAL_MS)
  }

  return { offers, total, truncated }
}
