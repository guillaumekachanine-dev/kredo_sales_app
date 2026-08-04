// ─── Indicateur « Dynamique du compte » — méthode account-dynamic-v1 ────────
// Lot 1. Cet indicateur est DÉTERMINISTE et calculé HORS LLM : le workflow n8n
// émet `identity.dynamic: null`, et c'est le callback applicatif qui l'injecte
// à partir de cette méthode. Aucune sortie de modèle n'est acceptée à cet
// emplacement (cf. account-knowledge-ingest.ts + validateur du workflow).
//
// Pourquoi ici et pas dans un nœud n8n : la méthode doit être unique, versionnée
// et testée. La dupliquer en JS dans le workflow ferait diverger les deux copies
// à la première évolution — piège déjà rencontré sur d'autres calculs du projet.
//
// ─── Ce que l'indicateur mesure, et ce qu'il ne mesure PAS ──────────────────
// Il mesure une INTENSITÉ D'ACTIVITÉ DÉTECTÉE ET SOURCÉE sur une fenêtre datée :
// combien de signaux réellement adossés à une source externe (`intelligence_sources`)
// ont été captés sur le compte, et à quel point ils sont jugés pertinents/urgents.
//
// Il ne mesure NI la croissance économique du compte (aucun agrégat financier
// n'entre dans le calcul), NI un sentiment (aucun signal n'est classé
// positif/négatif ici). Un compte en plan social produit typiquement BEAUCOUP de
// signaux sourcés : la méthode le lira comme « forte activité détectée », ce qui
// est exact, et surtout pas comme une bonne nouvelle. Les libellés sont rédigés
// pour rendre cette confusion impossible à l'affichage.

import type { DeterministicIndicator } from "./intelligence-common-contracts"

export const ACCOUNT_DYNAMIC_METHOD_VERSION = "account-dynamic-v1"

/** Fenêtre d'observation par défaut, en jours. */
export const ACCOUNT_DYNAMIC_WINDOW_DAYS = 180

/**
 * Nombre de signaux sourcés sur la fenêtre à partir duquel la composante
 * « densité » est saturée. 8 sur 180 jours ≈ un signal capté toutes les 3
 * semaines : au-delà, ce n'est plus la quantité qui discrimine mais l'intensité.
 */
const DENSITY_SATURATION = 8

/** Forme minimale attendue d'un signal — sous-ensemble de `account_signals`. */
export type AccountDynamicSignalInput = {
  /** `null` = signal non sourcé (typiquement backfill FOLIO) → jamais compté. */
  primary_source_id: string | null
  detected_at: string | null
  relevance_score: number | null
  urgency_score: number | null
  confidence_score: number | null
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Les scores d'`account_signals` sont des numeric(4,3) bornés 0..1 côté schéma,
 * mais PostgREST les renvoie parfois en chaîne. On normalise sans jamais
 * inventer de valeur : une valeur absente vaut 0 pour relevance/urgency
 * (« pas de signal d'intensité »), et 1 pour confidence (ne pas pénaliser un
 * signal dont la confiance n'a simplement pas été renseignée).
 */
function toScore(value: number | null, fallback: number): number {
  if (value === null || value === undefined) return fallback
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? clamp01(numeric) : fallback
}

/**
 * Libellé de bande. Toujours formulé en « activité détectée » — jamais en
 * croissance, ni en tendance favorable/défavorable (cf. en-tête de fichier).
 */
export function accountDynamicLabel(score: number | null): string {
  if (score === null) return "Dynamique non mesurable (aucun signal sourcé)"
  if (score < 25) return "Activité détectée faible"
  if (score < 55) return "Activité détectée modérée"
  if (score < 80) return "Activité détectée soutenue"
  return "Activité détectée forte"
}

/**
 * Calcule l'indicateur sur la fenêtre `[now - windowDays, now]`.
 *
 * Retourne toujours un indicateur (jamais `null`) : l'absence de matière est une
 * information, elle s'exprime par `score: null` + `evidence_count: 0`, pas par un
 * 0 trompeur ni par une section vide. C'est la même doctrine que le scoring
 * ADR-0011 (bande « U » quand la confiance est trop faible).
 */
export function computeAccountDynamic(
  signals: readonly AccountDynamicSignalInput[],
  options: { now?: Date; windowDays?: number } = {},
): DeterministicIndicator {
  const now = options.now ?? new Date()
  const windowDays = options.windowDays ?? ACCOUNT_DYNAMIC_WINDOW_DAYS
  const periodEnd = now
  const periodStart = new Date(now.getTime() - windowDays * 86_400_000)

  const evidence = signals.filter((signal) => {
    // Non sourcé → hors périmètre par construction : l'indicateur ne s'appuie
    // que sur des signaux adossés à une source vérifiable.
    if (!signal.primary_source_id) return false
    if (!signal.detected_at) return false
    const detectedAt = new Date(signal.detected_at)
    if (Number.isNaN(detectedAt.getTime())) return false
    return detectedAt >= periodStart && detectedAt <= periodEnd
  })

  const sourceRefs = Array.from(
    new Set(evidence.map((signal) => signal.primary_source_id as string)),
  )

  if (evidence.length === 0) {
    return {
      label: accountDynamicLabel(null),
      score: null,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      evidence_count: 0,
      method_version: ACCOUNT_DYNAMIC_METHOD_VERSION,
      source_refs: [],
    }
  }

  // Intensité moyenne : pertinence (60 %) et urgence (40 %), pondérées par la
  // confiance accordée au signal. Un signal peu fiable pèse moins sans être exclu.
  const intensitySum = evidence.reduce((sum, signal) => {
    const relevance = toScore(signal.relevance_score, 0)
    const urgency = toScore(signal.urgency_score, 0)
    const confidence = toScore(signal.confidence_score, 1)
    return sum + confidence * (0.6 * relevance + 0.4 * urgency)
  }, 0)
  const intensity = clamp01(intensitySum / evidence.length)

  const density = clamp01(evidence.length / DENSITY_SATURATION)

  const score = Math.round(100 * (0.5 * density + 0.5 * intensity))

  return {
    label: accountDynamicLabel(score),
    score,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    evidence_count: evidence.length,
    method_version: ACCOUNT_DYNAMIC_METHOD_VERSION,
    source_refs: sourceRefs,
  }
}
