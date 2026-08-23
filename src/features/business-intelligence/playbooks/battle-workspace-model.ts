import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

// ─── Dynamic Playbooks · Lot 1 — socle du mode Battle ───────────────────────
// Module volontairement SANS JSX ni accès au DOM : c'est la seule partie du lot
// que `vitest` peut exercer (`include: ["src/**/*.test.ts"]`, aucun jsdom).
// Tout ce qui touche `window` (matchMedia, rAF, timers) reste dans le composant.

/** Mode affiché par la modale Playbook. Aucun store global, aucun provider. */
export type PlaybookMode = "playbook" | "battle"

/** Onglet interne du Battle Workspace. `situation` est livré par A2 au Lot 3. */
export type BattleTab = "revision" | "situation"

/** Étapes du retournement : sortie → échange du contenu → entrée. */
export type FlipPhase = "idle" | "leaving" | "entering"

/** `forward` = Playbook → Battle. `backward` = retour. */
export type FlipDirection = "forward" | "backward"

/**
 * Demi-durée du retournement. 2 × 160 = 320 ms, dans la cible 280–340 ms fixée
 * par la note de cadrage §11. Le contenu est échangé au point médian : les deux
 * arbres ne sont jamais montés en même temps.
 */
export const BATTLE_FLIP_HALF_MS = 160

/**
 * Demi-durée du repli `prefers-reduced-motion` : fondu simple, aucune rotation
 * (cadrage §11). Même machine à états, `flipRotation` renvoie 0.
 */
export const BATTLE_FLIP_REDUCED_HALF_MS = 90

/**
 * Sections de navigation du Playbook. `battle_cards` en est volontairement
 * ABSENT depuis le Lot 1 : Battle Cards n'est plus une section du rail mais un
 * mode à part entière, atteint par une action d'entrée dédiée.
 */
export const PLAYBOOK_SECTION_KEYS = [
  "enjeux",
  "personas",
  "angles",
  "objections",
  "roi",
  "pourquoi_maintenant",
] as const

export type SectorPlaybookSectionKey = (typeof PLAYBOOK_SECTION_KEYS)[number]

/**
 * Fonds hérités de la modale Playbook. Ils n'ont pas de token `@theme` — dette
 * pré-existante à ce lot, hors périmètre. Centralisés ici pour que le mode
 * Battle n'introduise AUCUNE nouvelle couleur et que le retournement ne montre
 * aucun saut de teinte entre les deux faces.
 */
export const PLAYBOOK_SIDE_SURFACE = "bg-[#0d0f28]"
export const PLAYBOOK_MAIN_SURFACE = "bg-[#0a0b1e]"

/** Le mode Battle n'est proposé que s'il y a au moins un acteur cartographié. */
export function isBattleModeAvailable(actors: CompetitiveMapActor[]): boolean {
  return actors.length > 0
}

/**
 * Résout l'acteur affiché. L'identifiant sélectionné vit AU-DESSUS du
 * retournement (dans la modale) : le compte actif survit donc à un aller-retour
 * Playbook ↔ Battle. Repli sur le premier acteur si l'identifiant est absent ou
 * devenu invalide (changement de segment), jamais sur un autre segment.
 */
export function resolveBattleActor(
  actors: CompetitiveMapActor[],
  selectedActorId: string | null,
): CompetitiveMapActor | null {
  if (actors.length === 0) return null
  if (!selectedActorId) return actors[0]
  return actors.find((actor) => actor.id === selectedActorId) ?? actors[0]
}

/**
 * Rotation en degrés appliquée à la face en cours d'animation.
 * `leaving` s'éloigne, `entering` arrive du côté opposé, `idle` est à plat.
 */
export function flipRotation(phase: FlipPhase, direction: FlipDirection): number {
  if (phase === "idle") return 0
  const magnitude = direction === "forward" ? 90 : -90
  return phase === "leaving" ? magnitude : -magnitude
}

/** Le contenu n'est visible qu'à plat : les deux demi-temps sont transparents. */
export function flipOpacity(phase: FlipPhase): number {
  return phase === "idle" ? 1 : 0
}

/** Direction du retournement pour atteindre `target`. */
export function flipDirectionFor(target: PlaybookMode): FlipDirection {
  return target === "battle" ? "forward" : "backward"
}
