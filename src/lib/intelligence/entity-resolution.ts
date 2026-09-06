// ─── Résolution d'entité légale — Account Knowledge V4, Lot 1 ────────────────
//
// POURQUOI CE MODULE EXISTE.
// Le run `intel-030-account-knowledge` du 2026-09-04 sur le compte « Tournaire »
// (fabricant d'emballages, Grasse, NAF 25.92Z, SIREN 415550110) a publié une étude
// décrivant `TOURNAIRE`, SIREN 505063438, Lyon, NAF 43.99C — une entreprise de
// travaux de construction. Les douze contrôles qualité du workflow sont passés au
// vert et quatre propositions d'enrichissement à 0,85-0,95 de confiance ont été
// écrites, prêtes à remplacer l'identité du compte au CRM.
//
// Trois défauts cumulés dans l'appariement d'origine :
//   1. la requête partait de `companies.name`, le score comparait `legal_name` ;
//   2. `per_page=3` — la bonne entité arrivait en 5ᵉ position, jamais candidate ;
//   3. le score retenait `target.includes(candidate)` → 0.6, exactement le seuil,
//      sans aucun contrôle croisé sur la commune, le code NAF ou la taille, tous
//      présents au CRM et tous contradictoires.
//
// DOCTRINE.
// Le nom est une PORTE, jamais une décision : trois entités « TOURNAIRE » existent.
// Ce sont la géographie et l'activité qui tranchent. Quand elles se taisent ou se
// contredisent, ce module ne devine pas : il rend `needs_human_confirmation`, et
// l'appelant s'interdit alors toute écriture sur les données canoniques.
//
// Ce module est PUR et sans I/O : il est la spécification exécutable partagée par
// `intel-030-account-knowledge` et `intel-010-refresh`, dont les nœuds Code n8n
// transcrivent la même logique. Toute évolution se fait ici d'abord.

/** Un candidat du registre public, normalisé depuis l'API Recherche d'entreprises. */
export type RegistryCandidate = {
  siren: string
  /** Raison sociale retenue (`nom_raison_sociale` à défaut `nom_complet`). */
  legalName: string | null
  /** Sigle, nom commercial, enseignes — tous les autres noms connus du registre. */
  alternateNames: string[]
  /** Code NAF/APE de l'entité (`activite_principale`), ex. `25.92Z`. */
  nafCode: string | null
  /** Section NAF A→U (`section_activite_principale`). */
  nafSection: string | null
  hqCommune: string | null
  hqPostalCode: string | null
  hqDepartment: string | null
  hqAddress: string | null
  /** Code de tranche d'effectif INSEE (`00`…`52`, `NN` = non renseigné). */
  employeeTrancheCode: string | null
  /** `PME` · `ETI` · `GE`. */
  companyCategory: string | null
  createdOn: string | null
  /** `A` = active, `C` = cessée. */
  administrativeState: string | null
  establishmentCount: number | null
  /** Dernier chiffre d'affaires publié, en euros. Jamais utilisé pour scorer. */
  revenueEur: number | null
  revenueYear: string | null
}

/** L'identité telle que KREDO la connaît déjà. Toute valeur peut manquer. */
export type AccountIdentityInput = {
  name: string | null
  legalName: string | null
  /** Texte libre : « Grasse », « Sophia », « 7 BD J. SAADE 13002 MARSEILLE… ». */
  hqLocation: string | null
  sector: string | null
  segment: string | null
  employeeCount: number | null
  knownSiren: string | null
  knownNafCode: string | null
}

export type EntityResolutionSignalKey =
  | "name"
  | "geography"
  | "activity_section"
  | "known_naf"
  | "size"
  | "administrative_state"
  | "known_siren"

export type EntityResolutionSignal = {
  key: EntityResolutionSignalKey
  weight: number
  /** Dans [-1, 1]. `0` signifie « la donnée manque », jamais « c'est faux ». */
  value: number
  detail: string
  /** `true` quand ce signal contredit l'appariement au point d'interdire une publication automatique. */
  blocking: boolean
}

export type ScoredCandidate = {
  candidate: RegistryCandidate
  score: number
  nameScore: number
  signals: EntityResolutionSignal[]
  blockers: string[]
}

export type EntityResolutionDecision = "resolved" | "needs_human_confirmation" | "unresolved"

export type EntityResolutionMethod = "crm_siren" | "registry_match" | "none"

export type EntityResolution = {
  decision: EntityResolutionDecision
  method: EntityResolutionMethod
  chosen: RegistryCandidate | null
  score: number
  /** Écart de score avec le deuxième candidat. `null` s'il n'y en a pas. */
  margin: number | null
  signals: EntityResolutionSignal[]
  blockers: string[]
  reasons: string[]
  /** Les meilleurs candidats, ordonnés, pour affichage et audit. */
  candidates: ScoredCandidate[]
  /**
   * Seule une résolution `resolved` autorise une proposition d'enrichissement sur
   * `siren`, `naf_code`, `legal_name`, `hq_location`, `employee_count`, `description`.
   */
  canProposeCanonicalWrites: boolean
}

