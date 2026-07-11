import type {
  CanonicalCommunicationActivityCategory,
  CommunicationBrief,
  CommunicationChannel,
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationLength,
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationPersona,
  CommunicationRecipientType,
  CommunicationRelation,
  CommunicationScenario,
  CommunicationScope,
  CommunicationTone,
} from "@/lib/n8n/types"
import {
  normalizeCommunicationActivityCategory,
  normalizeCommunicationScenario,
} from "./communication-legacy-normalizer"
import {
  getScenarioDefinition,
  SCENARIO_REGISTRY,
  type CommunicationScenarioDefinition,
} from "./communication-scenario-registry"

export type CommunicationFieldSource = "auto" | "user"

export type CommunicationFieldSources = Partial<Record<
  | "activityCategory"
  | "scenario"
  | "outputKind"
  | "scope"
  | "recipientType"
  | "objective"
  | "channel"
  | "length"
  | "tone"
  | "offerId",
  CommunicationFieldSource
>>

export type CommunicationContextFacts = {
  scope?: CommunicationScope
  recipientType?: CommunicationRecipientType
  accountLifecycle?: string
  persona?: CommunicationPersona
  relation?: CommunicationRelation
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  hasCompany?: boolean
  hasContact?: boolean
  hasOpportunity?: boolean
  hasMission?: boolean
  hasCandidate?: boolean
  hasCollaborator?: boolean
  hasOffer?: boolean
}

export type CommunicationAdjustment = {
  field: string
  previousValue?: string
  nextValue?: string
  reason: string
}

export type CommunicationResolution = {
  availableActivityCategories: CanonicalCommunicationActivityCategory[]
  availableScenarios: CommunicationScenario[]
  availableOutputKinds: CommunicationOutputKind[]
  availableObjectives: CommunicationObjective[]
  availableChannels: CommunicationChannel[]
  availableLengths: CommunicationLength[]
  availableTones: CommunicationTone[]
  requiredReferences: string[]
  optionalReferences: string[]
  requiredContextSources: string[]
  optionalContextSources: string[]
  normalizedBrief: CommunicationBrief
  fieldSources: CommunicationFieldSources
  adjustments: CommunicationAdjustment[]
}

const ACCOUNT_CATEGORIES: CanonicalCommunicationActivityCategory[] = [
  "commerce_prospection",
  "commerce_actif",
  "delivery",
  "recrutement",
]

function isScope(value: unknown): value is CommunicationScope {
  return value === "account" || value === "collaborator" || value === "internal"
}

function isOutputKind(value: unknown): value is CommunicationOutputKind {
  return value === "written_message" || value === "spoken_pitch" || value === "structured_briefing"
}

function resolveScope(facts: CommunicationContextFacts, current: unknown): CommunicationScope | undefined {
  if (facts.scope) return facts.scope
  if (facts.hasCollaborator) return "collaborator"
  if (facts.internalRole || facts.internalRelationship || facts.internalDomain) return "internal"
  if (facts.hasCompany || facts.hasContact || facts.hasOpportunity || facts.hasMission || facts.hasCandidate) return "account"
  return isScope(current) ? current : undefined
}

