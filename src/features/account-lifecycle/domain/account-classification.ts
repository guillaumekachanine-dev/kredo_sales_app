/**
 * ADR-0019 Lot 4 — les 7 axes de classification d'un compte.
 *
 * Fait autorité : `docs/FEATURES/sector_intelligence/taxonomie-sectorielle/
 * REFERENTIEL-CLASSIFICATION.md` (§5 spécification des paramètres, §7 format de
 * sortie IA, §10 contrôles obligatoires, §12 interdits absolus).
 *
 * Module PUR : aucune dépendance Supabase, aucun accès réseau. Il porte les
 * domaines de valeurs et les contrôles §10 qui peuvent être vérifiés sans la
 * base. Les deux contrôles qui exigent la base (résolution du segment, garde-fou
 * relationnel §12.9) vivent dans la RPC `apply_account_classification`, seul
 * point d'écriture — cf. `actions/apply-account-classification.ts`.
 *
 * Pourquoi un objet atomique plutôt que 7 propositions unitaires : le §10 pose
 * quatre contrôles BLOQUANTS qui portent sur plusieurs champs à la fois
 * (`sector_id` = parent du segment ; `regime_achat`+`modele_eco`+`relation_type`
 * renseignés ; note obligatoire si confiance ≠ haute). Une file de propositions
 * champ-par-champ (`enrichment_proposals`) permettrait d'appliquer `segment_id`
 * sans son macro et violerait le contrôle 2 par construction.
 */

// ─── Domaines de valeurs — CHECK réels de `companies` (migration 20260809142701)

/** §5.3 — régime de contrainte (cause n°1). Obligatoire, jamais NULL. */
export const REGIME_ACHAT_VALUES = ["commande_publique", "regule", "monaco", "prive"] as const
export type RegimeAchat = (typeof REGIME_ACHAT_VALUES)[number]

/** §5.4 — modèle économique et rôle dans la chaîne (cause n°2). */
export const MODELE_ECO_VALUES = [
  "multi_sites",
  "b2c_reseau",
  "b2b_projet",
  "industriel",
  "editeur",
  "captif",
  "concession",
  "institution",
] as const
export type ModeleEco = (typeof MODELE_ECO_VALUES)[number]

/** §5.5 — trajectoire (cause n°3). Jamais sans fait daté et sourçable (§12.5). */
export const MOMENT_VALUES = [
  "integration_post_ma",
  "croissance_forte",
  "retournement",
  "renouvellement_concession",
  "reorganisation_si",
  "stable",
] as const
export type Moment = (typeof MOMENT_VALUES)[number]

/** §5.9 — traçabilité de la décision de classification. */
export const CLASSIFICATION_CONFIANCE_VALUES = ["haute", "moyenne", "faible"] as const
export type ClassificationConfiance = (typeof CLASSIFICATION_CONFIANCE_VALUES)[number]

export const REGIME_ACHAT_LABELS: Record<RegimeAchat, string> = {
  commande_publique: "Commande publique",
  regule: "Secteur régulé",
  monaco: "Monaco (hors UE)",
  prive: "Privé standard",
}

export const MODELE_ECO_LABELS: Record<ModeleEco, string> = {
  multi_sites: "Réseau multi-sites",
  b2c_reseau: "B2C / réseau",
  b2b_projet: "B2B projet",
  industriel: "Industriel",
  editeur: "Éditeur logiciel",
  captif: "Entité captive",
  concession: "Concession / DSP",
  institution: "Institution",
}

export const MOMENT_LABELS: Record<Moment, string> = {
  integration_post_ma: "Intégration post-M&A",
  croissance_forte: "Croissance forte",
  retournement: "Retournement",
  renouvellement_concession: "Renouvellement de concession",
  reorganisation_si: "Réorganisation SI",
  stable: "Stable",
}

export function isRegimeAchat(value: unknown): value is RegimeAchat {
  return typeof value === "string" && (REGIME_ACHAT_VALUES as readonly string[]).includes(value)
}

export function isModeleEco(value: unknown): value is ModeleEco {
  return typeof value === "string" && (MODELE_ECO_VALUES as readonly string[]).includes(value)
}

export function isMoment(value: unknown): value is Moment {
  return typeof value === "string" && (MOMENT_VALUES as readonly string[]).includes(value)
}

export function isClassificationConfiance(value: unknown): value is ClassificationConfiance {
  return (
    typeof value === "string" &&
    (CLASSIFICATION_CONFIANCE_VALUES as readonly string[]).includes(value)
  )
}

// ─── Les 7 axes ──────────────────────────────────────────────────────────────

