import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationContextSourceId,
  CommunicationLength,
  CommunicationObjective,
  CommunicationRecipientType,
  CommunicationTone,
} from "@/lib/n8n/types"
import { getScenarioRegistryItem, type ActivityCategory } from "./communication-scenario-registry"
import type { CommunicationAdjustment, CommunicationContextFacts, CommunicationResolution } from "./communication-options-resolver"
import type { CommunicationSourceAvailability, CommunicationSourceAvailabilityKey, LoadedCommunicationFacts } from "./communication-context-mappers"

// Lot 7 — modèle pur dérivant, pour une paire (brief, resolution), quels
// champs le formulaire doit afficher/requérir/verrouiller. Le composant React
// ne fait que lire ce modèle : aucune condition métier (scénario, catégorie,
// scope) n'est dupliquée dans le JSX.

export type ContextSourceVisibility = "locked_on" | "optional_on" | "optional_off" | "unavailable"

export type ContextSourceState = {
  id: CommunicationContextSourceId
  visibility: ContextSourceVisibility
}

export type BriefFormModel = {
  showCategorySelector: boolean
  availableCategories: ActivityCategory[]
  showContact: boolean
  showOpportunity: boolean
  showMission: boolean
  showCandidate: boolean
  // true = le candidat EST le destinataire (message adressé au candidat) ;
  // false = le candidat n'est qu'une référence de contexte (ex: pitch vers un
  // client à propos d'un candidat) — command §3.
  candidateIsRecipient: boolean
  showOffer: boolean
  offerRequired: boolean
  recipientTypeOptions: CommunicationRecipientType[]
  objectives: CommunicationObjective[]
  channels: CommunicationChannel[]
  lengths: CommunicationLength[]
  tones: CommunicationTone[]
  contextSources: ContextSourceState[]
}

const SOURCE_AVAILABILITY_MAP: Partial<Record<CommunicationContextSourceId, CommunicationSourceAvailabilityKey>> = {
  account_profile: "company",
  crm_contacts: "contact",
  opportunity_context: "opportunity",
  interaction_history: "interactions",
  mission_context: "mission",
  candidate_profile: "candidate",
  collaborator_context: "collaborator",
  offer_catalog: "offer",
  source_document: "documents",
  // signal_intelligence / previous_generation n'ont pas de clé de disponibilité
  // dédiée dans CommunicationSourceAvailability — traitées comme disponibles
  // par défaut faute de preuve du contraire (jamais masquées sans signal négatif).
}

export const ALL_CONTEXT_SOURCE_IDS: CommunicationContextSourceId[] = [
  "account_profile",
  "crm_contacts",
  "signal_intelligence",
  "opportunity_context",
  "interaction_history",
  "mission_context",
  "candidate_profile",
  "collaborator_context",
  "offer_catalog",
  "source_document",
  "previous_generation",
]

export function buildContextSourceStates(
  resolution: CommunicationResolution | null,
  disabledContextSources: CommunicationContextSourceId[] | undefined,
  sourceAvailability?: CommunicationSourceAvailability,
): ContextSourceState[] {
  const required = new Set(resolution?.requiredContextSources ?? [])
  const optional = new Set(resolution?.optionalContextSources ?? [])
  const disabled = new Set(disabledContextSources ?? [])

  return ALL_CONTEXT_SOURCE_IDS
    .filter((id) => required.has(id) || optional.has(id))
    .map((id) => {
      const availabilityKey = SOURCE_AVAILABILITY_MAP[id]
      const available = availabilityKey ? sourceAvailability?.[availabilityKey] : undefined

      if (available === false) return { id, visibility: "unavailable" as const }
      if (required.has(id)) return { id, visibility: "locked_on" as const }
      return { id, visibility: disabled.has(id) ? "optional_off" as const : "optional_on" as const }
    })
}

