/**
 * ADR-0019 Lot 5 — parsing défensif du livrable JSON d'une cartographie
 * concurrentielle (kit `docs/FEATURES/sector_intelligence/cartographie-
 * concurrentielle/01-prompt-generique.md` §7).
 *
 * Module PUR : aucune dépendance Supabase, aucune bibliothèque de validation
 * (le projet n'a ni zod ni équivalent — même doctrine que
 * `account-classification.ts`, des validateurs écrits à la main).
 *
 * Le schéma nominal du kit n'est pas ce que produit le skill en pratique :
 * lu contre `docs/FEATURES/sector_intelligence/livrables_etudes/
 * 2026-08-btp-travaux-publics/export.json` (livrable réel), plusieurs écarts
 * structurels apparaissent et sont absorbés ici plutôt que rejetés :
 *  - `identifiant_national`/`code_activite` (SIREN/NAF) sont quasiment
 *    toujours absents — cohérent avec la règle « le SIREN n'est jamais un
 *    prérequis de résolution » (chantier parallèle Socle Identité France).
 *  - `categorie` porte parfois des tirets (« mid-market ») alors que la
 *    colonne `competitive_map_entries.category` attend des underscores
 *    (« mid_market ») — normalisé ici.
 *  - `date_snapshot` est au format français `JJ/MM/AAAA`, pas ISO.
 *  - `empreinte_metier`/`maturite_numerique` peuvent porter des demi-points
 *    (4.5) alors que les colonnes SQL sont des `smallint` : arrondis ici,
 *    jamais côté SQL (une conversion texte->smallint sur "4.5" échoue).
 *  - Il n'existe pas de correspondance 1:1 vers `positioning`/`forces`/
 *    `vulnerabilite` : seul `positioning` a une source directe raisonnable
 *    (`justification_categorie`). Les deux autres restent vides par défaut,
 *    à compléter dans le bac d'arbitrage (étape 2 du wizard) — ce n'est pas
 *    un oubli, c'est décrit dans le handoff comme un mapping non mécanique.
 *
 * ---------------------------------------------------------------------------
 * BI « Environnement concurrentiel » Lot 1 — extension RÉTROCOMPATIBLE.
 *
 * Tout ce qui est ajouté ici est optionnel : un export V1 (celui du livrable
 * BTP d'août 2026) reste importable sans retouche du fichier.
 *
 *  - `appetence` était lu pour son seul `total`. Les cinq composantes sont
 *    désormais parsées, et le score persisté devient le score CANONIQUE
 *    `capacite_a_payer + intensite_it + 2×moment + 2×accessibilite + fit_offre`
 *    (/35, §5.2 du document directeur). Le `total` livré par l'étude n'est
 *    plus qu'une déclaration : s'il diverge, l'import passe, un warning est
 *    émis, et c'est le canonique qui est persisté. Quand les composantes sont
 *    incomplètes (cas `{"total": 16}` du livrable réel), le canonique est
 *    incalculable et le total déclaré est conservé tel quel.
 *  - `accessibilite` est extraite comme axe propre (`accessibiliteScore`) :
 *    c'est l'ordonnée de la matrice cible. Jamais de valeur de remplacement
 *    quand elle manque — l'acteur restera « Non positionné ».
 *  - Un bloc optionnel `profil_compte` et les champs narratifs déjà présents
 *    au niveau du compte (`trigger_events`, `a_ne_pas_dire`, `trous`,
 *    `sources`) sont agrégés dans `profil`, projeté tel quel dans
 *    `competitive_map_entries.profile_json`. Aucun fait chiffré sourcé n'y
 *    entre : CA et effectif restent dans `account_facts` (ADR-0019 D-4).
 *  - `meta.compte_etalon` marque l'acteur correspondant (`estCompteEtalon`),
 *    qui deviendra `is_benchmark_account` à l'ingestion.
 */

export const COMPETITIVE_MAP_CATEGORY_VALUES = [
  "leader",
  "challenger",
  "mid_market",
  "outsider_emergent",
  "outsider_niche",
] as const
export type CompetitiveMapCategory = (typeof COMPETITIVE_MAP_CATEGORY_VALUES)[number]

export const COMPETITIVE_MAP_CATEGORY_LABELS: Record<CompetitiveMapCategory, string> = {
  leader: "Leader",
  challenger: "Challenger",
  mid_market: "Mid-market",
  outsider_emergent: "Outsider émergent",
  outsider_niche: "Outsider de niche",
}

export const COMPETITIVE_MAP_CONFIANCE_VALUES = ["haute", "moyenne", "faible"] as const
export type CompetitiveMapConfiance = (typeof COMPETITIVE_MAP_CONFIANCE_VALUES)[number]