/**
 * Clés d'axe manipulées par l'UI de revue : l'utilisateur accepte ou écarte
 * chaque axe indépendamment, mais l'écriture reste une transaction unique.
 *
 * `sector_id` n'y figure pas volontairement : §5.1 — « on ne choisit jamais un
 * macro directement : on choisit un segment, le macro suit ». Il est déduit de
 * `segment.parent_id` côté RPC, ce qui rend le contrôle 2 du §10 vrai par
 * construction au lieu d'être une vérification qu'on pourrait oublier.
 */
export const CLASSIFICATION_AXES = [
  "segment",
  "regime_achat",
  "modele_eco",
  "moment",
  "tier",
  "vertical_client",
  "relation_type",
] as const
export type ClassificationAxis = (typeof CLASSIFICATION_AXES)[number]

export const CLASSIFICATION_AXIS_LABELS: Record<ClassificationAxis, string> = {
  segment: "Segment commercial",
  regime_achat: "Régime d'achat",
  modele_eco: "Modèle économique",
  moment: "Trajectoire",
  tier: "Capacité (tier)",
  vertical_client: "Verticale client",
  relation_type: "Statut relationnel",
}

/**
 * Axes normatifs du §10 contrôle 3 : la fiche doit les porter à l'arrivée.
 * Tuple `const` et non `ClassificationAxis[]` — le type dérivé sert à indexer
 * l'état courant, et un élargissement à tous les axes ferait passer une table
 * de correspondance incomplète.
 */
export const MANDATORY_CLASSIFICATION_AXES = [
  "segment",
  "regime_achat",
  "modele_eco",
  "relation_type",
] as const satisfies readonly ClassificationAxis[]

export type MandatoryClassificationAxis = (typeof MANDATORY_CLASSIFICATION_AXES)[number]

export function isClassificationAxis(value: string): value is ClassificationAxis {
  return (CLASSIFICATION_AXES as readonly string[]).includes(value)
}

// ─── Contrat de proposition (miroir du §7) ───────────────────────────────────

export type ClassificationTests = {
  concurrence: boolean
  acheteurs: boolean
  contraintes: boolean
  offres: boolean
}

export type ClassificationAlternative = {
  segmentSlug: string
  motif: string
}

/**
 * Miroir TypeScript du format de sortie §7. Volontairement en `slug` et non en
 * uuid : une IA ne doit jamais manipuler d'identifiant technique, et le slug est
 * la seule clé stable du référentiel (§12.4 — « ne jamais renommer un slug »).
 */
export type AccountClassificationProposal = {
  schemaVersion: 1
  activiteDominante: string
  segmentSlug: string
  /** Déduit du segment par la RPC. Présent ici pour l'affichage seulement. */
  macroSlug: string | null
  tests: ClassificationTests
  regimeAchat: RegimeAchat | null
  modeleEco: ModeleEco | null
  tier: string | null
  verticalClient: string[]
  relationType: string | null
  moment: Moment | null
  /** §5.5 / §12.5 — un `moment` sans preuve datée est refusé. */
  momentPreuve: string | null
  classificationConfiance: ClassificationConfiance
  classificationNote: string | null
  alternativesEcartees: ClassificationAlternative[]
}

// ─── Contrôles §10 vérifiables sans la base ──────────────────────────────────

export type ClassificationViolation = {
  /** Numéro du contrôle §10, ou de l'interdit §12, pour tracer la règle violée. */
  rule: string
  axis: ClassificationAxis | null
  message: string
}

/**
 * État déjà en base pour les axes normatifs. Le §10 contrôle 3 porte sur l'état
 * FINAL de la fiche (« colonnes normatives renseignées »), pas sur la sélection :
 * écarter un axe déjà rempli en base est légitime — les 96 comptes du parc sont
 * classés, un rescan ne doit pas obliger à réécrire ce qui est déjà juste.
 * Absent = compte neuf, tous les axes normatifs doivent alors être fournis.
 */
export type CurrentClassificationState = {
  segmentId: string | null
  regimeAchat: string | null
  modeleEco: string | null
  relationType: string | null
}

const MANDATORY_AXIS_CURRENT_KEY: Record<
  MandatoryClassificationAxis,
  keyof CurrentClassificationState
> = {
  segment: "segmentId",
  regime_achat: "regimeAchat",
  modele_eco: "modeleEco",
  relation_type: "relationType",
}

