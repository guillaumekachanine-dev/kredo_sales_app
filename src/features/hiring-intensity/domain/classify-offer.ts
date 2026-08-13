/**
 * Classement d'une offre d'emploi par practice KREDO (A7, E2 §4.3).
 *
 * Le vocabulaire de sortie est `offer_practices.slug` — le slug BASE, celui qui
 * joint sur `offers` et sur `account_signals.recommended_practice_id`. Jamais le
 * `PracticeSlug` d'affichage : voir l'en-tête de `src/lib/config/practices.ts`.
 *
 * La classification est lexicale et assumée comme telle : chaque décision expose
 * les termes qui l'ont produite (`matchedTerms`), de sorte qu'un classement faux
 * se corrige en ajoutant un terme, pas en relisant une boîte noire.
 */

import type { OfferPracticeSlug } from '@/lib/config/practices'
import type { NormalizedJobOffer } from './hiring-intensity.types'

/** Minuscules, sans accents, ponctuation réduite à des espaces. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Familles ROME du domaine « Systèmes d'information et de télécommunication ».
 * Utilisé comme indice POSITIF, jamais comme condition nécessaire : une offre
 * « Ingénieur Data » mal codée resterait sinon invisible.
 *
 * ⚠️ À revalider contre le référentiel exposé par l'API (`/referentiel/metiers`)
 * dès que les identifiants existent — le ROME a été renuméroté en v4 et ce préfixe
 * n'a pas été vérifié en ligne.
 */
const ROME_SI_PREFIX = 'M18'

interface PracticeRule {
  practice: OfferPracticeSlug
  /** Termes normalisés. Un terme = un point ; les termes longs priment naturellement. */
  terms: string[]
}

// L'ordre départage les égalités : une offre « Data Engineer Cloud » part en data-ai.
const RULES: PracticeRule[] = [
  {
    practice: 'legacy-systems-mainframe',
    terms: [
      'cobol', 'mainframe', 'as400', 'as/400', 'z/os', 'zos', 'mvs', 'pacbase', 'jcl',
      'db2', 'cics', 'grand systeme', 'legacy', 'tma', 'maintien en condition operationnelle',
    ],
  },
  {
    practice: 'cybersecurity',
    terms: [
      'cyber', 'cybersecurite', 'securite des systemes', 'secops', 'soc', 'siem', 'pentest',
      'test d intrusion', 'iam', 'pam', 'rssi', 'ssi', 'cryptograph', 'zero trust', 'edr',
      'dfir', 'ebios', 'homologation de securite', 'analyste securite', 'devsecops',
      'post-quantique', 'post quantique',
    ],
  },
  {
    practice: 'data-ai',
    terms: [
      'data engineer', 'data scientist', 'data analyst', 'ingenieur data', 'donnees',
      'machine learning', 'deep learning', 'intelligence artificielle', 'ia generative',
      'mlops', 'dataops', 'big data', 'datalake', 'lakehouse', 'spark', 'snowflake',
      'databricks', 'llm', 'nlp', 'computer vision', 'business intelligence', 'power bi',
      'dataviz', 'analytics', 'traitement d images', 'data architect',
    ],
  },
  {
    practice: 'cloud-engineering',
    terms: [
      'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'k8s', 'docker', 'devops', 'terraform',
      'ansible', 'sre', 'site reliability', 'platform engineer', 'finops', 'openshift',
      'infrastructure as code', 'ci/cd', 'observabilite', 'virtualisation',
    ],
  },
  {
    practice: 'quality-engineering-testing',
    terms: [
      'testeur', 'qa engineer', 'quality assurance', 'automaticien de test', 'ingenieur test',
      'recette fonctionnelle', 'ivvq', 'validation logicielle', 'selenium', 'cypress',
      'playwright', 'test de performance', 'tests automatises', 'banc de test',
    ],
  },
  {
    practice: 'digital-experience',
    terms: [
      'ux', 'ui designer', 'design system', 'ergonom', 'product designer', 'ux researcher',
      'accessibilite numerique', 'rgaa', 'parcours utilisateur', 'front end', 'frontend',
      'react', 'angular', 'vue.js', 'developpeur mobile', 'ios', 'android',
    ],
  },
  {
    practice: 'project-agile-delivery',
    terms: [
      'chef de projet', 'product owner', 'scrum master', 'coach agile', 'agile', 'safe',
      'pmo', 'delivery manager', 'directeur de projet', 'gestion de portefeuille',
      'conduite du changement',
    ],
  },
  {
    practice: 'digital-business-solutions',
    terms: [
      'developpeur', 'ingenieur logiciel', 'architecte logiciel', 'architecte si',
      'ingenieur etudes et developpement', 'java', 'python', '.net', 'c++', 'api',
      'integration applicative', 'erp', 'sap', 'business analyst', 'amoa', 'moa',
      'systeme embarque', 'embarque', 'iot', 'plm', 'maitrise d ouvrage',
    ],
  },
]

export interface ClassificationResult {
  practice: OfferPracticeSlug | null
  matchedTerms: string[]
}

/**
 * Classe une offre. Renvoie `practice: null` quand rien n'indique un poste SI —
 * l'offre sort alors du périmètre A7 au lieu d'être rangée par défaut quelque part.
 */
export function classifyOffer(offer: NormalizedJobOffer): ClassificationResult {
  const titre = normalizeText(offer.intitule)
  const haystack = `${titre} ${normalizeText(offer.description)}`.trim()
  if (!haystack) return { practice: null, matchedTerms: [] }

  // L'intitulé prime, et pas d'un simple coefficient : dès qu'une practice est
  // reconnue dans le titre, la décision se joue ENTRE les practices du titre.
  // Sinon une description qui énumère l'environnement technique l'emporte sur le
  // poste lui-même — un « Data Scientist » travaillant sur AWS/Kubernetes/Terraform
  // partait en cloud-engineering sur le seul nombre de termes cités.
  const scored = RULES.map((rule) => {
    const inTitle = rule.terms.filter((term) => titre.includes(term))
    const inAll = rule.terms.filter((term) => haystack.includes(term))
    return { practice: rule.practice, inTitle, inAll }
  }).filter((entry) => entry.inAll.length > 0)

  // Aucun terme reconnu : l'offre sort de la ventilation. Elle peut malgré tout
  // rester dans le périmètre A7 via son code ROME — c'est `isInformationSystemsOffer`
  // qui en décide, pas ce classement.
  if (scored.length === 0) return { practice: null, matchedTerms: [] }

  const titled = scored.filter((entry) => entry.inTitle.length > 0)
  const pool = titled.length > 0 ? titled : scored
  // À nombre égal de termes, l'ordre de RULES départage (le plus spécifique d'abord).
  const best = pool.reduce((acc, entry) => {
    if (!acc) return entry
    const accKey = titled.length > 0 ? acc.inTitle.length : acc.inAll.length
    const entryKey = titled.length > 0 ? entry.inTitle.length : entry.inAll.length
    if (entryKey > accKey) return entry
    if (entryKey === accKey && entry.inAll.length > acc.inAll.length) return entry
    return acc
  }, pool[0])

  return { practice: best.practice, matchedTerms: best.inAll }
}

export function isInformationSystemsRome(romeCode: string | null | undefined): boolean {
  return !!romeCode && romeCode.toUpperCase().startsWith(ROME_SI_PREFIX)
}

/** Une offre entre dans le périmètre A7 si elle est classée, ou codée SI au ROME. */
export function isInformationSystemsOffer(offer: NormalizedJobOffer): boolean {
  return classifyOffer(offer).practice !== null || isInformationSystemsRome(offer.romeCode)
}
