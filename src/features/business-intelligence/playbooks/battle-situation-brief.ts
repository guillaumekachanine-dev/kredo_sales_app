// ─── Dynamic Playbooks · Lot 3 — construction du `CommunicationBrief` ───────
//
// Fonction PURE. Elle ne déclenche rien : aucun appel réseau, aucun LLM, aucune
// écriture Supabase. Le Lot 4 (A3) branchera `POST /api/n8n/trigger` sur le
// brief produit ici, sans le reconstruire.
//
// Ce module ne réimplémente NI le scope, NI les catégories, NI les objectifs,
// NI les tonalités, NI le type de destinataire, NI les références : il assemble
// le brief avec les primitives canoniques (`buildDefaultBrief`) puis le fait
// normaliser par le résolveur officiel (`resolveCommunicationOptions`). Le seul
// endroit où il impose quelque chose est documenté en §« Shim pré-Lot 4 ».

import {
  buildDefaultBrief,
} from "@/components/accounts-contacts/intelligence/communication-brief-options"
import {
  resolveCommunicationOptions,
  type CommunicationContextFacts,
  type CommunicationResolution,
} from "@/lib/communication/communication-options-resolver"
import { getScenarioDefinition } from "@/lib/communication/communication-scenario-registry"
import type {
  CommunicationActivityCategory,
  CommunicationBrief,
  CommunicationChannel,
  CommunicationOutputKind,
  CommunicationRecipientType,
  CommunicationScenario,
  CommunicationScope,
} from "@/lib/n8n/types"
import type { BattleSituation } from "./battle-situation-contract"
import {
  toBattleSituation,
  validateBattleSituationDraft,
  type BattleSituationDraft,
  type BattleSituationRequiredField,
} from "./battle-situation-options"

// ─── Identité du scénario ───────────────────────────────────────────────────

/**
 * 🔶 CAST TEMPORAIRE, UNIQUE ET LOCALISÉ — le seul de ce lot.
 *
 * `battle_situation_pitch` n'existe pas encore dans l'union
 * `CommunicationScenario` : c'est A3 qui l'y ajoute au Lot 4, en même temps que
 * l'entrée de registre et les deux listes « scénarios exigeant une offre »
 * (`OFFER_REQUIRED_SCENARIOS` côté TS, `SCENARIOS_REQUIRING_OFFER` côté n8n).
 *
 * Le Lot 3 doit être livrable et testable AVANT le Lot 4 (Lot 0 §13) : ce cast
 * est le prix exact de cette indépendance. Il est posé ICI et nulle part
 * ailleurs — aucun `any` ne circule dans l'UI, qui ne manipule que des types
 * exacts. A3 le supprime au Lot 4 : la constante redeviendra un littéral de
 * l'union, sans autre changement dans ce fichier.
 */
export const BATTLE_SITUATION_SCENARIO = "battle_situation_pitch" as CommunicationScenario

export const BATTLE_SITUATION_OUTPUT_KIND: CommunicationOutputKind = "spoken_pitch"
export const BATTLE_SITUATION_CHANNEL: CommunicationChannel = "spoken_pitch_30s"
export const BATTLE_SITUATION_ACTIVITY_CATEGORY: CommunicationActivityCategory = "commerce_prospection"
export const BATTLE_SITUATION_SCOPE: CommunicationScope = "account"

/**
 * Les 4 types de destinataire commerciaux (Lot 0 §6.2). A3 les portera dans
 * `eligibleRecipientTypes` du seed : sans cette surcharge, le résolveur
 * forcerait `prospect` sur un compte client actif.
 */
export const BATTLE_SITUATION_ELIGIBLE_RECIPIENT_TYPES: CommunicationRecipientType[] = [
  "prospect",
  "partner",
  "active_client",
  "former_client",
]

// ─── Contexte étendu ────────────────────────────────────────────────────────

/**
 * `CommunicationBrief["context"]` + le bloc Situation. Le champ deviendra
 * canonique au Lot 4 (`battleSituation?: BattleSituation` dans
 * `src/lib/n8n/types.ts`, par `import type` du contrat) ; d'ici là, cette
 * intersection suffit : un objet typé ainsi est assignable au contexte du brief
 * sans aucun cast (le contrôle des propriétés excédentaires ne s'applique
 * qu'aux littéraux), et il traverse `input_snapshot` → n8n → `brief_json` sans
 * une ligne de plomberie supplémentaire.
 */