// ─── Seuils ─────────────────────────────────────────────────────────────────
// Exportés pour être assertés par les tests plutôt que redécouverts par lecture.

/** En dessous, le candidat n'est pas la même entreprise : il est écarté. */
export const NAME_GATE_MIN = 0.4
/**
 * Score minimal d'un appariement publiable.
 *
 * Il est **délibérément supérieur au poids du nom** (`WEIGHTS.name` = 3) : c'est
 * l'invariant central de ce module. Un nom, même identique, ne résout jamais une
 * entité à lui seul — trois « TOURNAIRE » existent au registre.
 */
export const RESOLVED_MIN_SCORE = 4
/** Score de nom minimal d'un appariement publiable. */
export const RESOLVED_MIN_NAME_SCORE = 0.65
/** Écart minimal avec le deuxième candidat : sans lui, l'appariement est ambigu. */
export const RESOLVED_MIN_MARGIN = 1.5
/** En dessous, plus rien n'est proposé, même pas à l'arbitrage humain. */
export const CANDIDATE_MIN_SCORE = 2
/** Nombre de résultats à demander au registre. L'ancien `per_page=3` ratait la cible. */
export const REGISTRY_SEARCH_PER_PAGE = 10
/** Nombre de candidats conservés dans la trace d'audit. */
export const AUDIT_CANDIDATE_LIMIT = 5

// ─── Normalisation des noms ─────────────────────────────────────────────────

/**
 * Formes juridiques retirées avant comparaison. « groupe », « group », « holding »,
 * « france » et « international » n'y figurent PAS volontairement : ce sont eux qui
 * distinguent « TOURNAIRE SA » de « TOURNAIRE GROUP HOLDING ».
 */
const LEGAL_FORM_TOKENS = new Set([
  "sa", "sas", "sasu", "sarl", "eurl", "snc", "sci", "scs", "sca", "scop", "scic",
  "selas", "selarl", "selafa", "sel", "sem", "spl", "gie", "gip", "eirl", "ei",
  "societe", "ste", "cie", "compagnie", "etablissements", "ets",
  "ltd", "limited", "llc", "inc", "gmbh", "ag", "bv", "nv", "spa", "srl", "plc",
  // Mots-outils : « Établissements Ciffréo et Bona » ne doit pas porter « et ».
  "et", "de", "du", "des", "la", "le", "les", "aux",
])

/**
 * Codes NAF de holdings et de fonctions support. Une entité qui les porte n'est pas
 * incohérente avec son secteur : elle en est la tête de groupe ou le support. Le
 * signal d'activité devient neutre plutôt que négatif — sans quoi la moitié des
 * comptes du portefeuille (Domusvi 70.10Z, Cogepart 70.10Z, Groupe IDEC 82.99Z…)
 * serait pénalisée à tort.
 */
const HOLDING_LIKE_NAF = new Set(["70.10Z", "70.22Z", "64.20Z", "82.99Z", "74.90B", "94.99Z"])

/**
 * Sections NAF plausibles par secteur KREDO. Référentiel volontairement GÉNÉREUX :
 * il ne sert qu'à un bonus ou à une pénalité douce, jamais à écarter un candidat.
 * Un secteur absent de cette table rend le signal neutre.
 */
export const SECTOR_TO_NAF_SECTIONS: Readonly<Record<string, readonly string[]>> = {
  "Aéronautique, Spatial & Défense": ["C", "M", "H", "J"],
  "Banque, Finance & Assurance": ["K"],
  "BTP, Construction & Immobilier": ["F", "L", "G", "M"],
  "Commerce, Distribution & Services spécialisés": ["G", "N", "S", "C"],
  "EHPAD & Résidences Seniors": ["Q"],
  "Énergie, Pétrochimie & Environnement": ["B", "C", "D", "E", "M"],
  "Industrie manufacturière, électronique & équipements": ["C"],
  "Logiciels, SaaS & Services numériques": ["J", "M"],
  "Nutraceutique, Santé Naturelle & Compléments Alimentaires": ["C", "G", "Q"],
  "Parfumerie, Arômes & Cosmétique": ["C", "G"],
  "Santé, MedTech & Médico-social": ["Q", "C", "M"],
  "Secteur public, Enseignement supérieur & Recherche": ["O", "P", "M", "S"],
  "Tourisme, Hôtellerie & Loisirs": ["I", "N", "R"],
  "Transport & Mobilité régionale": ["H", "N"],
}

