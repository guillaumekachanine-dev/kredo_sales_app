// ─── Dynamic Playbooks · Lot 3 — résolveurs d'options de Situation ──────────
//
// Fonctions PURES et déterministes, séparées du JSX (roadmap §9.2) : c'est la
// seule partie du configurateur que `vitest` peut exercer (`include:
// ["src/**/*.test.ts"]`, aucun jsdom dans ce repo).
//
// Trois invariants portés ici, pas dans l'UI :
//   1. la provenance (`account` / `sector`) est calculée à la source, jamais
//      devinée à l'affichage — exigence R2 du cadrage ;
//   2. rien n'est inventé : une source vide produit une liste vide, jamais un
//      libellé générique de remplacement ;
//   3. une sélection qui n'existe plus dans les options disponibles est purgée
//      (`pruneDraftAgainstOptions`) — c'est ce qui rend le changement de compte
//      sûr sans effet de synchronisation.
//
// Les types d'entrée sont volontairement STRUCTURELS et minimaux : les vrais
// objets (`SectorKnowledgePainPointItem`, `SuggestedOffer`, lignes
// `account_issues`…) leur sont assignables tels quels, et les tests n'ont pas à
// fabriquer trente champs inutiles.

import {
  parsePlaybookEntryPoints,
  parsePlaybookObjections,
  parsePlaybookPersonas,
  parsePlaybookRoiArguments,
} from "../models/sector-playbook-parser"
import type {
  BattleSituation,
  BattleSituationChoice,
  BattleSituationSource,
} from "./battle-situation-contract"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"

// ─── Entrées ────────────────────────────────────────────────────────────────

/** Contact CRM du compte actif (`contacts` × `persons`). */
export type BattleSituationContact = {
  id: string
  fullName: string
  jobTitle: string | null
  relationshipRole: string | null
  isPriority?: boolean | null
}

/** Ligne `account_issues` du compte actif, statut `open`. */
export type BattleAccountIssue = {
  id: string
  title: string
  problemStatement: string | null
  evidenceLevel: string | null
  provenance: string | null
}

/** Sous-ensemble utile de `SectorKnowledgeReadModel.painPoints[]`. */
export type BattleSectorPainPoint = {
  id: string
  title: string
  description: string | null
  resolvedLevel: "segment" | "macro"
}

/** Sous-ensemble utile de `SectorKnowledgeReadModel.regulatory[]`. */
export type BattleSectorRegulatoryItem = {
  id: string
  name: string
  deadlineDate: string | null
  commercialAngle: string | null
  resolvedLevel: "segment" | "macro"
}

/** Sous-ensemble utile de `SectorKnowledgeReadModel.events[]`. */
export type BattleSectorEvent = {
  id: string
  title: string
  eventDate: string | null
  commercialOpportunity: string | null
  resolvedLevel: "segment" | "macro"
}

/** Sous-ensemble utile de `SuggestedOffer` (`getSuggestedOffers`). */
export type BattleOfferInput = {
  id: string
  name: string
  practiceName: string
  practiceSlug: string
  shortDescription: string | null
}

// ─── Options ────────────────────────────────────────────────────────────────

/**
 * Interlocuteur. Deux natures, jamais mélangées dans un même choix :
 *
 * - `contact` : personne réelle du CRM → alimente `who.recipient.contactId` et
 *   `.displayName` (nom réel uniquement).
 * - `playbook` : persona du playbook sectoriel → alimente
 *   `battleSituation.personaLabel`. `displayName` reste VIDE : y écrire
 *   « DSI / responsable SI » serait sémantiquement faux (Lot 0 §5.4.a).
 */
export type BattlePersonaOption = {
  key: string
  kind: "contact" | "playbook"
  label: string
  sublabel: string | null
  /** Renseigné uniquement pour `kind: "contact"`. */
  contactId?: string
  jobTitle?: string | null
  relationshipRole?: string | null
  /** Renseigné uniquement pour `kind: "playbook"`. */
  personaLabel?: string
}

