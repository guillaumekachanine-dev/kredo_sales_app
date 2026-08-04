// ─── Socle commun « Intelligence Entreprise / Intelligence Sectorielle » ─────
// Lot 0 — types partagés par les artefacts compte ET secteur. Aucun de ces
// types n'est spécifique à une entité : ils décrivent COMMENT une affirmation
// est étayée, pas de QUOI elle parle.
//
// Pourquoi un fichier dédié plutôt qu'un ajout dans account-intelligence-contracts.ts :
// ce dernier est explicitement l'ADR-0012 (chaîne de décision COMPTE). Le
// contrat sectoriel (sector-intelligence-contracts.ts) partage Claim/QualitySummary
// sans rien devoir au domaine compte — les loger là créerait une dépendance
// secteur → compte qui n'existe pas dans le modèle.

// ─── Claim — affirmation traçable ───────────────────────────────────────────
// Unité de base de tout artefact d'intelligence rédigé par un moteur.
//
// `source_refs` contient des UUID de `intelligence_sources.id` — la table de
// sources factuelles individuelles déjà en place (site officiel, registre
// SIRENE, presse…). C'est un pointeur vers une source RÉELLE et datée, à ne
// pas confondre avec `IntelligenceSourceRef` ({table, id}) d'ADR-0012, qui
// pointe vers une ligne métier Supabase (contact, opportunité…). Les deux
// coexistent : l'un cite une preuve externe, l'autre une donnée interne.

export type ClaimNature = "fact" | "analysis"

export type Claim = {
  /** Énoncé lisible. Jamais un placeholder (cf. isPlaceholderText). */
  text: string
  /**
   * `fact` : énoncé vérifiable, doit citer au moins une source externe.
   * `analysis` : déduction, doit citer les sources des faits qu'elle mobilise
   * (règle explicite du cadrage : pas d'analyse « hors-sol »).
   */
  nature: ClaimNature
  /** UUID de `intelligence_sources.id`. Non vide dans les deux natures. */
  source_refs: string[]
  /** Confiance du moteur, bornée 0..1 inclus. */
  confidence: number
  /** Date de vérification humaine (ISO). `null` tant que non vérifié. */
  verified_at: string | null
}

// ─── DeterministicIndicator — mesure calculée, jamais rédigée ────────────────
// Contrepartie chiffrée du Claim : produit par du code déterministe (0 token),
// versionné par `method_version` pour qu'un score reste interprétable après
// changement de méthode. Même doctrine que le scoring ADR-0011 : aucun score
// opaque, on expose toujours de quoi le reconstituer.

export type DeterministicIndicator = {
  label: string
  /** `null` = non calculable faute de matière — jamais 0 par défaut. */
  score: number | null
  /** Bornes de la fenêtre observée (ISO). */
  period_start: string
  period_end: string
  /** Nombre d'éléments réellement observés sur la période. */
  evidence_count: number
  /** Version de la méthode de calcul (ex. "market-pressure-v1"). */
  method_version: string
  /** UUID de `intelligence_sources.id`. */
  source_refs: string[]
}

// ─── QualitySummary — couverture de sourcing d'un artefact ──────────────────
// Calculé après génération, stocké dans l'artefact lui-même (`source_coverage`).
// Les `*_paths` sont des chemins JSON pointant la section fautive
// (ex. "market_positioning.direct_competitors[2]"), pour rendre un défaut
// localisable sans relire tout l'artefact.

export type QualitySummary = {
  /** Nombre de claims réellement exposés à l'utilisateur. */
  displayed_claims: number
  /** Sous-ensemble des précédents qui cite au moins une source. */
  sourced_claims: number
  /** sourced_claims / displayed_claims, borné 0..1. 1 si aucun claim. */
  coverage_rate: number
  missing_source_paths: string[]
  stale_source_paths: string[]
  contradiction_paths: string[]
  /** Verdict global du contrôle qualité. */
  passed: boolean
}

// ─── Placeholders métier ────────────────────────────────────────────────────
// FOLIO écrivait « Non trouvé » comme valeur de champ. Ces marqueurs ne doivent
// jamais devenir du contenu métier affiché ni un Claim valide.
//
// Comparaison sur l'égalité EXACTE après normalisation, jamais sur une
// sous-chaîne : plusieurs valeurs FOLIO réelles commencent par « Non trouvé »
// tout en étant informatives (« Non trouvé - contexte de PSE et fermetures de
// sites suggère absence de recrutements »). Un filtre par sous-chaîne les
// perdrait à tort — piège déjà rencontré lors du backfill des signaux.

const PLACEHOLDER_TEXTS: ReadonlySet<string> = new Set([
  "non trouve",
  "non renseigne",
  "non communique",
  "non disponible",
  "inconnu",
  "n/a",
  "na",
  "nc",
  "-",
  "--",
])

/** Normalise pour comparaison : minuscules, sans accents, espaces compactés. */
export function normalizeForPlaceholderCheck(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** `true` si la valeur ENTIÈRE est un marqueur d'absence, pas du contenu. */
export function isPlaceholderText(value: string): boolean {
  const normalized = normalizeForPlaceholderCheck(value)
  if (normalized.length === 0) return true
  return PLACEHOLDER_TEXTS.has(normalized)
}

// ─── Helpers de couverture ──────────────────────────────────────────────────

/**
 * Construit un QualitySummary à partir des claims réellement exposés.
 * Volontairement séparé de la validation : la validation dit si l'artefact est
 * recevable, celui-ci dit à quel point il est étayé.
 *
 * `passed` exige zéro claim non sourcé ET zéro contradiction. Une source
 * périmée (`stale`) n'invalide pas l'artefact — elle se signale sans bloquer,
 * sinon toute veille un peu ancienne échouerait le contrôle.
 */
export function buildQualitySummary(input: {
  claims: ReadonlyArray<{ claim: Claim; path: string }>
  stalePaths?: string[]
  contradictionPaths?: string[]
}): QualitySummary {
  const missingSourcePaths = input.claims
    .filter(({ claim }) => claim.source_refs.length === 0)
    .map(({ path }) => path)

  const displayedClaims = input.claims.length
  const sourcedClaims = displayedClaims - missingSourcePaths.length
  const contradictionPaths = input.contradictionPaths ?? []

  return {
    displayed_claims: displayedClaims,
    sourced_claims: sourcedClaims,
    // Un artefact vide est « couvert » par convention (0/0) : le signaler à 0
    // laisserait croire à un défaut de sourcing alors qu'il n'y a rien à sourcer.
    coverage_rate: displayedClaims === 0 ? 1 : sourcedClaims / displayedClaims,
    missing_source_paths: missingSourcePaths,
    stale_source_paths: input.stalePaths ?? [],
    contradiction_paths: contradictionPaths,
    passed: missingSourcePaths.length === 0 && contradictionPaths.length === 0,
  }
}