/**
 * Domaine canonique KREDO : `haute | moyenne | faible`. C'est le CHECK
 * `competitive_map_entries_confiance_check`, vérifié en base — il ne bouge pas.
 *
 * Le kit de génération a longtemps écrit `elevee` (schéma §7 de
 * `01-prompt-generique.md`, corrigé depuis). Les exports produits avant cette
 * correction restent importables grâce à cette table d'alias, qui est le SEUL
 * endroit du code où une variante legacy est acceptée : tout le reste de la
 * chaîne ne voit que la valeur canonique.
 */
const CONFIANCE_ALIASES: Readonly<Record<string, CompetitiveMapConfiance>> = {
  haute: "haute",
  elevee: "haute",
  moyenne: "moyenne",
  faible: "faible",
}

/**
 * Les cinq composantes de l'appétence, telles que livrées, plus les deux
 * lectures du score : ce que l'étude a écrit, et ce que la formule canonique
 * donne. Les deux sont conservées pour que le warning de divergence puisse
 * être formulé — seul `totalCanonique` (quand il existe) est persisté.
 */
export type CompetitiveMapAppetence = {
  capaciteAPayer: number | null
  intensiteIt: number | null
  moment: number | null
  accessibilite: number | null
  fitOffre: number | null
  /** `appetence.total` du livrable. Jamais persisté quand le canonique est calculable. */
  totalDeclare: number | null
  /** `capacite + intensite + 2×moment + 2×accessibilite + fit`. `null` si une composante manque. */
  totalCanonique: number | null
}

/**
 * Valeur JSON quelconque. Redéclarée ici plutôt qu'importée de
 * `database.generated.ts` : ce module est PUR (aucune dépendance Supabase,
 * cf. en-tête). Structurellement compatible avec le type `Json` généré, ce qui
 * permet de passer `profile_json` à la RPC sans cast côté action.
 */
export type CompetitiveMapJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: CompetitiveMapJsonValue | undefined }
  | CompetitiveMapJsonValue[]

/**
 * Narratif propre à une étude, projeté tel quel dans
 * `competitive_map_entries.profile_json`. Volontairement ouvert : la forme
 * exacte varie d'une étude à l'autre et il n'est pas question de la figer en
 * colonnes. Les clés vides ne sont jamais écrites — un export sans narratif
 * produit `{}`.
 */
export type CompetitiveMapProfile = { [key: string]: CompetitiveMapJsonValue | undefined }

export type CompetitiveMapAccountInput = {
  nom: string
  identifiantNational: string | null
  categorie: CompetitiveMapCategory
  justificationCategorie: string | null
  caMeur: number | null
  exercice: number | null
  perimetreCa: string | null
  effectifFrance: number | null
  empreinteMetier: number | null
  maturiteNumerique: number | null
  /** Composantes brutes — `null` si le bloc `appetence` est absent. */
  appetence: CompetitiveMapAppetence | null
  /** Score /35 à persister : canonique dès que les 5 composantes sont là, sinon total déclaré. */
  appetenceScore: number | null
  /** Composante « accessibilité » isolée (1-5) — axe Y de la matrice. */
  accessibiliteScore: number | null
  angleEntree: string | null
  confiance: CompetitiveMapConfiance
  /** Dérivé de `meta.compte_etalon` — devient `is_benchmark_account`. */
  estCompteEtalon: boolean
  profil: CompetitiveMapProfile
}

export type CompetitiveMapOutput = {
  secteur: string
  /** Libellé brut de `meta.segment` — jamais résolu automatiquement en slug (§9 REFERENTIEL, aucune création de segment). L'utilisateur choisit le segment cible dans le référentiel existant. */
  segmentLabel: string
  /** ISO `AAAA-MM-JJ`, converti depuis `JJ/MM/AAAA` si besoin. */
  dateSnapshot: string
  compteEtalon: string | null
  comptes: CompetitiveMapAccountInput[]
}

export type CompetitiveMapParseError = { path: string; message: string }

function normalizeCategory(raw: unknown): CompetitiveMapCategory | null {
  if (typeof raw !== "string") return null
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_")
  return (COMPETITIVE_MAP_CATEGORY_VALUES as readonly string[]).includes(normalized)
    ? (normalized as CompetitiveMapCategory)
    : null
}

/** `NFD` + suppression des diacritiques : « Élevée » et « elevee » deviennent la même clé. */
function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Normalisation centralisée et déterministe de `confiance`. Casse, espaces et
 * accents sont neutralisés, puis la table d'alias tranche. Toute valeur hors
 * table -> `null`, ce qui fait rejeter le compte (et donc le fichier) : une
 * confiance inconnue n'est jamais devinée.
 */