export type BattleIssueOption = {
  key: string
  id?: string
  label: string
  source: BattleSituationSource
  detail: string | null
  /**
   * `account_issues.evidence_level` (`observed` / `inferred` / `weak`) — un
   * enjeu compte `weak` ou `inferred` n'est PAS un fait observé et doit être
   * affiché comme tel (Lot 0 §7.1).
   */
  evidenceLevel: string | null
  /**
   * `resolvedLevel` sectoriel (`segment` / `macro`) — information ORTHOGONALE à
   * `source` : elle dit si l'élément vient du segment ou est hérité du macro
   * parent. Ne jamais la replier dans `source`.
   */
  resolvedLevel: "segment" | "macro" | null
}

export type BattleAngleOption = {
  key: string
  label: string
  source: BattleSituationSource
  detail: string | null
}

export type BattleTimingOption = {
  key: string
  id?: string
  label: string
  source: BattleSituationSource
  detail: string | null
  resolvedLevel: "segment" | "macro" | null
}

export type BattleObjectionOption = {
  key: string
  label: string
  response: string | null
}

export type BattleRoiOption = {
  key: string
  argument: string
}

export type BattleOfferOption = {
  key: string
  id: string
  name: string
  practiceName: string
  shortDescription: string | null
  /** L'offre relève d'une practice suggérée par `get_pitch_context`. */
  isSuggested: boolean
}

export type BattleSituationOptions = {
  personas: BattlePersonaOption[]
  /** `true` quand les personas proposés viennent du playbook, faute de contact CRM. */
  personaFallbackToPlaybook: boolean
  issues: BattleIssueOption[]
  angles: BattleAngleOption[]
  timings: BattleTimingOption[]
  objections: BattleObjectionOption[]
  roiArguments: BattleRoiOption[]
  offers: BattleOfferOption[]
}

// ─── Brouillon de situation (état UI) ───────────────────────────────────────

export type BattleSituationLength = "concise" | "standard"

export type BattleSituationDraft = {
  persona: BattlePersonaOption | null
  issue: BattleIssueOption | null
  angle: BattleAngleOption | null
  timing: BattleTimingOption | null
  objection: BattleObjectionOption | null
  roiArgument: BattleRoiOption | null
  offer: BattleOfferOption | null
  /** `content_collections.id` — champ canonique `context.preferredCollectionIds`. */
  collectionIds: string[]
  length: BattleSituationLength
}

export function createEmptyBattleSituationDraft(): BattleSituationDraft {
  return {
    persona: null,
    issue: null,
    angle: null,
    timing: null,
    objection: null,
    roiArgument: null,
    offer: null,
    collectionIds: [],
    length: "concise",
  }
}

// ─── Construction des options ───────────────────────────────────────────────

function trimmed(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text.length > 0 ? text : null
}

/**
 * Interlocuteur — priorité au CRM (cadrage §8.1).
 *
 * Le repli sur les personas du playbook n'est PAS un état d'erreur : 15 comptes
 * sur 23 n'ont aucun contact CRM (Lot 0 §10.4). C'est le chemin majoritaire.
 */
export function buildPersonaOptions(
  contacts: BattleSituationContact[],
  playbook: unknown,
): { options: BattlePersonaOption[]; fallbackToPlaybook: boolean } {
  const crmOptions: BattlePersonaOption[] = contacts
    .filter((contact) => trimmed(contact.fullName) !== null)
    .map((contact) => ({
      key: `contact:${contact.id}`,
      kind: "contact" as const,
      label: contact.fullName.trim(),
      sublabel: trimmed(contact.jobTitle),
      contactId: contact.id,
      jobTitle: contact.jobTitle,
      relationshipRole: contact.relationshipRole,
    }))

  if (crmOptions.length > 0) {
    return { options: crmOptions, fallbackToPlaybook: false }
  }

  const playbookOptions: BattlePersonaOption[] = parsePlaybookPersonas(playbook).map((persona, index) => ({
    key: `playbook-persona:${index}:${persona.role}`,
    kind: "playbook" as const,
    label: persona.role,
    sublabel: persona.accountability ?? persona.trigger,
    personaLabel: persona.role,
  }))

  return { options: playbookOptions, fallbackToPlaybook: true }
}

