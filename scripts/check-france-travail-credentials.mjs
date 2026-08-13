#!/usr/bin/env node
/**
 * Vérifie que les identifiants France Travail fonctionnent — SANS JAMAIS LES AFFICHER.
 *
 *   node --env-file=.env.local scripts/check-france-travail-credentials.mjs
 *
 * Pourquoi ce script existe
 * ─────────────────────────
 * Un secret ne doit transiter ni par une conversation, ni par un `cat .env.local`,
 * ni par une sortie de commande relue par un agent. Il vit dans `.env.local` (ignoré
 * par git) et n'existe pour ce script que sous forme de variable d'environnement.
 * Tout ce qui est imprimé ici est dérivé et non sensible : présence, longueur,
 * code HTTP, durée de validité, scopes. Jamais une valeur.
 *
 * Le secret part dans le CORPS de la requête, jamais dans l'URL : il ne peut donc
 * pas fuiter dans un message d'erreur, un log serveur ou un historique de shell.
 *
 * ⚠️ L'URL du jeton et le realm portés en défaut ci-dessous n'ont PAS été vérifiés
 * en ligne. C'est précisément l'objet de ce script : constater. En cas d'échec,
 * la sortie dit ce qui a été tenté, et l'un des deux se surcharge par variable
 * d'environnement sans toucher au code.
 */

const CLIENT_ID = process.env.FRANCE_TRAVAIL_CLIENT_ID
const CLIENT_SECRET = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
const TOKEN_URL =
  process.env.FRANCE_TRAVAIL_TOKEN_URL ??
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire'
const SCOPE = process.env.FRANCE_TRAVAIL_SCOPE ?? 'api_offresdemploiv2 o2dsoffre'

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('✗ Identifiants absents de l’environnement.')
  console.error('')
  console.error('  Renseigne dans .env.local (jamais ailleurs, jamais dans une conversation) :')
  console.error('    FRANCE_TRAVAIL_CLIENT_ID=…')
  console.error('    FRANCE_TRAVAIL_CLIENT_SECRET=…')
  console.error('')
  console.error('  puis relance :')
  console.error('    node --env-file=.env.local scripts/check-france-travail-credentials.mjs')
  process.exit(1)
}

console.log('Identifiants chargés depuis l’environnement :')
console.log(`  client_id     : ${CLIENT_ID.length} caractères`)
console.log(`  client_secret : ${CLIENT_SECRET.length} caractères`)
console.log(`  token_url     : ${TOKEN_URL}`)
console.log(`  scope demandé : ${SCOPE}`)
console.log('')

const body = new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  scope: SCOPE,
})

let response
try {
  response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
} catch (error) {
  fail(`Requête impossible : ${error.name} — ${error.message}`)
}

const raw = await response.text()

if (!response.ok) {
  // Le corps d'une erreur OAuth ne contient pas le secret (il n'est jamais renvoyé),
  // mais on n'imprime que les champs normalisés pour ne rien relayer par accident.
  let detail = ''
  try {
    const parsed = JSON.parse(raw)
    detail = [parsed.error, parsed.error_description].filter(Boolean).join(' — ')
  } catch {
    detail = `réponse non-JSON de ${raw.length} caractères`
  }
  console.error(`✗ HTTP ${response.status} ${response.statusText}`)
  console.error(`  ${detail || '(aucun détail)'}`)
  console.error('')
  console.error('  Pistes, dans l’ordre de probabilité :')
  console.error('   · l’application n’est pas abonnée à « Offres d’emploi v2 » sur francetravail.io')
  console.error('   · le scope attendu diffère — surcharger FRANCE_TRAVAIL_SCOPE')
  console.error('   · l’URL du jeton ou le realm diffèrent — surcharger FRANCE_TRAVAIL_TOKEN_URL')
  process.exit(1)
}

let token
try {
  token = JSON.parse(raw)
} catch {
  fail(`HTTP 200 mais réponse illisible (${raw.length} caractères, JSON attendu)`)
}

if (!token.access_token) {
  fail('HTTP 200 mais aucun access_token dans la réponse')
}

console.log('✓ Jeton obtenu.')
console.log(`  type       : ${token.token_type ?? '(non précisé)'}`)
console.log(`  longueur   : ${String(token.access_token).length} caractères`)
console.log(`  expire_dans: ${token.expires_in ?? '(non précisé)'} s`)
console.log(`  scope reçu : ${token.scope ?? '(non précisé)'}`)
console.log('')
console.log('Les identifiants sont valides. Aucun secret n’a été affiché ni écrit.')
