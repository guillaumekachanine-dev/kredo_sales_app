#!/usr/bin/env node
/**
 * Sonde n°2 (A7 / B2) : quelle enveloppe retrouve réellement les offres d'un compte ?
 *
 *   node --env-file=.env.local scripts/probe-france-travail-strategy.mjs
 *
 * La sonde n°1 a établi que `secteurActivite` n'accepte qu'une division NAF sur
 * 2 chiffres et que `departement` accepte plusieurs valeurs. Elle a aussi montré
 * que l'enveloppe NAF 30 + dép. 31 ne rend que 51 offres, dont 3 seulement au ROME
 * M18 — et que le département seul en rend 13 497, très au-delà du plafond de
 * 1 150 offres consultables. Aucune des deux ne convient telle quelle.
 *
 * Question tranchée ici : `motsCles` retrouve-t-il les offres d'un employeur nommé ?
 * Si oui, l'enveloppe se construit sur le nom et non sur la géographie, et le NAF
 * ne sert plus que de garde-fou. Read-only, aucun secret imprimé.
 */

const ID = process.env.FRANCE_TRAVAIL_CLIENT_ID
const SECRET = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
const TOKEN_URL =
  process.env.FRANCE_TRAVAIL_TOKEN_URL ??
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
const SCOPE = process.env.FRANCE_TRAVAIL_SCOPE ?? 'api_offresdemploiv2 o2dsoffre'
const BASE = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres'

if (!ID || !SECRET) {
  console.error('✗ Identifiants absents.')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tokenRes = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ID,
    client_secret: SECRET,
    scope: SCOPE,
  }),
})
const { access_token: token } = await tokenRes.json()
console.log('✓ Jeton obtenu (non affiché).\n')

async function search(params) {
  await sleep(400)
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const range = res.headers.get('Content-Range')
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* ignoré */
  }
  return { status: res.status, range, offres: body?.resultats ?? [], body, qs }
}

/** Combien d'offres portent effectivement cet employeur ? */
function ventile(offres, motif) {
  const cible = offres.filter((o) => (o?.entreprise?.nom ?? '').toUpperCase().includes(motif))
  const anonymes = offres.filter((o) => !o?.entreprise?.nom)
  const autres = offres.length - cible.length - anonymes.length
  return { cible: cible.length, anonymes: anonymes.length, autres, exemples: cible.slice(0, 4) }
}

const CAS = [
  { label: 'motsCles = "thales alenia space"', params: { motsCles: 'thales alenia space' }, motif: 'THALES ALENIA' },
  { label: 'motsCles = "thales alenia space" + dép. 31', params: { motsCles: 'thales alenia space', departement: '31' }, motif: 'THALES ALENIA' },
  { label: 'motsCles = "arianegroup"', params: { motsCles: 'arianegroup' }, motif: 'ARIANE' },
  { label: 'motsCles = "eutelsat"', params: { motsCles: 'eutelsat' }, motif: 'EUTELSAT' },
  { label: 'motsCles = "telespazio"', params: { motsCles: 'telespazio' }, motif: 'TELESPAZIO' },
  { label: 'Enveloppe géo seule : NAF 30 + dép. 31,78,92', params: { secteurActivite: '30', departement: '31,78,92' }, motif: 'THALES ALENIA' },
]

for (const cas of CAS) {
  const r = await search({ ...cas.params, range: '0-149' })
  const v = ventile(r.offres, cas.motif)
  console.log(`── ${cas.label}`)
  console.log(`   HTTP ${r.status}  ${r.range ?? ''}`)
  console.log(
    `   ${r.offres.length} offre(s) reçues → ${v.cible} portent « ${cas.motif} », ${v.anonymes} anonyme(s), ${v.autres} autre(s) employeur(s)`,
  )
  for (const o of v.exemples) {
    console.log(`     · ${String(o.intitule).slice(0, 52).padEnd(52)} | ${o.entreprise.nom} | ${o.romeCode}`)
  }
  console.log('')
}

// Le paramètre de fraîcheur, utile pour borner une mesure datée.
const frais = await search({ motsCles: 'thales alenia space', publieeDepuis: '31', range: '0-149' })
console.log(`── publieeDepuis=31 (jours) : HTTP ${frais.status}, ${frais.offres.length} offre(s)`)