export function normalizeConfiance(raw: unknown): CompetitiveMapConfiance | null {
  if (typeof raw !== "string") return null
  const key = stripAccents(raw.trim().toLowerCase())
  return CONFIANCE_ALIASES[key] ?? null
}

/** `true` quand la valeur livrée n'était pas déjà la valeur canonique (ex. « élevée » -> « haute »). */
function isLegacyConfianceLabel(raw: unknown, normalized: CompetitiveMapConfiance): boolean {
  if (typeof raw !== "string") return false
  return stripAccents(raw.trim().toLowerCase()) !== normalized
}

function toNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  return null
}

/** Colonnes `empreinte_metier`/`maturite_numerique` sont des `smallint` en base : les demi-points du livrable (4.5) sont arrondis ici, jamais envoyés tels quels au SQL. */
function toRoundedScale1To5(raw: unknown): number | null {
  const value = toNullableNumber(raw)
  if (value === null) return null
  const rounded = Math.round(value)
  return rounded >= 1 && rounded <= 5 ? rounded : null
}

/**
 * Une composante d'appétence est notée 1/3/5 (grille F6), stockée en `smallint`.
 * Hors de 1-5 -> `null` : c'est le cas du gabarit du kit, qui livre des `0` de
 * remplissage. Un `0` traité comme une note ferait passer un squelette non
 * renseigné pour un score canonique légitime.
 */
function toAppetenceComponent(raw: unknown): number | null {
  return toRoundedScale1To5(raw)
}

/** `appetence_score` est un `smallint check between 0 and 35` : hors bornes -> `null` plutôt qu'une erreur SQL en fin de chaîne. */
function toAppetenceTotal(raw: unknown): number | null {
  const value = toNullableNumber(raw)
  if (value === null) return null
  const rounded = Math.round(value)
  return rounded >= 0 && rounded <= 35 ? rounded : null
}

/**
 * Formule canonique du document directeur §5.2 :
 * `capacite_a_payer + intensite_it + 2×moment + 2×accessibilite + fit_offre`,
 * soit un score sur 35. Elle n'est calculable que si les CINQ composantes sont
 * présentes — une somme partielle ne serait pas un score /35, juste un nombre.
 */
export function computeCanonicalAppetenceScore(components: {
  capaciteAPayer: number | null
  intensiteIt: number | null
  moment: number | null
  accessibilite: number | null
  fitOffre: number | null
}): number | null {
  const { capaciteAPayer, intensiteIt, moment, accessibilite, fitOffre } = components
  if (
    capaciteAPayer === null ||
    intensiteIt === null ||
    moment === null ||
    accessibilite === null ||
    fitOffre === null
  ) {
    return null
  }
  return capaciteAPayer + intensiteIt + 2 * moment + 2 * accessibilite + fitOffre
}

function parseAppetence(raw: unknown): CompetitiveMapAppetence | null {
  if (!raw || typeof raw !== "object") return null
  const data = raw as Record<string, unknown>

  const components = {
    capaciteAPayer: toAppetenceComponent(data.capacite_a_payer),
    intensiteIt: toAppetenceComponent(data.intensite_it),
    moment: toAppetenceComponent(data.moment),
    accessibilite: toAppetenceComponent(data.accessibilite),
    fitOffre: toAppetenceComponent(data.fit_offre),
  }

  return {
    ...components,
    totalDeclare: toAppetenceTotal(data.total),
    totalCanonique: computeCanonicalAppetenceScore(components),
  }
}

/**
 * Clés narratives agrégées dans `profile_json`. Trois familles seulement, pour
 * que la validation reste une projection et non un schéma : du texte, des
 * listes, un objet libre. Rien de chiffré et sourcé n'entre ici — CA et
 * effectif vont dans `account_facts` (ADR-0019 D-4).
 */
const PROFILE_TEXT_KEYS = ["proposition_valeur", "modele_economique", "a_ne_pas_dire"] as const
const PROFILE_LIST_KEYS = [
  "dependances_cles",
  "differenciateurs",
  "priorites_strategiques",
  "chantiers_technologiques",
  "trigger_events",
  "trous",
  "sources",
] as const
const PROFILE_OBJECT_KEYS = ["chaine_valeur"] as const

/**
 * Le bloc `profil_compte` est optionnel et récent ; les études V1 portent déjà
 * `trigger_events` / `a_ne_pas_dire` / `trous` / `sources` directement sur le
 * compte. Les deux emplacements sont lus, `profil_compte` gagnant en cas de
 * doublon. Une clé vide n'est jamais écrite : un export V1 sans narratif rend
 * `{}`, ce que la colonne attend par défaut.
 */