/**
 * Enjeux — compte d'abord, secteur ensuite. Les deux listes cohabitent : la
 * provenance est portée par l'option, jamais par sa position.
 */
export function buildIssueOptions(
  accountIssues: BattleAccountIssue[],
  painPoints: BattleSectorPainPoint[],
): BattleIssueOption[] {
  const fromAccount: BattleIssueOption[] = accountIssues
    .filter((issue) => trimmed(issue.title) !== null)
    .map((issue) => ({
      key: `account-issue:${issue.id}`,
      id: issue.id,
      label: issue.title.trim(),
      source: "account" as const,
      detail: trimmed(issue.problemStatement),
      evidenceLevel: trimmed(issue.evidenceLevel),
      resolvedLevel: null,
    }))

  const fromSector: BattleIssueOption[] = painPoints
    .filter((painPoint) => trimmed(painPoint.title) !== null)
    .map((painPoint) => ({
      key: `sector-pain-point:${painPoint.id}`,
      id: painPoint.id,
      label: painPoint.title.trim(),
      source: "sector" as const,
      detail: trimmed(painPoint.description),
      evidenceLevel: null,
      resolvedLevel: painPoint.resolvedLevel,
    }))

  return [...fromAccount, ...fromSector]
}

/**
 * Angles — trois sources, aucune ne porte d'identifiant (Lot 0 §5.3) :
 *   1. `competitive_map_entries.angle_entree` (compte, renseigné sur 23/23) ;
 *   2. `profile_json.traduction_commerciale` (compte) ;
 *   3. `playbook.entry_points[]` (secteur).
 *
 * `brief.context.angle` n'est JAMAIS utilisé : champ mort vérifié des deux
 * côtés (aucun producteur front, jamais lu par `Assemble Prompt`) — Lot 0 §R-B.
 */
export function buildAngleOptions(actor: CompetitiveMapActor, playbook: unknown): BattleAngleOption[] {
  const options: BattleAngleOption[] = []

  const entryAngle = trimmed(actor.angleEntree)
  if (entryAngle) {
    options.push({
      key: `actor-angle:${entryAngle}`,
      label: entryAngle,
      source: "account",
      detail: null,
    })
  }

  actor.details.traductionCommerciale.forEach((translation, index) => {
    const label = trimmed(translation)
    if (!label || label === entryAngle) return
    options.push({
      key: `actor-translation:${index}:${label}`,
      label,
      source: "account",
      detail: null,
    })
  })

  parsePlaybookEntryPoints(playbook).forEach((entryPoint, index) => {
    options.push({
      key: `playbook-entry-point:${index}:${entryPoint.angle}`,
      label: entryPoint.angle,
      source: "sector",
      detail: entryPoint.signal ?? entryPoint.interlocuteur,
    })
  })

  return options
}

/**
 * Timing — facultatif. Un trigger d'entreprise et une échéance réglementaire
 * n'ont pas le même statut de preuve : la provenance est conservée.
 */
export function buildTimingOptions(
  actor: CompetitiveMapActor,
  regulatory: BattleSectorRegulatoryItem[],
  events: BattleSectorEvent[],
): BattleTimingOption[] {
  const options: BattleTimingOption[] = []

  actor.details.triggers.forEach((trigger, index) => {
    const label = trimmed(trigger)
    if (!label) return
    options.push({
      key: `actor-trigger:${index}:${label}`,
      label,
      source: "account",
      detail: null,
      resolvedLevel: null,
    })
  })

  regulatory.forEach((item) => {
    const label = trimmed(item.name)
    if (!label) return
    options.push({
      key: `sector-regulatory:${item.id}`,
      id: item.id,
      label,
      source: "sector",
      detail: trimmed(item.commercialAngle) ?? trimmed(item.deadlineDate),
      resolvedLevel: item.resolvedLevel,
    })
  })

  events.forEach((event) => {
    const label = trimmed(event.title)
    if (!label) return
    options.push({
      key: `sector-event:${event.id}`,
      id: event.id,
      label,
      source: "sector",
      detail: trimmed(event.commercialOpportunity) ?? trimmed(event.eventDate),
      resolvedLevel: event.resolvedLevel,
    })
  })

  return options
}