/** Point médian des tranches d'effectif INSEE. `NN` et les codes inconnus rendent `null`. */
const EMPLOYEE_TRANCHE_MIDPOINT: Readonly<Record<string, number>> = {
  "00": 0, "01": 2, "02": 4, "03": 7, "11": 15, "12": 35, "21": 75,
  "22": 150, "31": 225, "32": 375, "41": 750, "42": 1500, "51": 3500, "52": 7500,
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Minuscules, sans accent ni ponctuation, espaces normalisés. */
export function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  return stripDiacritics(String(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized.split(" ") : []
}

/** Tokens hors formes juridiques — c'est sur eux que porte la comparaison. */
export function nameCore(value: string | null | undefined): string[] {
  return tokenize(value ?? "").filter((token) => !LEGAL_FORM_TOKENS.has(token) && token.length > 1)
}

/**
 * Variantes d'un nom d'entreprise. « Groupe Tournaire (Tournaire SA) » produit la
 * chaîne complète, la partie hors parenthèses et chaque contenu de parenthèses —
 * le CRM y range régulièrement la vraie raison sociale.
 */
export function nameVariants(...values: (string | null | undefined)[]): string[] {
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) continue
    const raw = value.trim()
    out.push(raw)
    const withoutParens = raw.replace(/\([^)]*\)/g, " ").trim()
    if (withoutParens.length > 0) out.push(withoutParens)
    for (const match of raw.matchAll(/\(([^)]+)\)/g)) {
      const inner = match[1].trim()
      if (inner.length > 0) out.push(inner)
    }
    // « KELLER WILLIAMS FRANCE / SAS TEAM FRANCE » — le CRM sépare aussi par « / ».
    for (const part of raw.split("/")) {
      const trimmed = part.trim()
      if (trimmed.length > 0) out.push(trimmed)
    }
  }
  const seen = new Set<string>()
  return out.filter((v) => {
    const key = normalizeText(v)
    if (key.length === 0 || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isTokenPrefix(shorter: string[], longer: string[]): boolean {
  if (shorter.length === 0 || shorter.length >= longer.length) return false
  return shorter.every((token, index) => token === longer[index])
}

/** Score de proximité de deux noms, dans [0, 1]. */
export function scoreNamePair(left: string, right: string): number {
  const a = nameCore(left)
  const b = nameCore(right)
  if (a.length === 0 || b.length === 0) return 0
  const joinedA = a.join(" ")
  const joinedB = b.join(" ")
  if (joinedA === joinedB) return 1

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (isTokenPrefix(shorter, longer)) return 0.8

  const longerSet = new Set(longer)
  if (shorter.every((token) => longerSet.has(token))) {
    // Inclusion : plus le nom long ajoute de mots, moins l'inclusion prouve qu'il
    // s'agit de la même entité. « BUREAU DES ETUDIANTS INFIRMIERS DU CENTRE
    // HOSPITALIER UNIVERSITAIRE DE NICE » contient bien « CHU de Nice », et n'est
    // pas le CHU de Nice — cas relevé à l'audit du stock le 2026-09-07.
    return longer.length - shorter.length > 2 ? 0.5 : 0.65
  }

  const shared = shorter.filter((token) => longerSet.has(token)).length
  const ratio = shared / shorter.length
  return ratio >= 0.5 ? 0.4 : 0
}

/** Meilleur score entre toutes les variantes du compte et tous les noms du candidat. */
export function scoreCandidateName(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): number {
  const accountNames = nameVariants(account.legalName, account.name)
  const candidateNames = nameVariants(candidate.legalName, ...candidate.alternateNames)
  let best = 0
  for (const left of accountNames) {
    for (const right of candidateNames) {
      const score = scoreNamePair(left, right)
      if (score > best) best = score
      if (best === 1) return 1
    }
  }
  return best
}

// ─── Géographie ─────────────────────────────────────────────────────────────

export type ParsedLocation = {
  postalCode: string | null
  department: string | null
  tokens: string[]
}

/**
 * Lit un `hq_location` en texte libre. Le champ contient aussi bien « Grasse » que
 * « SOPHIA ANTIPOLIS 260 PIN MONTARD 06410 BIOT, 06410, BIOT » : on en extrait le
 * code postal quand il existe et les tokens alphabétiques pour la comparaison de
 * commune. Un lieu-dit sans code postal (« Sophia ») rend un département `null` —
 * le signal sera neutre, jamais négatif.
 */
export function parseLocation(value: string | null | undefined): ParsedLocation {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { postalCode: null, department: null, tokens: [] }
  }
  const postalMatch = String(value).match(/\b(\d{5})\b/)
  const postalCode = postalMatch ? postalMatch[1] : null
  const tokens = tokenize(value).filter((token) => !/^\d+$/.test(token) && token.length > 2)
  return {
    postalCode,
    department: postalCode ? postalCode.slice(0, 2) : null,
    tokens,
  }
}

function scoreGeography(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): { value: number; detail: string } {
  const parsed = parseLocation(account.hqLocation)
  const candidateCommune = normalizeText(candidate.hqCommune)
  const candidateAddress = normalizeText(candidate.hqAddress)
  const candidateDepartment = candidate.hqDepartment
    ?? (candidate.hqPostalCode ? candidate.hqPostalCode.slice(0, 2) : null)

  if (parsed.tokens.length === 0 && !parsed.postalCode) {
    return { value: 0, detail: "Siège inconnu au CRM — signal neutre." }
  }

  if (parsed.postalCode && candidate.hqPostalCode && parsed.postalCode === candidate.hqPostalCode) {
    return { value: 1, detail: `Code postal identique (${parsed.postalCode}).` }
  }

  const communeTokens = candidateCommune.length > 0 ? candidateCommune.split(" ") : []
  const communeMatches =
    communeTokens.length > 0 &&
    (communeTokens.every((token) => parsed.tokens.includes(token)) ||
      parsed.tokens.some((token) => communeTokens.includes(token)))
  if (communeMatches) {
    return { value: 1, detail: `Commune du siège concordante (${candidate.hqCommune}).` }
  }

  const addressMentions =
    candidateAddress.length > 0 && parsed.tokens.some((token) => candidateAddress.includes(token))
  if (addressMentions) {
    return { value: 0.8, detail: "Le lieu connu au CRM apparaît dans l'adresse du siège." }
  }

  if (parsed.department && candidateDepartment) {
    if (parsed.department === candidateDepartment) {
      return { value: 0.5, detail: `Même département (${parsed.department}), commune différente.` }
    }
    return {
      value: -1,
      detail: `Département incompatible : CRM ${parsed.department}, registre ${candidateDepartment} (${candidate.hqCommune ?? "?"}).`,
    }
  }

  // Les deux côtés nomment un lieu, et ce n'est pas le même, sans code postal pour
  // arbitrer. Ce n'est pas une contradiction — le CRM range parfois un lieu-dit
  // (« Sophia ») là où le registre porte la commune (« Valbonne ») — mais ce n'est
  // pas non plus une confirmation. Sans ce cas, un `hq_location` réduit à un nom de
  // commune ne protégeait de rien : c'est ce qui a laissé passer « Grasse » vs « LYON ».
  if (parsed.tokens.length > 0 && candidateCommune.length > 0) {
    return {
      value: -0.5,
      detail: `Lieu du CRM (${account.hqLocation}) et commune du registre (${candidate.hqCommune}) divergents, sans code postal pour arbitrer.`,
    }
  }

  return { value: 0, detail: "Géographie non comparable (aucun code postal au CRM)." }
}

// ─── Activité ───────────────────────────────────────────────────────────────

/** Section NAF portée par le candidat, à défaut déduite du référentiel du secteur. */
function scoreActivitySection(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): { value: number; detail: string } {
  if (candidate.nafCode && HOLDING_LIKE_NAF.has(candidate.nafCode)) {
    return { value: 0, detail: `NAF de holding ou de support (${candidate.nafCode}) — signal neutre.` }
  }
  const expected = account.sector ? SECTOR_TO_NAF_SECTIONS[account.sector] : undefined
  if (!expected || !candidate.nafSection) {
    return { value: 0, detail: "Secteur ou section NAF inconnu — signal neutre." }
  }
  if (expected.includes(candidate.nafSection)) {
    return {
      value: 1,
      detail: `Section NAF ${candidate.nafSection} cohérente avec « ${account.sector} ».`,
    }
  }
  return {
    value: -1,
    detail: `Section NAF ${candidate.nafSection} inattendue pour « ${account.sector} » (attendu : ${expected.join(", ")}).`,
  }
}

function scoreKnownNaf(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): { value: number; detail: string } | null {
  const known = normalizeText(account.knownNafCode).replace(/\s/g, "")
  const found = normalizeText(candidate.nafCode).replace(/\s/g, "")
  if (known.length === 0 || found.length === 0) return null
  if (known === found) return { value: 1, detail: `Code NAF identique au CRM (${candidate.nafCode}).` }
  if (known.slice(0, 2) === found.slice(0, 2)) {
    return { value: 0.6, detail: `Même division NAF (${found.slice(0, 2)}), code détaillé différent.` }
  }
  return {
    value: -1,
    detail: `Code NAF incompatible : CRM ${account.knownNafCode}, registre ${candidate.nafCode}.`,
  }
}

// ─── Taille et état ─────────────────────────────────────────────────────────

export function employeeTrancheMidpoint(code: string | null | undefined): number | null {
  if (typeof code !== "string") return null
  const key = code.trim()
  return Object.prototype.hasOwnProperty.call(EMPLOYEE_TRANCHE_MIDPOINT, key)
    ? EMPLOYEE_TRANCHE_MIDPOINT[key]
    : null
}

function scoreSize(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): { value: number; detail: string } {
  const crm = account.employeeCount
  const midpoint = employeeTrancheMidpoint(candidate.employeeTrancheCode)
  if (typeof crm !== "number" || !Number.isFinite(crm) || crm <= 0 || midpoint === null || midpoint <= 0) {
    return { value: 0, detail: "Effectif non comparable — signal neutre." }
  }
  const ratio = crm > midpoint ? crm / midpoint : midpoint / crm
  if (ratio <= 3) return { value: 1, detail: `Effectifs du même ordre (CRM ${crm}, tranche ≈ ${midpoint}).` }
  if (ratio <= 10) return { value: -0.4, detail: `Effectifs éloignés (CRM ${crm}, tranche ≈ ${midpoint}).` }
  return { value: -1, detail: `Effectifs d'ordres différents (CRM ${crm}, tranche ≈ ${midpoint}).` }
}

function scoreAdministrativeState(candidate: RegistryCandidate): { value: number; detail: string } {
  if (candidate.administrativeState === "C") {
    return { value: -1, detail: "Entité cessée au registre." }
  }
  return { value: 0, detail: "Entité active." }
}

// ─── Scoring d'un candidat ──────────────────────────────────────────────────

const WEIGHTS: Readonly<Record<EntityResolutionSignalKey, number>> = {
  name: 3,
  geography: 3,
  activity_section: 1,
  known_naf: 2.5,
  size: 0.8,
  administrative_state: 1,
  known_siren: 10,
}

export function scoreCandidate(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): ScoredCandidate {
  const signals: EntityResolutionSignal[] = []
  const nameScore = scoreCandidateName(account, candidate)

  signals.push({
    key: "name",
    weight: WEIGHTS.name,
    value: nameScore,
    detail:
      nameScore >= 1
        ? "Raison sociale identique après normalisation."
        : `Proximité de raison sociale : ${nameScore.toFixed(2)}.`,
    blocking: nameScore < NAME_GATE_MIN,
  })

  const geography = scoreGeography(account, candidate)
  signals.push({
    key: "geography",
    weight: WEIGHTS.geography,
    value: geography.value,
    detail: geography.detail,
    // Seule une contradiction franche (département incompatible) bloque. Une simple
    // divergence de libellé sans code postal pèse dans le score, sans verrouiller.
    blocking: geography.value <= -1,
  })

  const knownNaf = scoreKnownNaf(account, candidate)
  if (knownNaf) {
    signals.push({
      key: "known_naf",
      weight: WEIGHTS.known_naf,
      value: knownNaf.value,
      detail: knownNaf.detail,
      blocking: knownNaf.value < 0,
    })
  } else {
    const activity = scoreActivitySection(account, candidate)
    signals.push({
      key: "activity_section",
      weight: WEIGHTS.activity_section,
      value: activity.value,
      detail: activity.detail,
      // Le référentiel secteur → section est volontairement approximatif :
      // il oriente, il ne condamne pas.
      blocking: false,
    })
  }

  const size = scoreSize(account, candidate)
  signals.push({
    key: "size",
    weight: WEIGHTS.size,
    value: size.value,
    detail: size.detail,
    blocking: false,
  })

  const state = scoreAdministrativeState(candidate)
  signals.push({
    key: "administrative_state",
    weight: WEIGHTS.administrative_state,
    value: state.value,
    detail: state.detail,
    blocking: state.value < 0,
  })

  const score = signals.reduce((total, signal) => total + signal.weight * signal.value, 0)
  const blockers = signals.filter((signal) => signal.blocking).map((signal) => signal.detail)

  return { candidate, score: round2(score), nameScore, signals, blockers }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Signaux capables de contredire un appariement — la taille et l'état n'en sont pas. */
const DISCRIMINATING_SIGNALS: readonly EntityResolutionSignalKey[] = [
  "geography",
  "known_naf",
  "activity_section",
]

/**
 * Contradiction franche : un signal discriminant nettement négatif. Distinct d'un
 * verrou (`blocking`) : la contradiction n'écarte pas le candidat, elle interdit
 * d'écrire quoi que ce soit dans les données canoniques sans un humain.
 */
export function hasStrongContradiction(scored: ScoredCandidate): boolean {
  return scored.signals.some(
    (signal) => DISCRIMINATING_SIGNALS.includes(signal.key) && signal.value <= -0.5,
  )
}

// ─── Résolution ─────────────────────────────────────────────────────────────

/**
 * Résout l'entité légale d'un compte à partir des candidats du registre public.
 *
 * Trois issues seulement :
 *  - `resolved` : un candidat domine, sans signal contradictoire. Seul cas où
 *    l'appelant peut proposer une écriture sur les champs canoniques.
 *  - `needs_human_confirmation` : un candidat plausible existe mais la géographie,
 *    le NAF connu ou l'état administratif le contredisent, ou deux candidats sont
 *    trop proches pour trancher. **Aucune écriture canonique.**
 *  - `unresolved` : rien d'exploitable.
 */
export function resolveEntity(
  account: AccountIdentityInput,
  rawCandidates: RegistryCandidate[],
): EntityResolution {
  const reasons: string[] = []

  // Chemin court : le compte porte déjà un SIREN. Le registre ne sert alors qu'à
  // hydrater l'entité, jamais à en changer.
  const knownSiren = normalizeSiren(account.knownSiren)
  if (knownSiren) {
    const exact = rawCandidates.find((c) => normalizeSiren(c.siren) === knownSiren)
    if (exact) {
      const scored = scoreCandidate(account, exact)
      const contradicted = scored.blockers.length > 0 || hasStrongContradiction(scored)
      const signals: EntityResolutionSignal[] = [
        {
          key: "known_siren",
          weight: WEIGHTS.known_siren,
          value: 1,
          detail: `SIREN déjà connu du CRM (${knownSiren}) — entité imposée, pas déduite.`,
          blocking: false,
        },
        ...scored.signals,
      ]
      return {
        decision: "resolved",
        method: "crm_siren",
        chosen: exact,
        score: round2(WEIGHTS.known_siren + scored.score),
        margin: null,
        signals,
        blockers: scored.blockers,
        reasons: contradicted
          ? ["Entité imposée par le SIREN du CRM, mais des signaux la contredisent — à contrôler."]
          : ["Entité imposée par le SIREN déjà enregistré au CRM."],
        candidates: [scored],
        // L'entité est certaine (le CRM l'impose) : ses attributs sont proposables,
        // sauf si un signal la contredit — ce qui signale alors une donnée fausse
        // quelque part, et appelle un humain plutôt qu'une écriture.
        canProposeCanonicalWrites: !contradicted,
      }
    }
    reasons.push(
      `Le compte porte le SIREN ${knownSiren}, absent des résultats du registre — appariement par nom refusé.`,
    )
    return emptyResolution(reasons)
  }

  const eligible = rawCandidates
    .map((candidate) => scoreCandidate(account, candidate))
    .filter((scored) => scored.nameScore >= NAME_GATE_MIN)
    .sort((a, b) => b.score - a.score || a.candidate.siren.localeCompare(b.candidate.siren))

  if (eligible.length === 0) {
    reasons.push("Aucun candidat ne porte un nom assez proche de celui du compte.")
    return emptyResolution(reasons)
  }

  const best = eligible[0]
  const runnerUp = eligible[1] ?? null
  const margin = runnerUp ? round2(best.score - runnerUp.score) : null
  const candidates = eligible.slice(0, AUDIT_CANDIDATE_LIMIT)

  if (best.score < CANDIDATE_MIN_SCORE) {
    reasons.push(
      `Meilleur score ${best.score} sous le seuil de candidature ${CANDIDATE_MIN_SCORE} — aucune entité proposée.`,
    )
    return { ...emptyResolution(reasons), candidates }
  }

  const failures: string[] = []
  if (best.blockers.length > 0) failures.push(...best.blockers)
  if (best.nameScore < RESOLVED_MIN_NAME_SCORE) {
    failures.push(`Proximité de nom insuffisante (${best.nameScore.toFixed(2)} < ${RESOLVED_MIN_NAME_SCORE}).`)
  }
  if (best.score < RESOLVED_MIN_SCORE) {
    failures.push(`Score global insuffisant (${best.score} < ${RESOLVED_MIN_SCORE}).`)
  }
  if (margin !== null && margin < RESOLVED_MIN_MARGIN) {
    failures.push(
      `Appariement ambigu : ${best.candidate.siren} et ${runnerUp?.candidate.siren} séparés de ${margin} seulement.`,
    )
  }
  // Confirmation indépendante du nom : sans elle, on ne publie pas. Le nom et le
  // secteur ne suffisent pas — le secteur est une correspondance approximative, et
  // le nom est précisément ce qui a produit l'erreur Tournaire.
  const geography = best.signals.find((s) => s.key === "geography")
  const knownNaf = best.signals.find((s) => s.key === "known_naf")
  const hasIndependentConfirmation =
    (geography !== undefined && geography.value > 0) ||
    (knownNaf !== undefined && knownNaf.value >= 0.6)
  if (!hasIndependentConfirmation) {
    failures.push(
      "Aucune confirmation indépendante du nom : ni la commune du siège ni le code NAF connu n'étayent l'appariement.",
    )
  }

  if (failures.length > 0) {
    return {
      decision: "needs_human_confirmation",
      method: "registry_match",
      chosen: best.candidate,
      score: best.score,
      margin,
      signals: best.signals,
      blockers: best.blockers,
      reasons: failures,
      candidates,
      canProposeCanonicalWrites: false,
    }
  }

  return {
    decision: "resolved",
    method: "registry_match",
    chosen: best.candidate,
    score: best.score,
    margin,
    signals: best.signals,
    blockers: [],
    reasons: [
      `Appariement net : score ${best.score}${margin !== null ? `, écart ${margin} avec le suivant` : ", candidat unique"}.`,
    ],
    candidates,
    canProposeCanonicalWrites: true,
  }
}

function emptyResolution(reasons: string[]): EntityResolution {
  return {
    decision: "unresolved",
    method: "none",
    chosen: null,
    score: 0,
    margin: null,
    signals: [],
    blockers: [],
    reasons,
    candidates: [],
    canProposeCanonicalWrites: false,
  }
}

export function normalizeSiren(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const digits = value.replace(/\D/g, "")
  return digits.length === 9 ? digits : null
}

// ─── Contrôle d'un SIREN déjà enregistré ────────────────────────────────────

export type SirenCoherenceReport = {
  siren: string
  coherent: boolean
  score: number
  nameScore: number
  signals: EntityResolutionSignal[]
  blockers: string[]
}

/**
 * Contrôle la cohérence d'un SIREN déjà présent en base avec ce que le CRM sait par
 * ailleurs. Sert l'audit du stock : 32 propositions `siren` ont déjà été appliquées
 * avant la mise en place de ce module.
 */
export function verifyKnownSiren(
  account: AccountIdentityInput,
  candidate: RegistryCandidate,
): SirenCoherenceReport {
  const scored = scoreCandidate(account, candidate)
  // La cohérence ne se juge pas sur les seuls verrous : une divergence de commune ou
  // une section NAF inattendue ne bloquent pas un appariement, mais elles suffisent
  // à demander un contrôle sur un SIREN déjà écrit en base.
  return {
    siren: candidate.siren,
    coherent:
      scored.blockers.length === 0 &&
      !hasStrongContradiction(scored) &&
      scored.nameScore >= RESOLVED_MIN_NAME_SCORE,
    score: scored.score,
    nameScore: scored.nameScore,
    signals: scored.signals,
    blockers: scored.blockers,
  }
}

// ─── Entrée / sortie ────────────────────────────────────────────────────────

/**
 * Requêtes à soumettre au registre, de la plus discriminante à la plus large.
 * L'ancienne implémentation n'en émettait qu'une, bâtie sur `name`, alors que le
 * score comparait `legal_name` — c'est le premier des trois défauts corrigés ici.
 */
export function buildRegistrySearchQueries(account: AccountIdentityInput): string[] {
  const queries: string[] = []
  const push = (value: string | null | undefined) => {
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (trimmed.length < 2) return
    if (!queries.some((q) => normalizeText(q) === normalizeText(trimmed))) queries.push(trimmed)
  }
  for (const variant of nameVariants(account.legalName, account.name)) push(variant)
  return queries
}

type RawRegistryResult = Record<string, unknown>

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function latestFinances(raw: unknown): { revenueEur: number | null; revenueYear: string | null } {
  if (!raw || typeof raw !== "object") return { revenueEur: null, revenueYear: null }
  const years = Object.keys(raw as Record<string, unknown>).filter((y) => /^\d{4}$/.test(y)).sort()
  const latest = years[years.length - 1]
  if (!latest) return { revenueEur: null, revenueYear: null }
  const entry = (raw as Record<string, unknown>)[latest]
  const ca = entry && typeof entry === "object" ? (entry as Record<string, unknown>).ca : null
  return {
    revenueEur: typeof ca === "number" && Number.isFinite(ca) ? ca : null,
    revenueYear: latest,
  }
}

/** Normalise un résultat brut de `recherche-entreprises.api.gouv.fr`. */
export function normalizeRegistryResult(raw: RawRegistryResult): RegistryCandidate | null {
  const siren = normalizeSiren(str(raw.siren))
  if (!siren) return null
  const siege = (raw.siege && typeof raw.siege === "object" ? raw.siege : {}) as Record<string, unknown>

  const enseignes = Array.isArray(siege.liste_enseignes)
    ? (siege.liste_enseignes as unknown[]).map(str).filter((v): v is string => v !== null)
    : []

  const finances = latestFinances(raw.finances)
  const postalCode = str(siege.code_postal)

  return {
    siren,
    legalName: str(raw.nom_raison_sociale) ?? str(raw.nom_complet),
    alternateNames: [
      str(raw.nom_complet),
      str(raw.sigle),
      str(siege.nom_commercial),
      ...enseignes,
    ].filter((v): v is string => v !== null),
    nafCode: str(raw.activite_principale) ?? str(siege.activite_principale),
    nafSection: str(raw.section_activite_principale),
    hqCommune: str(siege.libelle_commune),
    hqPostalCode: postalCode,
    hqDepartment: str(siege.departement) ?? (postalCode ? postalCode.slice(0, 2) : null),
    hqAddress: str(siege.adresse),
    employeeTrancheCode: str(raw.tranche_effectif_salarie) ?? str(siege.tranche_effectif_salarie),
    companyCategory: str(raw.categorie_entreprise),
    createdOn: str(raw.date_creation),
    administrativeState: str(raw.etat_administratif) ?? str(siege.etat_administratif),
    establishmentCount:
      typeof raw.nombre_etablissements === "number" ? raw.nombre_etablissements : null,
    revenueEur: finances.revenueEur,
    revenueYear: finances.revenueYear,
  }
}

// ─── Candidats présentés à un humain ────────────────────────────────────────

export type IdentityCandidate = {
  siren: string
  name: string
  location: string
  nafCode: string | null
  nafSection: string | null
  /** Score du module, exposé pour l'ordre et pour l'explication. */
  score: number
  /** `false` dès qu'un signal discriminant contredit l'appariement. */
  coherent: boolean
  /** Ce que le module a vu, en clair, pour que l'utilisateur puisse trancher. */
  reasons: string[]
}

export type IdentityCandidateRanking = {
  candidates: IdentityCandidate[]
  /**
   * SIREN à présélectionner. `null` dès que le module ne trancherait pas lui-même :
   * l'interface ne doit alors **rien** cocher d'avance.
   *
   * C'est le défaut qui a coûté le compte MMV : la liste était rendue dans l'ordre
   * brut de l'API et le premier élément était coché par défaut. Un humain a confirmé
   * « DEPIL TECH » pour un exploitant de résidences de montagne, en un clic.
   */
  recommendedSiren: string | null
}

/**
 * Ordonne et qualifie les candidats soumis à une confirmation humaine.
 *
 * Le tri par score remplace l'ordre de pertinence brut du registre, qui n'a aucune
 * connaissance du compte. Chaque candidat porte les raisons de son rang : un humain
 * choisit mieux quand on lui montre que la commune ou l'activité ne collent pas.
 */
export function rankIdentityCandidates(
  account: AccountIdentityInput,
  candidates: RegistryCandidate[],
): IdentityCandidateRanking {
  const scored = candidates
    .map((candidate) => scoreCandidate(account, candidate))
    .sort((a, b) => b.score - a.score || a.candidate.siren.localeCompare(b.candidate.siren))

  const resolution = resolveEntity({ ...account, knownSiren: null }, candidates)

  return {
    candidates: scored.map((entry) => ({
      siren: entry.candidate.siren,
      name: entry.candidate.legalName ?? entry.candidate.siren,
      location: [entry.candidate.hqPostalCode, entry.candidate.hqCommune].filter(Boolean).join(" "),
      nafCode: entry.candidate.nafCode,
      nafSection: entry.candidate.nafSection,
      score: entry.score,
      coherent: entry.blockers.length === 0 && !hasStrongContradiction(entry),
      reasons: entry.signals
        .filter((signal) => signal.value !== 0 && signal.key !== "name")
        .map((signal) => signal.detail),
    })),
    recommendedSiren: resolution.decision === "resolved" ? (resolution.chosen?.siren ?? null) : null,
  }
}

/** Bloc `entity_resolution` déposé dans `content_json` et dans le `context_snapshot`. */
export type EntityResolutionSnapshot = {
  decision: EntityResolutionDecision
  method: EntityResolutionMethod
  siren: string | null
  legal_name: string | null
  naf_code: string | null
  naf_section: string | null
  hq_commune: string | null
  hq_postal_code: string | null
  score: number
  margin: number | null
  reasons: string[]
  blockers: string[]
  signals: { key: string; value: number; detail: string }[]
  candidates: { siren: string; legal_name: string | null; commune: string | null; naf_code: string | null; score: number }[]
  needs_human_confirmation: boolean
  can_propose_canonical_writes: boolean
}

export function toResolutionSnapshot(resolution: EntityResolution): EntityResolutionSnapshot {
  return {
    decision: resolution.decision,
    method: resolution.method,
    siren: resolution.chosen?.siren ?? null,
    legal_name: resolution.chosen?.legalName ?? null,
    naf_code: resolution.chosen?.nafCode ?? null,
    naf_section: resolution.chosen?.nafSection ?? null,
    hq_commune: resolution.chosen?.hqCommune ?? null,
    hq_postal_code: resolution.chosen?.hqPostalCode ?? null,
    score: resolution.score,
    margin: resolution.margin,
    reasons: resolution.reasons,
    blockers: resolution.blockers,
    signals: resolution.signals.map((s) => ({ key: s.key, value: s.value, detail: s.detail })),
    candidates: resolution.candidates.map((c) => ({
      siren: c.candidate.siren,
      legal_name: c.candidate.legalName,
      commune: c.candidate.hqCommune,
      naf_code: c.candidate.nafCode,
      score: c.score,
    })),
    needs_human_confirmation: resolution.decision === "needs_human_confirmation",
    can_propose_canonical_writes: resolution.canProposeCanonicalWrites,
  }
}
