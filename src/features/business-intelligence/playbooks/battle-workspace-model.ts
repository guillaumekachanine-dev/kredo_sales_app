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

/**
 * Identité visuelle du mode Battle (Lot 2) — « je suis passé du référentiel à
 * l'espace opérationnel ». Le fond de base (`PLAYBOOK_*_SURFACE`) reste
 * strictement identique à celui du Playbook : on pose PAR-DESSUS, en
 * `background-image`, un dégradé diagonal presque imperceptible construit
 * EXCLUSIVEMENT depuis les tokens cobalt du cockpit (`--color-cockpit-cobalt`
 * / `--color-cockpit-cobalt-deep`, déclarés dans `@theme`, donc globalement
 * disponibles — pas besoin de `[data-theme="cockpit"]`). Ce sont les mêmes
 * tokens que le reste de l'app utilise déjà pour signaler un module
 * « intelligence / opérationnel » (`IntelligenceFAB`, en-têtes cockpit des
 * vues compte) : réutiliser ce langage plutôt qu'en inventer un nouveau.
 *
 * Aucun HEX/RGB en dur ici — uniquement `var(--color-cockpit-cobalt*)` mixé à
 * `transparent` via `color-mix(in srgb, …)`, le même mécanisme que celui déjà
 * utilisé dans `globals.css` pour toutes les teintes translucides du repo.
 * Zéro ombre, zéro effet glossy : un unique dégradé mat en diagonale.
 */
export const BATTLE_SIDE_TINT_IMAGE =
  "linear-gradient(165deg, color-mix(in srgb, var(--color-cockpit-cobalt) 22%, transparent) 0%, transparent 65%)"

export const BATTLE_MAIN_TINT_IMAGE =
  "linear-gradient(135deg, color-mix(in srgb, var(--color-cockpit-cobalt) 16%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--color-cockpit-cobalt-deep) 14%, transparent) 100%)"

/**
 * Nombre d'« axes » comptant pour la richesse d'une Battle Card. `trous`
 * (points à qualifier) en est volontairement exclu : lister des inconnues
 * n'est pas une donnée exploitable, c'est un constat de lacune — le compter
 * comme un axe rempli récompenserait un profil vide qui a juste un `trous`
 * renseigné.
 */
export const BATTLE_CARD_RICHNESS_AXES = 6

export type BattleCardRichness = "empty" | "sparse" | "rich"

/**
 * Classe une Battle Card selon sa matière réelle, jamais selon une supposition.
 *
 * - `empty`  : aucun des 6 axes n'est renseigné ET aucune inconnue n'est
 *              identifiée. Cas mesuré en base (Lot 0 §10.4) :
 *              `profile_json = '{}'` (5 entrées sur 23, segment « Hébergement
 *              & résidences de tourisme »). Le commercial doit voir un message
 *              net : cette fiche n'est pas encore enrichie.
 * - `sparse` : aucun des 6 axes n'est renseigné, mais des inconnues (`trous`)
 *              ont été identifiées — il reste au moins un fil à tirer, mais
 *              rien à réciter avant l'appel.
 * - `rich`   : au moins un axe est renseigné. Les sections vides restent
 *              masquées individuellement ; si moins de 6 axes sur 6 sont
 *              couverts, l'appelant peut afficher un repère quantitatif
 *              honnête plutôt que de laisser deviner ce qui manque.
 */
export function classifyBattleCardRichness(filledAxisCount: number, hasKnownGaps: boolean): BattleCardRichness {
  if (filledAxisCount > 0) return "rich"
  return hasKnownGaps ? "sparse" : "empty"
}

export type BattleCardAssessment = {
  richness: BattleCardRichness
  filledAxisCount: number
  totalAxisCount: typeof BATTLE_CARD_RICHNESS_AXES
  hasKnownGaps: boolean
}

/**
 * Évalue la matière réelle d'un acteur cartographié. Les 6 axes reflètent
 * EXACTEMENT les 6 sections de Révision (cadrage §2) — jamais un décompte
 * inventé indépendamment de ce qui est affiché.
 */
export function assessBattleCardRichness(actor: CompetitiveMapActor): BattleCardAssessment {
  const { details } = actor
  const axes = [
    details.triggers.length > 0,
    Boolean(actor.angleEntree) || details.traductionCommerciale.length > 0,
    details.coucheEsn.length > 0,
    details.lignesRouges.length > 0,
    details.chantiersTechnologiques.length > 0 || Boolean(details.iaAnnonceVsDeploye),
    Boolean(actor.forces) || Boolean(actor.vulnerability),
  ]
  const filledAxisCount = axes.filter(Boolean).length
  const hasKnownGaps = details.trous.length > 0

  return {
    richness: classifyBattleCardRichness(filledAxisCount, hasKnownGaps),
    filledAxisCount,
    totalAxisCount: BATTLE_CARD_RICHNESS_AXES,
    hasKnownGaps,
  }
}

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