export type BattleSituationBriefContext = CommunicationBrief["context"] & {
  battleSituation: BattleSituation
}

/** Relecture typée du bloc Situation d'un brief. */
export function readBattleSituation(brief: CommunicationBrief): BattleSituation | null {
  const context = brief.context as Partial<BattleSituationBriefContext>
  return context.battleSituation ?? null
}

// ─── Entrée / sortie ────────────────────────────────────────────────────────

export type BattleSituationBriefActor = {
  /** `competitive_map_entries.id`. */
  id: string
  /** `companies.id` — NOT NULL en base, jamais nul ici (Lot 0 §4). */
  companyId: string
  name: string
  lifecycleStatus?: string | null
}

export type BuildBattleSituationBriefInput = {
  actor: BattleSituationBriefActor
  /** `sector_intelligence.id`, niveau segment — maille réelle du playbook affiché. */
  segmentId: string
  /** `profiles.full_name` de l'utilisateur connecté. */
  senderName: string
  draft: BattleSituationDraft
}

export type BattleSituationBriefResult =
  | { ok: false; missing: BattleSituationRequiredField[] }
  | {
    ok: true
    brief: CommunicationBrief
    battleSituation: BattleSituation
    resolution: CommunicationResolution
    /**
     * `false` tant que A3 n'a pas enregistré le scénario (Lot 4). Sert au
     * handoff et aux tests : il documente que l'identité du scénario a dû être
     * réimposée après le résolveur.
     */
    scenarioRegistered: boolean
  }

// ─── Construction ───────────────────────────────────────────────────────────

/**
 * Construit le `CommunicationBrief` canonique de la situation.
 *
 * Ordre imposé par le Lot 0 §7 :
 *   1. `buildDefaultBrief` — persona, type et relation du destinataire dérivés
 *      du contact CRM et du `lifecycle_status` (jamais recalculés ici) ;
 *   2. imposition de l'identité du scénario Battle — `buildDefaultBrief` cherche
 *      le scénario dans le registre et retombe sur `SCENARIO_REGISTRY[0]` tant
 *      que A3 ne l'y a pas ajouté ;
 *   3. `resolveCommunicationOptions(..., { scenario: "user" })` — la cascade
 *      scope → catégorie → scénario → objectif → canal → ton → destinataire ;
 *   4. shim pré-Lot 4 (voir ci-dessous).
 */
