/**
 * Mesure A7 réelle sur les comptes résolus d'un segment — LECTURE SEULE.
 *
 *   npx tsx --env-file=.env.local scripts/measure-hiring-intensity.ts
 *
 * N'écrit rien : imprime ce qui SERAIT écrit en `account_facts` /
 * `account_signals`. L'écriture est une décision séparée, prise au vu des
 * chiffres — c'est la règle qui distingue B2 de sa première version.
 *
 * Les comptes proviennent du relevé Supabase du 2026-08-13 (segment
 * `seg-aero-spatial-defense`, 9 comptes résolus par le socle A1).
 */

import { buildSearchEnvelope } from '../src/features/hiring-intensity/domain/build-search-envelope'
import {
  computeHiringIntensity,
  describeIntensity,
} from '../src/features/hiring-intensity/domain/compute-hiring-intensity'
import { fetchOffersForEnvelope } from '../src/features/hiring-intensity/data/france-travail-client'

interface Compte {
  id: string
  accountName: string
  legalName: string
  nafCode: string
  etablissements: string[]
}

const COMPTES: Compte[] = [
  { id: 'fcbfd676-3a75-4d17-8241-815583a3868e', accountName: 'ACRI-ST', legalName: 'ACRI-ST', nafCode: '7112B', etablissements: ['SOPHIA ANTIPOLIS 260 PIN MONTARD 06410 BIOT'] },
  { id: '0abbe65c-2da8-422f-86e4-cd76abe5547f', accountName: 'Airbus Defence and Space', legalName: 'AIRBUS DEFENCE AND SPACE SAS', nafCode: '3030Z', etablissements: ['ZI DU PALAYS 31 RUE DES COSMONAUTES 31400 TOULOUSE'] },
  { id: '81e2fda2-90ec-4b92-b897-42fc426de3cf', accountName: 'ArianeGroup / Arianespace', legalName: 'ARIANEGROUP SAS', nafCode: '3030Z', etablissements: ['51-61 51 ROUTE DE VERNEUIL 78130 LES MUREAUX'] },
  { id: '87d78e51-7166-41aa-a1fd-fbb6e66d5aef', accountName: 'Eutelsat / OneWeb', legalName: 'EUTELSAT S.A.', nafCode: '6130Z', etablissements: ['32 BOULEVARD GALLIENI 92130 ISSY-LES-MOULINEAUX'] },
  { id: 'cf0c393a-adbe-4564-b70a-78355a56f0a0', accountName: 'Exail Robotics', legalName: 'EXAIL ROBOTICS', nafCode: '3011Z', etablissements: ['ZI TOULON EST 262 RUE DES FRERES LUMIERE 83130 LA GARDE'] },
  { id: '56a79065-0f85-48d8-b216-bbe8b2c23c6f', accountName: 'Leonardo / Telespazio', legalName: 'TELESPAZIO FRANCE', nafCode: '6130Z', etablissements: ['5 RUE PAULIN TALABOT 31100 TOULOUSE'] },
  { id: 'ffef984c-e141-4573-ba91-02629f85f615', accountName: 'OHB', legalName: 'OHB FRANCE', nafCode: '7490B', etablissements: ['29 RUE DE BASSANO 75008 PARIS'] },
  { id: 'a8690e6b-f322-4068-a506-ca2d01843e9a', accountName: 'Thales - systèmes défense, cyber et critiques', legalName: 'THALES SIX GTS FRANCE SAS', nafCode: '2630Z', etablissements: ['4 AVENUE DES LOUVRESSES 92230 GENNEVILLIERS'] },
  { id: '19b4d3cb-80dc-45b4-b963-b9eb74c59e45', accountName: 'Thalès Alénia Space', legalName: 'THALES ALENIA SPACE FRANCE', nafCode: '3030Z', etablissements: ['26 AVENUE JEAN-FRANCOIS CHAMPOLLION 31100 TOULOUSE'] },
]

const measuredAt = new Date().toISOString().slice(0, 10)
const lignes: string[] = []
let totalSignaux = 0

for (const compte of COMPTES) {
  const envelope = buildSearchEnvelope({
    legalName: compte.legalName,
    accountName: compte.accountName,
    nafCode: compte.nafCode,
    establishmentAddresses: compte.etablissements,
  })

  let offers: Awaited<ReturnType<typeof fetchOffersForEnvelope>>
  try {
    offers = await fetchOffersForEnvelope(envelope)
  } catch (error) {
    console.log(`✗ ${compte.accountName} — ${(error as Error).message}`)
    continue
  }

  const { intensity, matched } = computeHiringIntensity({
    companyId: compte.id,
    offers: offers.offers,
    employerAliases: envelope.employerAliases,
    measuredAt,
  })

  if (intensity.emitsSignal) totalSignaux += 1

  console.log(`── ${compte.accountName}`)
  console.log(
    `   enveloppe NAF ${envelope.nafDivision} · dép. ${envelope.departements.join(',')} → ` +
      `${offers.offers.length} offre(s) reçue(s) sur ${offers.total} annoncée(s)` +
      (offers.truncated ? ' ⚠ TRONQUÉ' : ''),
  )
  console.log(
    `   SI : ${intensity.offersMatched} attribuée(s) · ${intensity.offersOtherEmployer} autre(s) employeur(s) · ` +
      `${intensity.offersAnonymous} anonyme(s) · couverture ${Math.round(intensity.recall * 100)} %`,
  )
  console.log(`   signal : ${intensity.emitsSignal ? `OUI (seuil ${intensity.threshold})` : 'non'}`)
  for (const m of matched) {
    console.log(
      `     · ${String(m.offer.intitule).slice(0, 54).padEnd(54)} | ${m.practice ?? '—'} | ${m.offer.romeCode ?? '—'}`,
    )
  }
  console.log('')

  lignes.push(
    `${compte.accountName.padEnd(46)} ${String(intensity.offersMatched).padStart(3)}  ` +
      `${String(Math.round(intensity.recall * 100)).padStart(3)} %  ${intensity.emitsSignal ? 'signal' : '—'}`,
  )
  lignes.push(`   ${describeIntensity(intensity)}`)
}

console.log('══ SYNTHÈSE ═══════════════════════════════════════════════════')
console.log(`compte${' '.repeat(41)}  SI  couv.  signal`)
for (const l of lignes) console.log(l)
console.log('')
console.log(`Comptes franchissant le seuil : ${totalSignaux} / ${COMPTES.length}`)
console.log('Aucune écriture effectuée — mesure en lecture seule.')