export function buildBriefFormModel(
  brief: CommunicationBrief,
  resolution: CommunicationResolution | null,
  sourceAvailability?: CommunicationSourceAvailability,
): BriefFormModel {
  const scope = brief.what.scope
  const definition = getScenarioRegistryItem(brief.what.scenario)
  const requiredRefs = new Set(resolution?.requiredReferences ?? definition?.requiredReferences ?? [])
  const optionalRefs = new Set(resolution?.optionalReferences ?? definition?.optionalReferences ?? [])
  const eligibleRecipientTypes = definition?.eligibleRecipientTypes ?? []
  const candidateIsRecipient =
    eligibleRecipientTypes.length > 0 && eligibleRecipientTypes.every((type) => type === "candidate")
  const requiresOffer = definition?.requiresOffer ?? false

  return {
    showCategorySelector: scope === "account",
    availableCategories: resolution?.availableActivityCategories ?? [],
    showContact: scope === "account" && !candidateIsRecipient,
    showOpportunity: requiredRefs.has("opportunityRef") || optionalRefs.has("opportunityRef"),
    showMission: requiredRefs.has("missionRef") || optionalRefs.has("missionRef"),
    showCandidate: requiredRefs.has("profileRef") || optionalRefs.has("profileRef") || candidateIsRecipient,
    candidateIsRecipient,
    // Lot 7 — corrige l'écart documenté (handoff §5.4) : l'offre catalogue ne
    // dépend plus de outputKind (isPitch) mais uniquement de scenario.requiresOffer.
    showOffer: requiresOffer,
    offerRequired: requiresOffer,
    recipientTypeOptions: eligibleRecipientTypes,
    objectives: resolution?.availableObjectives.length ? resolution.availableObjectives : definition?.allowedObjectives ?? [],
    channels: resolution?.availableChannels.length ? resolution.availableChannels : definition?.allowedChannels ?? [],
    lengths: resolution?.availableLengths.length ? resolution.availableLengths : definition?.allowedLengths ?? [],
    tones: resolution?.availableTones.length ? resolution.availableTones : definition?.suggestedTones ?? [],
    contextSources: buildContextSourceStates(resolution, brief.context.disabledContextSources, sourceAvailability),
  }
}

// Lot 7 — les refs choisies manuellement dans le formulaire (opportunité,
// mission, candidat, offre, contact) doivent immédiatement compter pour la
// résolution suivante, même si les facts chargés au montage du composer ne le
// savent pas encore (pas de refetch Supabase à chaque sélection — Lot 7 reste
// borné au client). On ne fabrique que des booléens de présence : jamais un
// statut ou une donnée métier qu'on ne connaît pas réellement.
export function mergeCommunicationFacts(
  baseFacts: LoadedCommunicationFacts | undefined,
  brief: CommunicationBrief,
): CommunicationContextFacts {
  // Recrutement mélange des scénarios adressés au candidat et d'autres
  // adressés au client (Lot 7 — eligibleRecipientTypes par scénario). Le fait
  // recipientType hérité du lifecycle compte (ex: "prospect") n'est jamais
  // "candidate" : le propager tel quel ferait rejeter par le résolveur tout
  // scénario candidat-destinataire (candidates filtrés par
  // scenario.eligibleRecipientTypes.includes(facts.recipientType)) et
  // remplacer silencieusement le choix de l'utilisateur. Cette catégorie
  // laisse donc le résolveur déduire le destinataire depuis le scénario
  // choisi plutôt que depuis un fait structurellement non pertinent ici.
  const isRecruitment = brief.what.activityCategory === "recrutement"

  return {
    ...(baseFacts ?? {}),
    scope: brief.what.scope,
    recipientType: isRecruitment ? undefined : baseFacts?.recipientType,
    hasContact: Boolean(brief.who.recipient.contactId) || baseFacts?.hasContact,
    hasOpportunity: Boolean(brief.context.opportunityRef) || baseFacts?.hasOpportunity,
    hasMission: Boolean(brief.context.missionRef) || baseFacts?.hasMission,
    hasCandidate: Boolean(brief.context.profileRef) || baseFacts?.hasCandidate,
    hasOffer: Boolean(brief.context.offerRef) || baseFacts?.hasOffer,
  }
}

export type ReferencePurgeResult = {
  brief: CommunicationBrief
  adjustments: CommunicationAdjustment[]
}

const REFERENCE_CONTEXT_KEYS = ["offerRef", "opportunityRef", "missionRef", "profileRef"] as const

// Lot 7 — cascade "changement de scénario" (handoff §10.4) : une référence
// choisie pour un scénario précédent (ex: une offre pour cold_call_pitch) doit
// être retirée si le scénario résolu ne la reconnaît plus comme requise ou
// optionnelle, avec un ajustement tracé plutôt qu'un état caché incohérent.
export function purgeIncompatibleReferences(
  brief: CommunicationBrief,
  resolution: CommunicationResolution,
): ReferencePurgeResult {
  const relevant = new Set([...resolution.requiredReferences, ...resolution.optionalReferences])
  const adjustments: CommunicationAdjustment[] = []
  const nextContext = { ...brief.context }

  for (const contextKey of REFERENCE_CONTEXT_KEYS) {
    const currentValue = nextContext[contextKey]
    if (currentValue && !relevant.has(contextKey)) {
      adjustments.push({
        field: contextKey,
        previousValue: String(currentValue),
        reason: "reference not relevant to resolved scenario",
      })
      delete nextContext[contextKey]
    }
  }

  if (adjustments.length === 0) return { brief, adjustments }
  return { brief: { ...brief, context: nextContext }, adjustments }
}
