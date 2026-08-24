/**
 * Validateur de la sortie d'une mission d'intelligence — ADR-0020 L3 / M-2.
 *
 * C'est la SEULE barrière entre le texte produit par le LLM et `ai_intelligence_results`.
 * Elle s'exécute sur du `unknown` : le workflow `mission-001-run` ne parse jamais la
 * sortie du modèle, il la poste telle quelle dans `contentJson.rawOutput` (une CHAÎNE).
 *
 * Trois invariants, dans cet ordre :
 *   1. `JSON.parse` STRICT — aucune heuristique de récupération (pas de retrait de balises
 *      Markdown, pas de troncature au dernier `}` équilibré). Une sortie malformée fait
 *      échouer le run ; l'utilisateur relance (M-2 : n8n ne rejoue plus automatiquement).
 *      Réparer ici validerait précisément ce que le contrat refuse.
 *   2. Structure conforme à `MissionReportV1` — énumérations closes, chaînes non vides.
 *   3. Chaque citation renvoie à une entrée `kept: true` de la trace du corpus
 *      (`ai_intelligence_runs.input_snapshot.trace`, écrite par L1). Une citation
 *      introuvable REJETTE LE RAPPORT ENTIER : elle n'est jamais élaguée en silence, parce
 *      qu'un rapport qui s'adosse à une source absente du corpus a le même défaut de
 *      confiance qu'un rapport qui invente un chiffre.
 *
 * `title` et `provenance` des citations sont RECONSTRUITS depuis la trace : seul le
 * triplet `ref.kind`/`ref.table`/`ref.id` sert de clé. Ce que le modèle a écrit dans ces
 * deux champs n'est jamais retenu — il pourrait renommer une source pour la faire dire
 * autre chose. Même raison pour la reconstruction champ par champ du rapport complet :
 * aucune clé non validée n'atteint `content_json`.
 *
 * Module PUR : aucune I/O, aucun client Supabase, aucun `server-only` à porter. Les deux
 * imports sont des `import type`, effacés à la compilation.
 */

import type { ValidationIssue, ValidationResult } from "@/lib/intelligence/intelligence-validators"
import type {
  CorpusItem,
  CorpusKind,
  Finding,
  MissionReportV1,
  Recommendation,
  SourceRef,
} from "./mission-contracts"

/**
 * `Record` exhaustif plutôt qu'un simple tableau : ajouter une catégorie au contrat sans
 * l'ajouter ici casse le `typecheck`, au lieu de la faire rejeter en silence à l'exécution.
 */
const FINDING_CATEGORIES = {
  tendance: true,
  signal_faible: true,
  reglementaire: true,
  opportunite: true,
  risque: true,
  autre: true,
} satisfies Record<Finding["category"], true>

const RECOMMENDATION_HORIZONS = {
  immediate: true,
  "30_days": true,
  quarter: true,
} satisfies Record<NonNullable<Recommendation["horizon"]>, true>

/**
 * Même doctrine pour les `CorpusKind` : la trace est écrite par du code typé (L1), donc
 * ce contrôle ne peut refuser aucune source légitime ; il garantit en revanche qu'un
 * `kind` inconnu, arrivé d'un `input_snapshot` d'une autre forme, n'atteint jamais
 * `content_json` sous les traits d'un `CorpusItem["ref"]`.
 */
const CORPUS_KINDS = {
  veille_period: true,
  intelligence_document: true,
  account_context: true,
  delivery_period: true,
  prospection_window: true,
} satisfies Record<CorpusKind, true>

// `Set` construit depuis les clés : `has()` ne consulte pas la chaîne de prototypes,
// là où `"toString" in FINDING_CATEGORIES` répondrait `true`.
const FINDING_CATEGORY_KEYS: ReadonlySet<string> = new Set(Object.keys(FINDING_CATEGORIES))
const RECOMMENDATION_HORIZON_KEYS: ReadonlySet<string> = new Set(Object.keys(RECOMMENDATION_HORIZONS))
const CORPUS_KIND_KEYS: ReadonlySet<string> = new Set(Object.keys(CORPUS_KINDS))

