#!/usr/bin/env node
/**
 * E2 / A1 — Identité France, régime déterministe.
 *
 *   node scripts/resolve-account-identity.mjs <comptes.json> [--out resolution.json]
 *
 * MASTER STUDY `05-ETAPE-E2-SOCLE-DETERMINISTE.md` §4.1.
 *
 * Ce script est en LECTURE SEULE. Il propose des candidats, il n'écrit ni dans la base
 * ni dans le registre — l'écriture est un arrêt où Guillaume décide (A1 §4.1 point 2 :
 * « promotion uniquement après résolution non ambiguë »).
 *
 * Pourquoi un script et pas un LLM
 * ─────────────────────────────────
 * Axiome A1. Le SIREN est public, gratuit et instantané ; demandé à un modèle, il valait
 * `null` sur 10 comptes sur 10. Ici, chaque résolution porte l'URL de l'appel qui l'a
 * produite, ce qui la rend opposable et rejouable.
 *
 * Source : `recherche-entreprises.api.gouv.fr`, façade open data du répertoire Sirene
 * (INSEE). Ouverte, sans clé. ⚠️ Ne JAMAIS utiliser `entreprise.api.gouv.fr` : elle est
 * réservée aux administrations, et KREDO est une entreprise privée.
 *
 * Le score de confiance, et pourquoi il ne se devine pas
 * ──────────────────────────────────────────────────────
 * Un compte KREDO de niveau groupe (« Thales », « Robertet ») se résout sur plusieurs
 * personnes morales. Le script ne tranche pas : il rend les candidats ordonnés, marque
 * `ambiguous` dès que le second candidat est proche du premier, et laisse la décision
 * d'`entite_retenue` à l'humain. Une résolution ambiguë promue en silence est une fausse
 * identité qui contaminera ensuite tout le plancher de preuve.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://recherche-entreprises.api.gouv.fr/search'
const PAUSE_MS = 220 // l'API annonce 7 req/s ; on reste large en dessous

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Normalisation pour comparer des raisons sociales : accents, casse, formes juridiques. */
function normalise(nom) {
  return (nom || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\b(SAS|SASU|SA|SARL|EURL|SNC|SCA|GROUPE|GROUP|HOLDING|FRANCE|INTERNATIONAL)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/** Jaccard sur les mots — suffisant ici, et surtout explicable. */
function similarite(a, b) {
  const A = new Set(normalise(a).split(' ').filter(Boolean))
  const B = new Set(normalise(b).split(' ').filter(Boolean))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const w of A) if (B.has(w)) inter += 1
  return inter / new Set([...A, ...B]).size
}

async function rechercher(nom) {
  const url = `${API}?q=${encodeURIComponent(nom)}&per_page=10`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${nom}`)
  const body = await res.json()
  return { url, resultats: body.results ?? [] }
}

function candidat(r, nomCherche) {
  const siege = r.siege ?? {}
  return {
    siren: r.siren,
    denomination: r.nom_complet ?? r.nom_raison_sociale ?? null,
    naf_code: siege.activite_principale ?? r.activite_principale ?? null,
    naf_libelle: siege.libelle_activite_principale ?? null,
    tranche_effectif: r.tranche_effectif_salarie ?? null,
    annee_effectif: r.annee_tranche_effectif_salarie ?? null,
    date_creation: r.date_creation ?? null,
    etat: r.etat_administratif ?? null,
    siege: {
      siret: siege.siret ?? null,
      code_postal: siege.code_postal ?? null,
      commune: siege.libelle_commune ?? null,
      departement: (siege.code_postal ?? '').slice(0, 2) || null,
    },
    nombre_etablissements_ouverts: r.nombre_etablissements_ouverts ?? null,
    similarite: Number(similarite(nomCherche, r.nom_complet ?? r.nom_raison_sociale).toFixed(3)),
  }
}

const [fichier] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const outIdx = process.argv.indexOf('--out')
const sortie = outIdx > -1 ? process.argv[outIdx + 1] : null
if (!fichier) {
  console.error('usage: node scripts/resolve-account-identity.mjs <comptes.json> [--out resolution.json]')
  process.exit(2)
}

const comptes = JSON.parse(readFileSync(fichier, 'utf-8'))
const resolutions = []

for (const c of comptes) {
  await sleep(PAUSE_MS)
  let res
  try {
    res = await rechercher(c.name)
  } catch (err) {
    resolutions.push({ company_id: c.id, nom: c.name, statut: 'erreur', motif: String(err.message) })
    console.log(`✗ ${c.name.padEnd(26)} ${err.message}`)
    continue
  }

  const actifs = res.resultats.filter((r) => (r.etat_administratif ?? 'A') === 'A')
  const cands = actifs.map((r) => candidat(r, c.name)).sort((a, b) => b.similarite - a.similarite)

  if (cands.length === 0) {
    resolutions.push({ company_id: c.id, nom: c.name, statut: 'not_found',
                       motif: 'aucun établissement actif', appel: res.url })
    console.log(`✗ ${c.name.padEnd(26)} not_found`)
    continue
  }

  const [premier, second] = cands
  // Ambiguë si le meilleur n'est pas net, ou si le second le talonne. Les deux seuils
  // sont volontairement prudents : un faux positif ici se propage à tout le socle.
  const faible = premier.similarite < 0.5
  const talonne = second && premier.similarite - second.similarite < 0.15
  const statut = faible || talonne ? 'ambiguous' : 'resolved'

  resolutions.push({
    company_id: c.id, nom: c.name, statut, appel: res.url,
    retenu: statut === 'resolved' ? premier : null,
    candidats: cands.slice(0, 3),
  })
  const marque = statut === 'resolved' ? '✓' : '?'
  console.log(
    `${marque} ${c.name.padEnd(26)} ${premier.siren}  sim ${premier.similarite}  ` +
      `${premier.naf_code ?? '----'}  ${premier.denomination}`,
  )
}

const resume = {
  date_execution: new Date().toISOString().slice(0, 10),
  source: 'recherche-entreprises.api.gouv.fr (façade open data Sirene / INSEE)',
  comptes_cibles: comptes.length,
  resolus: resolutions.filter((r) => r.statut === 'resolved').length,
  ambigus: resolutions.filter((r) => r.statut === 'ambiguous').length,
  echecs: resolutions.filter((r) => r.statut === 'not_found' || r.statut === 'erreur').length,
  resolutions,
}

console.log(
  `\n${resume.resolus} résolu(s) · ${resume.ambigus} ambigu(s) · ${resume.echecs} échec(s) ` +
    `sur ${resume.comptes_cibles}`,
)
if (sortie) {
  writeFileSync(sortie, JSON.stringify(resume, null, 2), 'utf-8')
  console.log(`→ ${sortie}`)
}
