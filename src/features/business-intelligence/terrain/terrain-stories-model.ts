import { parseMarketThesis, parseMessageSectoriel } from "../home/home-model"

export type TerrainStoryMessage = {
  kind: "message"
  id: string
  title: string
  text: string
  srcIds: []
}

export type TerrainStoryThesis = {
  kind: "thesis"
  id: string
  title: string
  thesis: string
  commercialConclusion: string | null
  srcIds: number[]
}

export type TerrainStory = TerrainStoryMessage | TerrainStoryThesis

const COMMERCIAL_LABEL_PATTERN = /^\s*donc,?\s*commercialement\s*:?\s*/i

/**
 * Nettoie le préfixe "DONC, commercialement :" éventuellement présent dans les textes du Playbook
 * afin d'éviter les redondances avec le badge d'en-tête visuel.
 */
export function stripCommercialLabel(text: string): string {
  return text.replace(COMMERCIAL_LABEL_PATTERN, "").trim()
}

/**
 * Formate une liste d'identifiants de sources en mention passive compacte.
 * Exemple: [7, 13, 17] -> "Sources : S7 · S13 · S17"
 */
export function formatStorySourceIds(srcIds: number[]): string | null {
  if (!srcIds || srcIds.length === 0) return null
  return `Sources : ${srcIds.map((id) => `S${id}`).join(" · ")}`
}

/**
 * Construit la liste séquentielle déterministe des Stories Terrain:
 * 01 — Message sectoriel (si présent, sans sources)
 * 02+ — Thèses marché (dans l'ordre source exact, avec conclusion commerciale et sources passives)
 *
 * Fonction pure, déterministe, sans effet de bord ni dépendance navigateur.
 */
export function buildTerrainStories(
  playbook: Record<string, unknown> | null | undefined,
): TerrainStory[] {
  if (!playbook || typeof playbook !== "object") return []

  const message = parseMessageSectoriel(playbook)
  const theses = parseMarketThesis(playbook)

  const stories: TerrainStory[] = []

  if (message) {
    stories.push({
      kind: "message",
      id: "story-message",
      title: "Message sectoriel",
      text: message,
      srcIds: [],
    })
  }

  theses.forEach((item, index) => {
    stories.push({
      kind: "thesis",
      id: `story-thesis-${item.id ?? index + 1}`,
      title: `Thèse ${index + 1}`,
      thesis: item.these,
      commercialConclusion: item.doncCommercialement && item.doncCommercialement.trim().length > 0
        ? item.doncCommercialement.trim()
        : null,
      srcIds: item.srcIds,
    })
  })

  return stories
}
