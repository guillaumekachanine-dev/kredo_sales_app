import type { ResolvedSource } from "../shared/SourceChip"

export type TerrainResolvedSource = {
  sourceId: number
  publisher: string | null
  tier: string | null
  attests: string | null
  consultedAt: string | null
  url: string | null
  isResolved: boolean
}

/**
 * Formate proprement une date de consultation au format français ("22 août 2026").
 * Si la date est nulle, vide ou invalide, retourne le fallback explicite M0 : "Date de consultation non disponible".
 */
export function formatConsultedAt(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return "Date de consultation non disponible"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Date de consultation non disponible"
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Résout une source unique contre le dictionnaire sourceResolution du workspace.
 * Ne crée aucun champ redondant, n'invente aucune donnée.
 *
 * Si le srcId n'est pas trouvé dans sourceResolution, retourne une structure non résolue
 * conservant l'ID source canonique.
 */
export function resolveTerrainSource(
  sourceId: number,
  sourceResolution: Record<number, ResolvedSource> | null | undefined,
): TerrainResolvedSource {
  const resolved = sourceResolution?.[sourceId]
  if (!resolved) {
    return {
      sourceId,
      publisher: null,
      tier: null,
      attests: null,
      consultedAt: null,
      url: null,
      isResolved: false,
    }
  }

  const publisher =
    typeof resolved.publisher === "string" && resolved.publisher.trim().length > 0
      ? resolved.publisher.trim()
      : null

  const tier =
    resolved.tier !== null && resolved.tier !== undefined
      ? `Tier T${resolved.tier}`
      : null

  const attests =
    typeof resolved.attests === "string" && resolved.attests.trim().length > 0
      ? resolved.attests.trim()
      : null

  const consultedAt =
    typeof resolved.consultedAt === "string" && resolved.consultedAt.trim().length > 0
      ? resolved.consultedAt.trim()
      : null

  const url =
    typeof resolved.url === "string" && resolved.url.trim().length > 0
      ? resolved.url.trim()
      : null

  return {
    sourceId,
    publisher,
    tier,
    attests,
    consultedAt,
    url,
    isResolved: true,
  }
}

/**
 * Résout une liste d'identifiants de sources en préservant strictement l'ordre d'entrée.
 * Fonction pure, déterministe, non mutante.
 */
export function resolveTerrainSources(
  sourceIds: number[],
  sourceResolution: Record<number, ResolvedSource> | null | undefined,
): TerrainResolvedSource[] {
  if (!Array.isArray(sourceIds)) return []
  return sourceIds.map((id) => resolveTerrainSource(id, sourceResolution))
}