/**
 * Applique les contrôles §10 qui ne dépendent pas de la base, plus les interdits
 * §12 correspondants. Renvoie la liste des violations : vide = applicable.
 *
 * Ne vérifie PAS (impossible hors base, fait par la RPC) :
 *  - contrôle 1 : existence du `segment_slug` dans le référentiel
 *  - contrôle 2 : `sector_id` = parent du segment (garanti par construction)
 *  - contrôle 8 : doublon de compte
 *  - interdit §12.9 : statut relationnel contredit par la réalité commerciale
 */
export function validateClassificationProposal(
  proposal: AccountClassificationProposal,
  acceptedAxes: readonly ClassificationAxis[],
  current?: CurrentClassificationState,
): ClassificationViolation[] {
  const violations: ClassificationViolation[] = []
  const accepted = new Set(acceptedAxes)

  // §10 contrôle 3 — l'axe normatif doit être renseigné À L'ARRIVÉE : soit par
  // cette classification, soit parce qu'il l'est déjà en base.
  for (const axis of MANDATORY_CLASSIFICATION_AXES) {
    if (accepted.has(axis)) continue
    const alreadySet = current ? current[MANDATORY_AXIS_CURRENT_KEY[axis]] : null
    if (!alreadySet) {
      violations.push({
        rule: "§10.3",
        axis,
        message: `« ${CLASSIFICATION_AXIS_LABELS[axis]} » est obligatoire et n'est pas renseigné sur la fiche : il ne peut pas être écarté.`,
      })
    }
  }

  if (accepted.has("segment") && !proposal.segmentSlug.trim()) {
    violations.push({
      rule: "§10.1",
      axis: "segment",
      message: "Aucun segment proposé — le rattachement est obligatoire.",
    })
  }

  if (accepted.has("regime_achat") && !isRegimeAchat(proposal.regimeAchat)) {
    violations.push({
      rule: "§5.3",
      axis: "regime_achat",
      message: "Le régime d'achat est obligatoire et doit appartenir au domaine.",
    })
  }

  if (accepted.has("modele_eco") && !isModeleEco(proposal.modeleEco)) {
    violations.push({
      rule: "§5.4",
      axis: "modele_eco",
      message: "Le modèle économique proposé n'appartient pas au domaine.",
    })
  }

  // §12.5 — « ne jamais renseigner `moment` sans fait daté et sourçable ».
  // Le §10 contrôle 6 en fait un contrôle bloquant.
  if (accepted.has("moment") && proposal.moment !== null) {
    if (!isMoment(proposal.moment)) {
      violations.push({
        rule: "§5.5",
        axis: "moment",
        message: "La trajectoire proposée n'appartient pas au domaine.",
      })
    } else if (!proposal.momentPreuve || !proposal.momentPreuve.trim()) {
      violations.push({
        rule: "§10.6",
        axis: "moment",
        message:
          "Une trajectoire ne s'écrit qu'avec un fait daté et sourçable. Sans preuve, écarter cet axe.",
      })
    }
  }

  // §10 contrôle 4 — la note documente ce qui est incertain.
  if (
    proposal.classificationConfiance !== "haute" &&
    (!proposal.classificationNote || !proposal.classificationNote.trim())
  ) {
    violations.push({
      rule: "§10.4",
      axis: null,
      message:
        "Une confiance « moyenne » ou « faible » exige une note expliquant ce qui reste à vérifier.",
    })
  }

  // §12.8 — une confiance « haute » est incompatible avec un test en échec.
  const failedTests = Object.entries(proposal.tests)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (proposal.classificationConfiance === "haute" && failedTests.length > 0) {
    violations.push({
      rule: "§12.8",
      axis: null,
      message: `Confiance « haute » impossible : ${failedTests.length} test(s) en échec (${failedTests.join(", ")}).`,
    })
  }

  return violations
}

/**
 * Axes réellement porteurs d'une valeur. Un axe facultatif sans valeur n'est pas
 * une erreur (§5.6 « NULL est une réponse valide ») : il est simplement absent
 * de la sélection par défaut plutôt que proposé vide.
 */
export function defaultAcceptedAxes(
  proposal: AccountClassificationProposal,
): ClassificationAxis[] {
  const accepted: ClassificationAxis[] = [...MANDATORY_CLASSIFICATION_AXES]

  if (proposal.tier) accepted.push("tier")
  if (proposal.verticalClient.length > 0) accepted.push("vertical_client")
  // Un `moment` sans preuve n'est jamais pré-coché : le §12.5 l'interdit, et le
  // pré-cocher inviterait à valider d'un clic ce que la règle refuse.
  if (proposal.moment && proposal.momentPreuve?.trim()) accepted.push("moment")

  return CLASSIFICATION_AXES.filter((axis) => accepted.includes(axis))
}