function buildProfile(data: Record<string, unknown>): CompetitiveMapProfile {
  const nested = data.profil_compte && typeof data.profil_compte === "object" && !Array.isArray(data.profil_compte)
    ? (data.profil_compte as Record<string, unknown>)
    : null
  const pick = (key: string): unknown => (nested && key in nested ? nested[key] : data[key])

  const profile: CompetitiveMapProfile = {}

  for (const key of PROFILE_TEXT_KEYS) {
    const value = toNullableString(pick(key))
    if (value !== null) profile[key] = value
  }

  // Les valeurs proviennent d'un `JSON.parse` : la conversion vers
  // `CompetitiveMapJsonValue` est sûre par construction, TypeScript ne peut
  // simplement pas le déduire d'un `unknown`.
  for (const key of PROFILE_LIST_KEYS) {
    const value = pick(key)
    if (Array.isArray(value) && value.length > 0) profile[key] = value as CompetitiveMapJsonValue[]
  }

  for (const key of PROFILE_OBJECT_KEYS) {
    const value = pick(key)
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
      profile[key] = value as CompetitiveMapJsonValue
    }
  }

  return profile
}

/**
 * Rapprochement `meta.compte_etalon` -> compte de l'étude. Comparaison
 * interne au fichier, sans aucun rapport avec la résolution CRM : celle-ci
 * reste en SQL (`resolve_company_candidates`) et n'est jamais réimplémentée
 * ici.
 */
function normalizeStudyAccountName(value: string): string {
  return stripAccents(value.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * `JJ/MM/AAAA` (format réel du livrable) ou `AAAA-MM-JJ` (ISO, format nominal
 * du kit) -> ISO. `null` si aucun des deux formats ne matche.
 */
export function parseStudySnapshotDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return trimmed

  const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch) {
    const [, day, month, year] = frMatch
    return `${year}-${month}-${day}`
  }

  return null
}

function parseAccount(
  raw: unknown,
  index: number,
  warnings: string[],
  /** Collecte les libellés legacy rencontrés, pour n'émettre qu'un warning agrégé et non un par compte. */
  legacyConfianceLabels: Set<string>,
): CompetitiveMapAccountInput | CompetitiveMapParseError {
  const path = `comptes[${index}]`
  if (!raw || typeof raw !== "object") {
    return { path, message: "Entrée de compte invalide (attendu un objet)." }
  }
  const data = raw as Record<string, unknown>

  const nom = toNullableString(data.nom)
  if (!nom) return { path: `${path}.nom`, message: "Le nom du compte est obligatoire." }

  const categorie = normalizeCategory(data.categorie)
  if (!categorie) {
    return {
      path: `${path}.categorie`,
      message: `Catégorie « ${String(data.categorie)} » hors domaine (${COMPETITIVE_MAP_CATEGORY_VALUES.join(", ")}).`,
    }
  }

  const confiance = normalizeConfiance(data.confiance)
  if (!confiance) {
    return {
      path: `${path}.confiance`,
      message: `Confiance « ${String(data.confiance)} » hors domaine (${COMPETITIVE_MAP_CONFIANCE_VALUES.join(", ")}).`,
    }
  }
  if (isLegacyConfianceLabel(data.confiance, confiance)) {
    legacyConfianceLabels.add(String(data.confiance).trim())
  }

  const appetence = parseAppetence(data.appetence)

  // Le canonique prime dès qu'il est calculable ; sinon on garde ce que
  // l'étude a déclaré (les exports V1 ne livrent souvent que `total`).
  const appetenceScore = appetence?.totalCanonique ?? appetence?.totalDeclare ?? null

  if (appetence) {
    if (
      appetence.totalCanonique !== null &&
      appetence.totalDeclare !== null &&
      appetence.totalCanonique !== appetence.totalDeclare
    ) {
      warnings.push(
        `Appétence « ${nom} » : total déclaré ${appetence.totalDeclare} ≠ score canonique ${appetence.totalCanonique} ` +
          `(${appetence.capaciteAPayer} + ${appetence.intensiteIt} + 2×${appetence.moment} + 2×${appetence.accessibilite} + ${appetence.fitOffre}). ` +
          `Le score canonique est conservé.`,
      )
    } else if (appetence.totalCanonique === null) {
      warnings.push(
        `Appétence « ${nom} » : composantes incomplètes, score canonique /35 incalculable — ` +
          `le total déclaré (${appetence.totalDeclare ?? "absent"}) est conservé tel quel.`,
      )
    }
  }

  return {
    nom,
    identifiantNational: toNullableString(data.identifiant_national),
    categorie,
    justificationCategorie: toNullableString(data.justification_categorie),
    caMeur: toNullableNumber(data.ca_meur),
    exercice: toNullableNumber(data.exercice),
    perimetreCa: toNullableString(data.perimetre_ca),
    effectifFrance: toNullableNumber(data.effectif_france),
    empreinteMetier: toRoundedScale1To5(data.empreinte_metier),
    maturiteNumerique: toRoundedScale1To5(data.maturite_numerique),
    appetence,
    appetenceScore,
    accessibiliteScore: appetence?.accessibilite ?? null,
    angleEntree: toNullableString(data.angle_entree),
    confiance,
    // Réécrit par parseCompetitiveMapOutput, seul endroit qui voit meta.compte_etalon.
    estCompteEtalon: false,
    profil: buildProfile(data),
  }
}

