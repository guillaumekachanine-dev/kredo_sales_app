import { parsePlaybookObjections } from "../models/sector-playbook-parser"

export type TerrainRevisionCard = {
  id: string
  objection: string
  response: string | null
}

/**
 * Construit la séquence des cartes de révision d'objections pour le Mode Terrain:
 * - Réutilise le parser métier unique `parsePlaybookObjections`
 * - Conserve strictement l'ordre du Playbook
 * - Produit un modèle léger avec identifiant déterministe
 *
 * Fonction pure, déterministe, sans effet de bord ni dépendance navigateur.
 */
export function buildTerrainRevisionCards(
  playbook: unknown,
): TerrainRevisionCard[] {
  if (!playbook || typeof playbook !== "object") return []

  const objections = parsePlaybookObjections(playbook)

  return objections.map((item, index) => ({
    id: `revision-card-${index + 1}`,
    objection: item.objection,
    response: item.response,
  }))
}