/**
 * Objections — playbook sectoriel uniquement.
 *
 * `profile_json.a_ne_pas_dire` (lignes rouges) n'est PAS une source
 * d'objections : ce sont des interdits de discours, pas des arguments que
 * l'interlocuteur oppose. Les confondre produirait un pitch qui répond à une
 * objection que personne n'a formulée (Lot 0 §7.1).
 */
export function buildObjectionOptions(playbook: unknown): BattleObjectionOption[] {
  return parsePlaybookObjections(playbook).map((objection, index) => ({
    key: `playbook-objection:${index}:${objection.objection}`,
    label: objection.objection,
    response: objection.response,
  }))
}

/** ROI — texte du playbook, jamais un chiffre calculé ou extrapolé. */
export function buildRoiOptions(playbook: unknown): BattleRoiOption[] {
  return parsePlaybookRoiArguments(playbook).map((roi, index) => ({
    key: `playbook-roi:${index}:${roi.argument}`,
    argument: roi.argument,
  }))
}

/**
 * Offres — catalogue KREDO existant. Les practices suggérées par
 * `get_pitch_context` remontent en tête, mais le catalogue complet reste
 * accessible : la suggestion oriente, elle ne restreint pas (ADR-0009).
 */
export function buildOfferOptions(
  offers: BattleOfferInput[],
  suggestedPracticeSlugs: string[],
): BattleOfferOption[] {
  const suggested = new Set(suggestedPracticeSlugs)

  return offers
    .map((offer) => ({
      key: `offer:${offer.id}`,
      id: offer.id,
      name: offer.name,
      practiceName: offer.practiceName,
      shortDescription: offer.shortDescription,
      isSuggested: suggested.has(offer.practiceSlug),
    }))
    .sort((a, b) => {
      if (a.isSuggested !== b.isSuggested) return a.isSuggested ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

// ─── Cohérence du brouillon ─────────────────────────────────────────────────

function keepIfStillAvailable<T extends { key: string }>(selected: T | null, options: T[]): T | null {
  if (!selected) return null
  return options.some((option) => option.key === selected.key) ? selected : null
}

/**
 * Purge du brouillon les sélections qui n'existent plus dans les options
 * disponibles.
 *
 * Appelé pendant le rendu (valeur dérivée, pas un effet de synchronisation) :
 * quand le compte actif change, quand les contacts ou les enjeux arrivent en
 * chargement paresseux, ou quand le segment change, une sélection orpheline
 * disparaît immédiatement au lieu de partir dans un brief.
 *
 * `collectionIds` et `length` n'en dépendent pas : les listes personnelles sont
 * globales au workspace, pas au compte.
 */
export function pruneDraftAgainstOptions(
  draft: BattleSituationDraft,
  options: BattleSituationOptions,
): BattleSituationDraft {
  return {
    ...draft,
    persona: keepIfStillAvailable(draft.persona, options.personas),
    issue: keepIfStillAvailable(draft.issue, options.issues),
    angle: keepIfStillAvailable(draft.angle, options.angles),
    timing: keepIfStillAvailable(draft.timing, options.timings),
    objection: keepIfStillAvailable(draft.objection, options.objections),
    roiArgument: keepIfStillAvailable(draft.roiArgument, options.roiArguments),
    offer: keepIfStillAvailable(draft.offer, options.offers),
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Les 4 décisions métier minimales de la North Star V1 (cadrage §3.3).
 * Timing, objection, ROI et Knowledge restent facultatifs — la V1 ne doit pas
 * devenir un formulaire administratif.
 */
export const BATTLE_SITUATION_REQUIRED_FIELDS = ["persona", "issue", "angle", "offer"] as const

export type BattleSituationRequiredField = (typeof BATTLE_SITUATION_REQUIRED_FIELDS)[number]

export const BATTLE_SITUATION_REQUIRED_LABELS: Record<BattleSituationRequiredField, string> = {
  persona: "Interlocuteur",
  issue: "Enjeu",
  angle: "Angle",
  offer: "Offre",
}

export type BattleSituationValidation = {
  isComplete: boolean
  missing: BattleSituationRequiredField[]
}

export function validateBattleSituationDraft(draft: BattleSituationDraft): BattleSituationValidation {
  const missing = BATTLE_SITUATION_REQUIRED_FIELDS.filter((field) => draft[field] === null)
  return { isComplete: missing.length === 0, missing: [...missing] }
}

/**
 * Une situation est *impossible* — et non pas seulement incomplète — quand une
 * dimension obligatoire n'a aucune option disponible. C'est le cas mesuré des
 * comptes sans aucun enjeu (ni `account_issues`, ni `painPoints` sectoriels) :
 * aucune génération ne doit être proposée, et surtout aucun enjeu inventé.
 */
export function findUnsatisfiableRequirements(
  options: BattleSituationOptions,
): BattleSituationRequiredField[] {
  const unsatisfiable: BattleSituationRequiredField[] = []
  if (options.personas.length === 0) unsatisfiable.push("persona")
  if (options.issues.length === 0) unsatisfiable.push("issue")
  if (options.angles.length === 0) unsatisfiable.push("angle")
  if (options.offers.length === 0) unsatisfiable.push("offer")
  return unsatisfiable
}

// ─── Résumé de situation (UI seulement) ─────────────────────────────────────

const SUMMARY_PART_MAX_LENGTH = 64

function shorten(value: string): string {
  const text = value.trim()
  if (text.length <= SUMMARY_PART_MAX_LENGTH) return text
  return `${text.slice(0, SUMMARY_PART_MAX_LENGTH - 1).trimEnd()}…`
}

/**
 * Phrase lisible résumant la configuration (cadrage §8.3) :
 *
 *     DSI · Modernisation SI · Cloud souverain · avant NIS2 · Offre X
 *
 * Purement UI : elle ne remplace jamais le brief structuré et n'est envoyée
 * nulle part.
 */
export function buildSituationSummary(draft: BattleSituationDraft): string {
  const parts: string[] = []
  if (draft.persona) parts.push(shorten(draft.persona.label))
  if (draft.issue) parts.push(shorten(draft.issue.label))
  if (draft.angle) parts.push(shorten(draft.angle.label))
  if (draft.timing) parts.push(shorten(draft.timing.label))
  if (draft.objection) parts.push(`objection : ${shorten(draft.objection.label)}`)
  if (draft.offer) parts.push(`offre ${shorten(draft.offer.name)}`)
  return parts.join(" · ")
}

// ─── Projection vers le contrat ─────────────────────────────────────────────

function toChoice(option: { id?: string; label: string; source: BattleSituationSource }): BattleSituationChoice {
  return {
    ...(option.id ? { id: option.id } : {}),
    label: option.label,
    source: option.source,
  }
}

/**
 * Projette le brouillon vers le contrat figé au Lot 0.
 *
 * Renvoie `null` tant que les 4 dimensions obligatoires ne sont pas choisies :
 * un `BattleSituation` partiel n'existe pas.
 *
 * `personaLabel` n'est renseigné QUE pour un persona du playbook — quand un
 * contact CRM est choisi, l'information vit dans `who.recipient` du brief.
 */
export function toBattleSituation(
  draft: BattleSituationDraft,
  identity: { competitiveEntryId: string; segmentId: string },
): BattleSituation | null {
  if (!draft.issue || !draft.angle || !draft.persona || !draft.offer) return null

  return {
    competitiveEntryId: identity.competitiveEntryId,
    segmentId: identity.segmentId,
    issue: toChoice(draft.issue),
    angle: toChoice(draft.angle),
    ...(draft.timing ? { timing: toChoice(draft.timing) } : {}),
    ...(draft.objection
      ? {
        objection: {
          label: draft.objection.label,
          ...(draft.objection.response ? { response: draft.objection.response } : {}),
        },
      }
      : {}),
    ...(draft.roiArgument ? { roiArgument: draft.roiArgument.argument } : {}),
    ...(draft.persona.kind === "playbook" && draft.persona.personaLabel
      ? { personaLabel: draft.persona.personaLabel }
      : {}),
  }
}