export function parseCompetitiveMapOutput(
  raw: unknown,
):
  | { data: CompetitiveMapOutput; warnings: string[] }
  | { errors: CompetitiveMapParseError[] } {
  if (!raw || typeof raw !== "object") {
    return { errors: [{ path: "", message: "Le fichier ne contient pas un objet JSON valide." }] }
  }
  const root = raw as Record<string, unknown>

  const meta = root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : null
  if (!meta) {
    return { errors: [{ path: "meta", message: "Bloc « meta » manquant." }] }
  }

  const errors: CompetitiveMapParseError[] = []
  const warnings: string[] = []

  const secteur = toNullableString(meta.secteur)
  if (!secteur) errors.push({ path: "meta.secteur", message: "meta.secteur est obligatoire." })

  const segmentLabel = toNullableString(meta.segment)
  if (!segmentLabel) errors.push({ path: "meta.segment", message: "meta.segment est obligatoire." })

  const dateSnapshot = parseStudySnapshotDate(meta.date_snapshot)
  if (!dateSnapshot) {
    errors.push({
      path: "meta.date_snapshot",
      message: "meta.date_snapshot doit être au format JJ/MM/AAAA ou AAAA-MM-JJ.",
    })
  }

  if (!Array.isArray(root.comptes) || root.comptes.length === 0) {
    errors.push({ path: "comptes", message: "Le tableau « comptes » est vide ou absent." })
  }

  if (errors.length > 0) return { errors }

  const comptes: CompetitiveMapAccountInput[] = []
  const accountWarnings: string[] = []
  const legacyConfianceLabels = new Set<string>()
  for (const [index, item] of (root.comptes as unknown[]).entries()) {
    const parsed = parseAccount(item, index, accountWarnings, legacyConfianceLabels)
    if ("message" in parsed) {
      errors.push(parsed)
    } else {
      comptes.push(parsed)
    }
  }

  if (errors.length > 0) return { errors }

  // §5.3 — `meta.compte_etalon` détermine is_benchmark_account. Un libellé qui
  // ne retombe sur aucun compte est un défaut de l'étude, pas un motif de rejet.
  const compteEtalon = toNullableString(meta.compte_etalon)
  if (compteEtalon) {
    const target = normalizeStudyAccountName(compteEtalon)
    const matches = comptes.filter((compte) => normalizeStudyAccountName(compte.nom) === target)
    for (const compte of matches) compte.estCompteEtalon = true
    if (matches.length === 0) {
      warnings.push(
        `Compte étalon « ${compteEtalon} » (meta.compte_etalon) introuvable parmi les comptes de l'étude — aucun acteur ne sera marqué comme étalon.`,
      )
    }
  }

  if (legacyConfianceLabels.size > 0) {
    warnings.push(
      `Confiance : valeur(s) legacy ${[...legacyConfianceLabels].map((l) => `« ${l} »`).join(", ")} normalisée(s) vers le domaine canonique ` +
        `(${COMPETITIVE_MAP_CONFIANCE_VALUES.join(" | ")}). Le kit de génération produit désormais « haute » — cet export est antérieur à la correction.`,
    )
  }

  warnings.push(...accountWarnings)

  if (Array.isArray(root.ecartes) && root.ecartes.length > 0) {
    warnings.push(
      `${root.ecartes.length} compte(s) écarté(s) par l'étude (« ecartes ») — non importé(s), à traiter manuellement si besoin.`,
    )
  }

  return {
    data: {
      secteur: secteur as string,
      segmentLabel: segmentLabel as string,
      dateSnapshot: dateSnapshot as string,
      compteEtalon,
      comptes,
    },
    warnings,
  }
}
