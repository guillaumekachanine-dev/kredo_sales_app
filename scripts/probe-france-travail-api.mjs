#!/usr/bin/env node
/**
 * Sonde l'API « Offres d'emploi v2 » pour établir ce qui ne se devine pas (A7 / B2).
 *
 *   node --env-file=.env.local scripts/probe-france-travail-api.mjs
 *
 * Read-only. N'écrit rien, ni en base ni sur disque. N'imprime aucun secret :
 * le jeton n'est jamais affiché, seul son obtention est constatée.
 *
 * Les cinq points à établir (src/features/hiring-intensity/README.md) :
 *   1. nom et granularité du filtre secteur
 *   2. nom du filtre département, et s'il accepte plusieurs valeurs
 *   3. champ portant le nom de l'employeur
 *   4. manifestation de l'anonymat — le calcul de couverture en dépend
 *   5. validité du préfixe ROME M18
 */

const ID = process.env.FRANCE_TRAVAIL_CLIENT_ID
const SECRET = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
const TOKEN_URL =
  process.env.FRANCE_TRAVAIL_TOKEN_URL ??
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
const SCOPE = process.env.FRANCE_TRAVAIL_SCOPE ?? 'api_offresdemploiv2 o2dsoffre'
const BASE = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres'

if (!ID || !SECRET) {
  console.error('✗ Identifiants absents. Lancer via : npm run ft:probe')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ID,
      client_secret: SECRET,
      scope: SCOPE,
    }),
  })
  if (!res.ok) throw new Error(`token HTTP ${res.status}`)
  const { access_token } = await res.json()
  return access_token
}

const token = await getToken()
console.log('✓ Jeton obtenu (non affiché).\n')

/** Un appel de sonde. Renvoie statut, en-tête de pagination et corps parsé. */
async function search(label, params) {
  await sleep(400) // quota annoncé : 3 req/s
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const contentRange = res.headers.get('Content-Range')
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* corps non-JSON : conservé tel quel dans `text` */
  }
  console.log(`── ${label}`);
  console.log(`   ?${qs}`)
  console.log(`   HTTP ${res.status}${contentRange ? `  Content-Range: ${contentRange}` : ''}`)
  if (!res.ok && body) {
    console.log(`   ↳ ${JSON.stringify(body).slice(0, 300)}`)
  } else if (!res.ok) {
    console.log(`   ↳ ${text.slice(0, 200)}`)
  }
  console.log('')
  return { status: res.status, contentRange, body, text }
}

// ── 1 & 2. Quels filtres l'API accepte-t-elle ? ────────────────────────────
// Thales Alenia Space France : NAF 3030Z (division 30), siège en Haute-Garonne (31).
await search('Contrôle : appel minimal', { motsCles: 'data', range: '0-1' })
const secteur = await search('Filtre secteur, division NAF sur 2 chiffres', {
  secteurActivite: '30',
  range: '0-1',
})
await search('Filtre secteur, code NAF complet', { secteurActivite: '3030Z', range: '0-1' })
const dept = await search('Filtre département', { departement: '31', range: '0-1' })
await search('Filtre département, valeurs multiples', { departement: '31,92', range: '0-1' })
const combine = await search('Enveloppe complète : secteur + département', {
  secteurActivite: '30',
  departement: '31',
  range: '0-99',
})

// ── 3, 4 & 5. Forme de la réponse ──────────────────────────────────────────
const offres =
  (Array.isArray(combine.body?.resultats) && combine.body.resultats) ||
  (Array.isArray(secteur.body?.resultats) && secteur.body.resultats) ||
  (Array.isArray(dept.body?.resultats) && dept.body.resultats) ||
  []

console.log('══ FORME DE LA RÉPONSE ══════════════════════════════════════════')
if (offres.length === 0) {
  console.log('Aucune offre exploitable renvoyée — voir les statuts ci-dessus.')
  process.exit(0)
}

console.log(`${offres.length} offre(s) analysée(s).\n`)
console.log('Clés de premier niveau d’une offre :')
console.log('  ' + Object.keys(offres[0]).sort().join(', ') + '\n')

const avecEntreprise = offres.filter((o) => o.entreprise && typeof o.entreprise === 'object')
if (avecEntreprise.length > 0) {
  const clesEntreprise = new Set()
  for (const o of avecEntreprise) for (const k of Object.keys(o.entreprise)) clesEntreprise.add(k)
  console.log('Clés observées dans `entreprise` :')
  console.log('  ' + [...clesEntreprise].sort().join(', ') + '\n')
}

// Point 4 : comment l'anonymat se manifeste concrètement.
const sansNom = offres.filter((o) => !o?.entreprise?.nom)
console.log('── Anonymat de l’employeur')
console.log(`  offres sans entreprise.nom : ${sansNom.length} / ${offres.length}`)
if (sansNom.length > 0) {
  console.log('  forme du bloc `entreprise` sur un cas anonyme :')
  console.log('   ' + JSON.stringify(sansNom[0].entreprise ?? null))
}
const champsAnonymes = new Set(
  offres.map((o) => String(o?.entreprise?.entrepriseAdaptee ?? 'absent')),
)
console.log(`  valeurs de entreprise.entrepriseAdaptee : ${[...champsAnonymes].join(', ')}\n`)

// Point 5 : le préfixe ROME M18 décrit-il bien les métiers SI ?
const romes = new Map()
for (const o of offres) {
  const code = o.romeCode ?? o.codeROME ?? null
  if (!code) continue
  const prefix = String(code).slice(0, 3)
  if (!romes.has(prefix)) romes.set(prefix, { count: 0, exemple: o.romeLibelle ?? o.appellationlibelle })
  romes.get(prefix).count += 1
}
console.log('── Codes ROME observés (préfixe → occurrences)')
for (const [prefix, info] of [...romes].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${prefix}  ${String(info.count).padStart(3)}  ex. ${info.exemple ?? '—'}`)
}
console.log('')

console.log('── Échantillon (intitulé · employeur · ROME)')
for (const o of offres.slice(0, 12)) {
  const nom = o?.entreprise?.nom ?? '‹anonyme›'
  console.log(`  · ${String(o.intitule).slice(0, 58).padEnd(58)} | ${String(nom).slice(0, 32).padEnd(32)} | ${o.romeCode ?? '—'}`)
}