type TraceEntry = {
  ref: CorpusItem["ref"]
  title: string
  provenance: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function isFindingCategory(value: unknown): value is Finding["category"] {
  return typeof value === "string" && FINDING_CATEGORY_KEYS.has(value)
}

function isHorizon(value: unknown): value is NonNullable<Recommendation["horizon"]> {
  return typeof value === "string" && RECOMMENDATION_HORIZON_KEYS.has(value)
}

/** Clé de correspondance d'une citation — le triplet, et rien d'autre. */
function refKey(ref: { kind: string; table: string; id: string }): string {
  return `${ref.kind}:${ref.table}:${ref.id}`
}

function readRefTriplet(raw: unknown): { kind: string; table: string; id: string } | null {
  if (!isRecord(raw)) return null
  const { kind, table, id } = raw
  if (typeof kind !== "string" || typeof table !== "string" || typeof id !== "string") return null
  if (!kind || !table || !id) return null
  return { kind, table, id }
}

/**
 * `ai_intelligence_runs.input_snapshot` est du `Json` libre : la trace en est extraite
 * défensivement, jamais supposée présente. Un run non-mission, un snapshot d'une autre
 * forme ou une colonne `null` rendent `null` — le validateur traite alors la trace comme
 * vide, et TOUTE citation échoue (§8.4 point 8).
 */
export function readCorpusTrace(inputSnapshot: unknown): unknown {
  if (!isRecord(inputSnapshot)) return null
  return inputSnapshot.trace
}

/**
 * Index des sources réellement soumises au modèle.
 *
 * `kept` porte les citations légitimes ; `dropped` sert uniquement à produire un message
 * exploitable quand le modèle cite un élément que le budget avait écarté — les deux cas
 * invalident le rapport, mais l'utilisateur qui relance mérite de savoir lequel.
 */
function indexTrace(trace: unknown): {
  available: boolean
  kept: Map<string, TraceEntry>
  dropped: Map<string, string | null>
} {
  const kept = new Map<string, TraceEntry>()
  const dropped = new Map<string, string | null>()

  if (!Array.isArray(trace)) return { available: false, kept, dropped }

  for (const entry of trace) {
    if (!isRecord(entry)) continue
    const ref = readRefTriplet(entry.ref)
    if (!ref) continue
    const key = refKey(ref)
    if (entry.kept === true) {
      if (!CORPUS_KIND_KEYS.has(ref.kind)) continue
      kept.set(key, {
        ref: { kind: ref.kind as CorpusKind, table: ref.table, id: ref.id },
        title: typeof entry.title === "string" ? entry.title : "",
        provenance: typeof entry.provenance === "string" ? entry.provenance : "",
      })
    } else if (!kept.has(key)) {
      dropped.set(key, typeof entry.reason === "string" ? entry.reason : null)
    }
  }

  return { available: true, kept, dropped }
}

/**
 * Valide une citation et la RECONSTRUIT depuis la trace.
 *
 * Rend `null` en cas d'échec après avoir poussé le détail dans `issues` : l'appelant
 * continue son parcours pour rapporter TOUTES les citations fautives d'un coup, plutôt
 * que la première seulement.
 */
function resolveSourceRef(
  raw: unknown,
  path: string,
  index: ReturnType<typeof indexTrace>,
  issues: ValidationIssue[],
): SourceRef | null {
  if (!isRecord(raw)) {
    issues.push({ path, message: "Citation attendue : objet { ref, title, provenance }." })
    return null
  }

  const ref = readRefTriplet(raw.ref)
  if (!ref) {
    issues.push({
      path: `${path}.ref`,
      message: "Référence incomplète : kind, table et id sont requis (chaînes non vides).",
    })
    return null
  }

  const key = refKey(ref)

  if (!index.available) {
    issues.push({
      path: `${path}.ref`,
      message: `Trace de corpus indisponible pour ce run : la citation ${key} ne peut pas être vérifiée.`,
    })
    return null
  }

  const entry = index.kept.get(key)
  if (!entry) {
    const reason = index.dropped.get(key)
    issues.push({
      path: `${path}.ref`,
      message: index.dropped.has(key)
        ? `Référence ${key} écartée du corpus soumis au modèle${reason ? ` (raison : ${reason})` : ""} : citation impossible.`
        : `Référence ${key} absente du corpus du run : citation non vérifiable.`,
    })
    return null
  }

  // Reconstruction intégrale : `title` et `provenance` viennent de la trace, jamais du
  // JSON du modèle, et `ref` est recopié depuis la trace pour n'emporter que le triplet.
  return { ref: entry.ref, title: entry.title, provenance: entry.provenance }
}

function resolveEvidence(
  raw: unknown,
  path: string,
  index: ReturnType<typeof indexTrace>,
  issues: ValidationIssue[],
): SourceRef[] {
  if (!Array.isArray(raw)) {
    issues.push({ path, message: "Tableau de citations requis (éventuellement vide)." })
    return []
  }

  const resolved: SourceRef[] = []
  raw.forEach((item, itemIndex) => {
    const sourceRef = resolveSourceRef(item, `${path}[${itemIndex}]`, index, issues)
    if (sourceRef) resolved.push(sourceRef)
  })
  return resolved
}

function validateFinding(
  raw: unknown,
  path: string,
  index: ReturnType<typeof indexTrace>,
  issues: ValidationIssue[],
): Finding | null {
  if (!isRecord(raw)) {
    issues.push({ path, message: "Constat attendu : objet requis." })
    return null
  }

  const before = issues.length

  const category = isFindingCategory(raw.category) ? raw.category : null
  if (!category) {
    issues.push({
      path: `${path}.category`,
      message: `Catégorie hors énumération : attendu ${[...FINDING_CATEGORY_KEYS].join(" | ")}.`,
    })
  }

  const statement = nonEmptyString(raw.statement)
  if (!statement) {
    issues.push({ path: `${path}.statement`, message: "Énoncé requis et non vide." })
  }

  // `evidence: []` est ACCEPTÉ, contrairement à la doctrine `account_knowledge` (« un fait
  // sans source est refusé »). Deux raisons, assumées : un rapport de mission est un
  // livrable lu par un humain et n'écrit rien dans le CRM — l'invariant qui compte est
  // « aucune citation invérifiable », pas « aucun énoncé non cité » ; et refuser le
  // rapport ENTIER pour un constat de synthèse non rattaché à une source unique ferait
  // échouer le pilote L5 sur une sortie légitime. Un tableau est en revanche exigé.
  const evidence = resolveEvidence(raw.evidence, `${path}.evidence`, index, issues)

  if (issues.length > before || !category || !statement) return null
  return { category, statement, evidence }
}

function validateRecommendation(
  raw: unknown,
  path: string,
  index: ReturnType<typeof indexTrace>,
  issues: ValidationIssue[],
): Recommendation | null {
  if (!isRecord(raw)) {
    issues.push({ path, message: "Recommandation attendue : objet requis." })
    return null
  }

  const before = issues.length

  const action = nonEmptyString(raw.action)
  if (!action) issues.push({ path: `${path}.action`, message: "Action requise et non vide." })

  const rationale = nonEmptyString(raw.rationale)
  if (!rationale) issues.push({ path: `${path}.rationale`, message: "Justification requise et non vide." })

  // `horizon` absent, `undefined` ou `null` valent tous « pas d'horizon » : `null` est
  // l'idiome JSON de l'absence, il ne prête à aucune interprétation et rien d'invalide
  // n'est persisté (la clé est alors omise). Toute AUTRE valeur est refusée telle quelle —
  // aucun rapprochement approximatif vers l'une des trois valeurs de l'union.
  const hasHorizon = raw.horizon !== undefined && raw.horizon !== null
  const horizon = isHorizon(raw.horizon) ? raw.horizon : null
  if (hasHorizon && !horizon) {
    issues.push({
      path: `${path}.horizon`,
      message: `Horizon hors énumération : attendu ${[...RECOMMENDATION_HORIZON_KEYS].join(" | ")}.`,
    })
  }

  const evidence = resolveEvidence(raw.evidence, `${path}.evidence`, index, issues)

  if (issues.length > before || !action || !rationale) return null
  return {
    action,
    rationale,
    ...(horizon ? { horizon } : {}),
    evidence,
  }
}

/**
 * Point d'entrée unique, appelé par `api/n8n/callback` pour tout run dont
 * `run_type` commence par `mission:`.
 *
 * @param rawOutput `contentJson.rawOutput` TEL QUEL — le texte brut du modèle, non parsé.
 * @param trace     `input_snapshot.trace` (cf. `readCorpusTrace`) — peut être absente ou
 *                  malformée sans jamais lever d'exception.
 */
export function validateMissionReport(
  rawOutput: string,
  trace: unknown,
): ValidationResult<MissionReportV1> {
  // ── 1. Parse strict ───────────────────────────────────────────────────────
  if (typeof rawOutput !== "string" || rawOutput.trim().length === 0) {
    return {
      valid: false,
      value: null,
      issues: [{ path: "$", message: "Sortie LLM absente : contentJson.rawOutput doit être une chaîne non vide." }],
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawOutput)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      valid: false,
      value: null,
      issues: [{ path: "$", message: `Sortie LLM non-JSON : ${detail}` }],
    }
  }

  if (!isRecord(parsed)) {
    return {
      valid: false,
      value: null,
      issues: [{ path: "$", message: "Sortie LLM invalide : objet JSON attendu à la racine." }],
    }
  }

  // ── 2. Structure ──────────────────────────────────────────────────────────
  const issues: ValidationIssue[] = []

  if (parsed.schemaVersion !== 1) {
    issues.push({ path: "$.schemaVersion", message: "Version de schéma attendue : 1 (littéral)." })
  }

  const title = nonEmptyString(parsed.title)
  if (!title) issues.push({ path: "$.title", message: "Titre requis et non vide." })

  const executiveSummary = nonEmptyString(parsed.executiveSummary)
  if (!executiveSummary) {
    issues.push({ path: "$.executiveSummary", message: "Synthèse requise et non vide." })
  }

  // ── 3. Citations : index de la trace construit UNE fois ───────────────────
  const index = indexTrace(trace)

  const findings: Finding[] = []
  if (!Array.isArray(parsed.findings)) {
    issues.push({ path: "$.findings", message: "Tableau de constats requis." })
  } else if (parsed.findings.length === 0) {
    issues.push({ path: "$.findings", message: "Au moins un constat requis : un rapport vide n'est pas un rapport." })
  } else {
    parsed.findings.forEach((raw, findingIndex) => {
      const finding = validateFinding(raw, `$.findings[${findingIndex}]`, index, issues)
      if (finding) findings.push(finding)
    })
  }

  const recommendations: Recommendation[] = []
  if (!Array.isArray(parsed.recommendations)) {
    issues.push({ path: "$.recommendations", message: "Tableau de recommandations requis (éventuellement vide)." })
  } else {
    parsed.recommendations.forEach((raw, recommendationIndex) => {
      const recommendation = validateRecommendation(
        raw,
        `$.recommendations[${recommendationIndex}]`,
        index,
        issues,
      )
      if (recommendation) recommendations.push(recommendation)
    })
  }

  const sourceRefs: SourceRef[] = []
  if (!Array.isArray(parsed.sourceRefs)) {
    issues.push({ path: "$.sourceRefs", message: "Tableau de sources requis (éventuellement vide)." })
  } else {
    parsed.sourceRefs.forEach((raw, sourceIndex) => {
      const sourceRef = resolveSourceRef(raw, `$.sourceRefs[${sourceIndex}]`, index, issues)
      if (sourceRef) sourceRefs.push(sourceRef)
    })
  }

  // Les deux tests de nullité sont redondants avec `issues` (un titre absent y a déjà
  // poussé son entrée) : ils ne servent qu'à narrower les types sans `as`.
  if (issues.length > 0 || title === null || executiveSummary === null) {
    return { valid: false, value: null, issues }
  }

  // Reconstruction explicite : `content_json` ne porte que le contrat, jamais une clé
  // supplémentaire arrivée du modèle.
  return {
    valid: true,
    issues: [],
    value: {
      schemaVersion: 1,
      title,
      executiveSummary,
      findings,
      recommendations,
      sourceRefs,
    },
  }
}