function categoriesForScope(scope: CommunicationScope | undefined): CanonicalCommunicationActivityCategory[] {
  if (scope === "collaborator") return ["management_consultants"]
  if (scope === "internal") return ["internal_staff"]
  if (scope === "account") return ACCOUNT_CATEGORIES
  return []
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function adjustment(
  adjustments: CommunicationAdjustment[],
  field: string,
  previousValue: unknown,
  nextValue: unknown,
  reason: string,
) {
  if (previousValue === nextValue) return
  adjustments.push({
    field,
    ...(previousValue === undefined ? {} : { previousValue: String(previousValue) }),
    ...(nextValue === undefined ? {} : { nextValue: String(nextValue) }),
    reason,
  })
}

function chooseDefinition(
  candidates: CommunicationScenarioDefinition[],
  requestedScenario: CommunicationScenario | undefined,
): CommunicationScenarioDefinition | undefined {
  const current = requestedScenario ? getScenarioDefinition(requestedScenario) : undefined
  if (current && candidates.some((candidate) => candidate.id === current.id)) return current
  return candidates[0]
}

export function resolveCommunicationOptions(
  facts: CommunicationContextFacts,
  currentBrief: CommunicationBrief,
  fieldSources: CommunicationFieldSources = {},
): CommunicationResolution {
  const adjustments: CommunicationAdjustment[] = []
  const sources = { ...fieldSources }
  const rawWhat = currentBrief.what as CommunicationBrief["what"] & {
    scenario?: string
    activityCategory?: string
    scope?: string
    outputKind?: string
  }
  const rawScenario = currentBrief.what.scenario as string
  const scope = resolveScope(facts, rawWhat.scope)
  const availableActivityCategories = categoriesForScope(scope)
  const legacyScenario = normalizeCommunicationScenario(rawScenario)
  const scenarioId = legacyScenario ?? rawScenario as CommunicationScenario | undefined
  const legacyCategory = rawWhat.activityCategory
    ? normalizeCommunicationActivityCategory(rawWhat.activityCategory, scope)
    : undefined

  if (rawWhat.activityCategory === "interne_management" && !legacyCategory) {
    throw new Error("Cannot normalize legacy interne_management without an explicit scope")
  }

  if (rawScenario === "profile_submission") {
    adjustment(adjustments, "scenario", rawScenario, legacyScenario, "legacy scenario normalized")
  }
  if (rawWhat.activityCategory === "interne_management" && legacyCategory) {
    adjustment(adjustments, "activityCategory", rawWhat.activityCategory, legacyCategory, "legacy category normalized from scope")
  }

  const requestedCategory = legacyCategory
  const category = requestedCategory && availableActivityCategories.includes(requestedCategory)
    ? requestedCategory
    : availableActivityCategories[0]
  adjustment(adjustments, "scope", rawWhat.scope, scope, "scope resolved from available facts")
  adjustment(adjustments, "activityCategory", legacyCategory, category, "category incompatible with resolved scope")

  const candidates = category
    ? SCENARIO_REGISTRY.filter((scenario) => {
      if (scenario.activityCategory !== category || !scope || !scenario.requiredScopes.includes(scope)) return false
      if (scope === "account" && facts.recipientType && !scenario.eligibleRecipientTypes.includes(facts.recipientType)) return false
      return true
    })
    : []
  const definition = chooseDefinition(candidates, scenarioId)
  const scenario = definition?.id ?? scenarioId ?? currentBrief.what.scenario
  adjustment(adjustments, "scenario", scenarioId, scenario, "scenario incompatible with resolved facts")

  const outputKind = definition
    ? isOutputKind(rawWhat.outputKind) && definition.allowedOutputKinds.includes(rawWhat.outputKind)
      ? rawWhat.outputKind
      : definition.defaultOutputKind
    : currentBrief.what.outputKind
  adjustment(adjustments, "outputKind", rawWhat.outputKind, outputKind, "output kind incompatible with scenario")

  const objective = definition && definition.allowedObjectives.includes(currentBrief.who.objective)
    ? currentBrief.who.objective
    : definition?.defaultObjective ?? currentBrief.who.objective
  adjustment(adjustments, "objective", currentBrief.who.objective, objective, "objective incompatible with scenario")

  const channel = definition && definition.allowedChannels.includes(currentBrief.what.channel)
    ? currentBrief.what.channel
    : definition?.defaultChannel ?? currentBrief.what.channel
  adjustment(adjustments, "channel", currentBrief.what.channel, channel, "channel incompatible with scenario")

  const length = definition && definition.allowedLengths.includes(currentBrief.what.length)
    ? currentBrief.what.length
    : definition?.allowedLengths[0] ?? currentBrief.what.length
  adjustment(adjustments, "length", currentBrief.what.length, length, "length incompatible with scenario")

  const tone = definition && !definition.excludedTones.includes(currentBrief.how.tone)
    ? currentBrief.how.tone
    : definition?.suggestedTones[0] ?? currentBrief.how.tone
  adjustment(adjustments, "tone", currentBrief.how.tone, tone, "tone excluded by scenario")

  // Lot 7 — le choix utilisateur du destinataire (ex: candidat vs client sur un
  // scénario recrutement) prime sur le fait déduit du lifecycle compte tant
  // qu'il reste éligible pour le scénario résolu ; sinon repli sur le fait,
  // puis sur le premier type éligible du scénario.
  const currentRecipientType = currentBrief.who.recipient.type
  const recipientType = scope === "collaborator"
    ? "collaborator"
    : scope === "internal"
      ? "internal"
      : definition && currentRecipientType && definition.eligibleRecipientTypes.includes(currentRecipientType)
        ? currentRecipientType
        : facts.recipientType && definition?.eligibleRecipientTypes.includes(facts.recipientType)
          ? facts.recipientType
          : definition?.eligibleRecipientTypes[0] ?? currentBrief.who.recipient.type
  adjustment(adjustments, "recipientType", currentBrief.who.recipient.type, recipientType, "recipient type incompatible with scope")

  const normalizedBrief: CommunicationBrief = {
    ...currentBrief,
    what: {
      ...currentBrief.what,
      scenario,
      outputKind,
      activityCategory: category ?? legacyCategory ?? currentBrief.what.activityCategory,
      scope: scope ?? currentBrief.what.scope,
      channel,
      length,
    },
    who: {
      ...currentBrief.who,
      recipient: {
        ...currentBrief.who.recipient,
        type: recipientType,
        ...(scope === "internal" ? {
          internalRole: facts.internalRole ?? currentBrief.who.recipient.internalRole,
          internalRelationship: facts.internalRelationship ?? currentBrief.who.recipient.internalRelationship,
          internalDomain: facts.internalDomain ?? currentBrief.who.recipient.internalDomain,
        } : {}),
      },
      objective,
    },
    how: { ...currentBrief.how, tone },
  }

  return {
    availableActivityCategories,
    availableScenarios: candidates.map((candidate) => candidate.id),
    availableOutputKinds: definition?.allowedOutputKinds ?? [],
    availableObjectives: definition?.allowedObjectives ?? [],
    availableChannels: definition?.allowedChannels ?? [],
    availableLengths: definition?.allowedLengths ?? [],
    availableTones: definition
      ? definition.suggestedTones.filter((candidateTone) => !definition.excludedTones.includes(candidateTone))
      : [],
    requiredReferences: unique([
      ...(definition?.requiredReferences ?? []),
      ...(definition?.requiresOffer ? ["offerRef"] : []),
    ]),
    optionalReferences: definition?.optionalReferences ?? [],
    requiredContextSources: definition?.requiredContextSources ?? [],
    optionalContextSources: definition?.optionalContextSources ?? [],
    normalizedBrief,
    fieldSources: sources,
    adjustments,
  }
}