export function buildBattleSituationBrief(
  input: BuildBattleSituationBriefInput,
): BattleSituationBriefResult {
  const { actor, segmentId, senderName, draft } = input

  const validation = validateBattleSituationDraft(draft)
  if (!validation.isComplete) {
    return { ok: false, missing: validation.missing }
  }

  const battleSituation = toBattleSituation(draft, {
    competitiveEntryId: actor.id,
    segmentId,
  })
  if (!battleSituation || !draft.offer) {
    return { ok: false, missing: validation.missing }
  }

  const persona = draft.persona
  const crmContact = persona && persona.kind === "contact" && persona.contactId
    ? {
      id: persona.contactId,
      fullName: persona.label,
      jobTitle: persona.jobTitle ?? null,
      relationshipRole: persona.relationshipRole ?? null,
      email: null,
    }
    : null

  const lifecycleStatus = actor.lifecycleStatus ?? "cible"

  const defaultBrief = buildDefaultBrief(
    {
      company: { lifecycleStatus, name: actor.name },
      contacts: crmContact ? [crmContact] : [],
      scope: BATTLE_SITUATION_SCOPE,
      communicationPreset: {
        // `buildDefaultBrief` ne lit du preset que le canal, l'objectif, le ton,
        // la longueur, le contact et les refs : le scénario est cherché dans le
        // registre (absent avant le Lot 4). D'où l'imposition explicite du bloc
        // `what` juste après.
        scenario: BATTLE_SITUATION_SCENARIO,
        channel: BATTLE_SITUATION_CHANNEL,
        objective: "get_meeting",
        tone: "direct",
        length: draft.length,
        ...(crmContact ? { contactId: crmContact.id } : {}),
        refs: {
          offerRef: draft.offer.id,
          ...(draft.collectionIds.length > 0 ? { preferredCollectionIds: [...draft.collectionIds] } : {}),
        },
      },
    },
    senderName,
  )

  const context: BattleSituationBriefContext = {
    ...defaultBrief.context,
    offerRef: draft.offer.id,
    ...(draft.collectionIds.length > 0 ? { preferredCollectionIds: [...draft.collectionIds] } : {}),
    battleSituation,
  }

  const briefBeforeResolution: CommunicationBrief = {
    ...defaultBrief,
    what: {
      ...defaultBrief.what,
      scenario: BATTLE_SITUATION_SCENARIO,
      outputKind: BATTLE_SITUATION_OUTPUT_KIND,
      channel: BATTLE_SITUATION_CHANNEL,
      activityCategory: BATTLE_SITUATION_ACTIVITY_CATEGORY,
      scope: BATTLE_SITUATION_SCOPE,
      length: draft.length,
    },
    how: {
      ...defaultBrief.how,
      tone: "direct",
      formality: "vous",
      language: "fr",
    },
    context,
  }

  const facts: CommunicationContextFacts = {
    scope: BATTLE_SITUATION_SCOPE,
    hasCompany: true,
    hasContact: Boolean(crmContact),
    hasOffer: true,
    accountLifecycle: lifecycleStatus,
    recipientType: briefBeforeResolution.who.recipient.type,
    persona: briefBeforeResolution.who.recipient.persona,
    relation: briefBeforeResolution.who.recipient.relation,
  }

  // `scenario: "user"` est indispensable : sans lui, `preserveExplicitScenario`
  // est faux et le résolveur peut basculer sur un autre scénario de la
  // catégorie (Lot 0 §7, règle de construction L3).
  const resolution = resolveCommunicationOptions(facts, briefBeforeResolution, {
    scenario: "user",
    scope: "user",
    offerId: "user",
  })

  const scenarioRegistered = getScenarioDefinition(BATTLE_SITUATION_SCENARIO) !== undefined

  return {
    ok: true,
    brief: enforceBattleScenarioIdentity(resolution.normalizedBrief, briefBeforeResolution, scenarioRegistered),
    battleSituation,
    resolution,
    scenarioRegistered,
  }
}

/**
 * ─── Shim pré-Lot 4 ────────────────────────────────────────────────────────
 *
 * Tant que `battle_situation_pitch` n'est pas dans le registre,
 * `getScenarioDefinition` renvoie `undefined`, `preserveExplicitScenario` est
 * faux, et `chooseDefinition` retombe sur le PREMIER scénario éligible de
 * `commerce_prospection` : le résolveur remplace alors silencieusement le
 * scénario, le canal, le type de sortie et parfois le type de destinataire.
 *
 * On réimpose donc l'identité Battle — et uniquement elle. Ce n'est pas une
 * normalisation concurrente : tout le reste (catégorie, objectif, ton,
 * longueur, références) reste ce que le résolveur a décidé.
 *
 * Dès le Lot 4, `scenarioRegistered` passe à `true`, cette fonction rend le
 * brief du résolveur tel quel, et le comportement devient celui de production.
 * Un test asserte les deux branches.
 */
function enforceBattleScenarioIdentity(
  resolved: CommunicationBrief,
  requested: CommunicationBrief,
  scenarioRegistered: boolean,
): CommunicationBrief {
  if (scenarioRegistered) return resolved

  const requestedRecipientType = requested.who.recipient.type
  const recipientType = BATTLE_SITUATION_ELIGIBLE_RECIPIENT_TYPES.includes(requestedRecipientType)
    ? requestedRecipientType
    : resolved.who.recipient.type

  return {
    ...resolved,
    what: {
      ...resolved.what,
      scenario: BATTLE_SITUATION_SCENARIO,
      outputKind: BATTLE_SITUATION_OUTPUT_KIND,
      channel: BATTLE_SITUATION_CHANNEL,
      activityCategory: BATTLE_SITUATION_ACTIVITY_CATEGORY,
      length: requested.what.length,
    },
    who: {
      ...resolved.who,
      recipient: { ...resolved.who.recipient, type: recipientType },
      objective: resolved.who.objective,
    },
  }
}
