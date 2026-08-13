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
  /**
   * Termes normalisés, appariés sur des FRONTIÈRES DE MOT, jamais en sous-chaîne.
   * Un suffixe `*` autorise le préfixe de token (`cryptograph*` couvre
   * « cryptographie » et « cryptographique »).
   *
   * La sous-chaîne nue était un piège : `ssi` matche « mi(ssi)on », `soc` matche
   * « (soc)iété », `ux` matche « fl(ux)», `iam` matche « d(iam)ètre ». La première
   * mesure réelle a ainsi classé « Technicien Méthode Microélectronique » en
   * cybersecurity. Aucun test hors ligne ne l'avait vu : les fixtures étaient des
   * intitulés courts, la prose française ne l'est pas.
   */
  terms: string[]
}

/** Le terme apparaît-il comme mot (ou suite de mots) dans le texte normalisé ? */
function containsTerm(paddedHaystack: string, term: string): boolean {
  if (term.endsWith('*')) {
    const stem = term.slice(0, -1)
    return new RegExp(`(?:^| )${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(paddedHaystack)
  }
  return paddedHaystack.includes(` ${term} `)
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
      'cyber*', 'cybersecurite', 'securite des systemes', 'secops', 'soc', 'siem', 'pentest',
      'test d intrusion', 'iam', 'pam', 'rssi', 'ssi', 'cryptograph*', 'zero trust', 'edr',
      'dfir', 'ebios', 'homologation de securite', 'analyste securite', 'devsecops',
      'post-quantique', 'post quantique',
    ],
  },
  {
    practice: 'data-ai',
    terms: [
      'data engineer', 'data scientist', 'data analyst', 'ingenieur data', 'donnee*',
      'machine learning', 'deep learning', 'intelligence artificielle', 'ia generative',
      'mlops', 'dataops', 'big data', 'datalake', 'lakehouse', 'spark', 'snowflake',
      'databricks', 'llm', 'nlp', 'computer vision', 'business intelligence', 'power bi',
      'dataviz', 'analytic*', 'traitement d images', 'data architect',
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
      'testeur*', 'qa engineer', 'quality assurance', 'automaticien de test', 'ingenieur test',
      'recette fonctionnelle', 'ivvq', 'validation logicielle', 'selenium', 'cypress',
      'playwright', 'test de performance', 'tests automatises', 'banc de test',
    ],
  },
  {
    practice: 'digital-experience',
    terms: [
      'ux', 'ui designer', 'design system', 'ergonom*', 'product designer', 'ux researcher',
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
      'developpeur*', 'ingenieur logiciel', 'architecte logiciel', 'architecte si',
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
  // Classement sur le SEUL intitulé. La description a été retirée du périmètre
  // après la première mesure réelle : elle énumère l'environnement de travail, pas
  // le poste. Un « Technicien production érosion » dont la description mentionne
  // « données » n'est pas un profil data — il partait pourtant en data-ai.
  //
  // Le rappel perdu est couvert autrement : une offre SI à l'intitulé générique
  // reste dans le périmètre A7 par son code ROME (`isInformationSystemsOffer`),
  // simplement sans ventilation par practice. Compter juste sans ventiler vaut
  // mieux que ventiler faux.
  const titre = ` ${normalizeText(offer.intitule)} `
  if (titre.trim() === '') return { practice: null, matchedTerms: [] }

  const scored = RULES.map((rule) => ({
    practice: rule.practice,
    terms: rule.terms.filter((term) => containsTerm(titre, term)),
  })).filter((entry) => entry.terms.length > 0)

  if (scored.length === 0) return { practice: null, matchedTerms: [] }

  // À nombre égal de termes, l'ordre de RULES départage (le plus spécifique d'abord).
  const best = scored.reduce((acc, entry) => (entry.terms.length > acc.terms.length ? entry : acc))
  return { practice: best.practice, matchedTerms: best.terms }
}

export function isInformationSystemsRome(romeCode: string | null | undefined): boolean {
  return !!romeCode && romeCode.toUpperCase().startsWith(ROME_SI_PREFIX)
}

/** Une offre entre dans le périmètre A7 si elle est classée, ou codée SI au ROME. */
export function isInformationSystemsOffer(offer: NormalizedJobOffer): boolean {
  return classifyOffer(offer).practice !== null || isInformationSystemsRome(offer.romeCode)
}
