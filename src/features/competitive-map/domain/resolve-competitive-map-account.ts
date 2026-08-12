/**
 * ADR-0019 Lot 5 — classification pure du statut de résolution d'un compte de
 * cartographie contre les candidats renvoyés par la RPC SQL
 * `resolve_company_candidates` (migration 074).
 *
 * Le mécanisme `AccountScanResolution` référencé par l'ADR (`resolved` /
 * `ambiguous` / `not_found`) n'est qu'un CONTRAT : sa résolution réelle pour le
 * scan de compte passe par le workflow n8n intel-010-refresh, exclu pour ce
 * lot. Le contrat est réutilisé ici, la résolution est un nouveau moteur SQL
 * (voir `data/resolve-competitive-map-entries.ts`) — ce module ne fait que la
 * classification, pure et testable sans base.
 */

export const COMPETITIVE_MAP_RESOLUTION_STATUS_VALUES = ["resolved", "ambiguous", "not_found"] as const
export type CompetitiveMapResolutionStatus = (typeof COMPETITIVE_MAP_RESOLUTION_STATUS_VALUES)[number]

export type CompetitiveMapMatchMethod = "siren" | "exact_name" | "fuzzy_name"

export type CompetitiveMapCandidate = {
  companyId: string
  name: string
  siren: string | null
  matchMethod: CompetitiveMapMatchMethod
  matchScore: number
}

/** Score à partir duquel un candidat fuzzy isolé est jugé suffisamment sûr pour être `resolved` sans arbitrage. */
const RESOLVED_FUZZY_SCORE_THRESHOLD = 0.7
/** Écart minimal entre le meilleur et le second candidat pour trancher sans arbitrage quand aucun n'est un match exact. */
const RESOLVED_SCORE_GAP_THRESHOLD = 0.2

/**
 * 0 candidat -> `not_found`. Un match exact (siren ou nom normalisé identique)
 * -> `resolved`, sauf s'il y en a plusieurs (doublon improbable mais réel,
 * ex. deux fiches pour la même raison sociale) -> `ambiguous`. Sinon, un score
 * flou isolé et net -> `resolved` ; sinon `ambiguous`.
 */
export function classifyCompetitiveMapResolution(
  candidates: readonly CompetitiveMapCandidate[],
): CompetitiveMapResolutionStatus {
  if (candidates.length === 0) return "not_found"

  const sorted = [...candidates].sort((a, b) => b.matchScore - a.matchScore)
  const exactMatches = sorted.filter((c) => c.matchMethod === "siren" || c.matchMethod === "exact_name")

  if (exactMatches.length === 1) return "resolved"
  if (exactMatches.length > 1) return "ambiguous"

  const [best, second] = sorted
  if (best.matchScore >= RESOLVED_FUZZY_SCORE_THRESHOLD) {
    if (!second || best.matchScore - second.matchScore >= RESOLVED_SCORE_GAP_THRESHOLD) {
      return "resolved"
    }
  }

  return "ambiguous"
}
