import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationOutputKind,
  CommunicationScenario,
} from "@/lib/n8n/types"
import {
  ACTIVITY_CATEGORY_OPTIONS,
  getScenarioDefinition,
  SCENARIO_REGISTRY,
  type ActivityCategory,
  type ScenarioRegistryItem,
} from "./communication-scenario-registry"
import {
  resolveCommunicationOptions,
  type CommunicationAdjustment,
  type CommunicationContextFacts,
  type CommunicationResolution,
} from "./communication-options-resolver"

export type CommunicationPurpose = CommunicationOutputKind
export type LegacyCommunicationPurpose = "mail" | "pitch"
export type CommunicationPurposeNavigationVariant = "desktop" | "mobile"

export type CommunicationPurposeOption = {
  value: CommunicationPurpose
  label: string
  shortLabel: string
  subtitle: string
}

export type CommunicationPurposeNavigationItem = CommunicationPurposeOption & {
  minTouchTargetPx: number
}

export type CommunicationPurposeGroup = {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
  scenarios: ScenarioRegistryItem[]
}

export type ApplyCommunicationPurposeResult = {
  brief: CommunicationBrief
  resolution: CommunicationResolution
  adjustments: CommunicationAdjustment[]
}

const PURPOSE_OPTIONS: CommunicationPurposeOption[] = [
  {
    value: "written_message",
    label: "Rédiger un mail",
    shortLabel: "Mail",
    subtitle: "message prêt à relire",
  },
  {
    value: "spoken_pitch",
    label: "Élaborer un pitch",
    shortLabel: "Pitch",
    subtitle: "discours oral structuré",
  },
  {
    value: "structured_briefing",
    label: "Préparer un RDV",
    shortLabel: "RDV",
    subtitle: "fiche d'arguments et posture",
  },
]

const DEFAULT_SCENARIOS_BY_PURPOSE: Record<CommunicationPurpose, CommunicationScenario> = {
  written_message: "signal_outreach",
  spoken_pitch: "signal_based_pitch",
  structured_briefing: "meeting_prep_discovery",
}

const CHANNELS_BY_PURPOSE: Record<CommunicationPurpose, CommunicationChannel[]> = {
  written_message: ["email", "linkedin_invitation", "linkedin_message", "internal_note"],
  spoken_pitch: ["spoken_pitch_30s"],
  structured_briefing: ["meeting_briefing"],
}

export function getCommunicationPurposeOptions(): CommunicationPurposeOption[] {
  return PURPOSE_OPTIONS
}

export function getCommunicationPurposeOption(outputKind: CommunicationPurpose): CommunicationPurposeOption {
  return PURPOSE_OPTIONS.find((option) => option.value === outputKind) ?? PURPOSE_OPTIONS[0]
}

export function getCommunicationPurposeNavigationItems(
  variant: CommunicationPurposeNavigationVariant,
): CommunicationPurposeNavigationItem[] {
  const minTouchTargetPx = variant === "mobile" ? 44 : 32
  return PURPOSE_OPTIONS.map((option) => ({ ...option, minTouchTargetPx }))
}

export function normalizeCommunicationPurpose(
  value: unknown,
  channel?: CommunicationChannel,
): CommunicationPurpose | undefined {
  if (value === "written_message" || value === "spoken_pitch" || value === "structured_briefing") return value
  if (value === "mail") return "written_message"
  if (value === "pitch") return channel === "meeting_briefing" ? "structured_briefing" : "spoken_pitch"
  return undefined
}

export function getOutputKindFromComposerPreset(preset?: {
  outputKind?: unknown
  channel?: CommunicationChannel
  scenario?: CommunicationScenario
} | null): CommunicationPurpose {
  const explicit = normalizeCommunicationPurpose(preset?.outputKind, preset?.channel)
  if (explicit) return explicit

  if (preset?.channel === "spoken_pitch_30s") return "spoken_pitch"
  if (preset?.channel === "meeting_briefing") return "structured_briefing"

  const scenario = preset?.scenario ? getScenarioDefinition(preset.scenario) : undefined
  return scenario?.defaultOutputKind ?? "written_message"
}

export function isChannelCompatibleWithPurpose(
  channel: CommunicationChannel,
  outputKind: CommunicationPurpose,
): boolean {
  return CHANNELS_BY_PURPOSE[outputKind].includes(channel)
}

export function defaultChannelForPurpose(outputKind: CommunicationPurpose): CommunicationChannel {
  return CHANNELS_BY_PURPOSE[outputKind][0]
}

export function getScenarioPurposeGroups(outputKind: CommunicationPurpose): CommunicationPurposeGroup[] {
  return ACTIVITY_CATEGORY_OPTIONS.map((category) => ({
    ...category,
    scenarios: SCENARIO_REGISTRY.filter((scenario) =>
      scenario.activityCategory === category.value &&
      scenario.allowedOutputKinds.includes(outputKind),
    ),
  })).filter((group) => group.scenarios.length > 0)
}

function inferFactsFromBrief(brief: CommunicationBrief): CommunicationContextFacts {
  return {
    scope: brief.what.scope,
    recipientType: brief.who.recipient.type,
    persona: brief.who.recipient.persona,
    relation: brief.who.recipient.relation,
    internalRole: brief.who.recipient.internalRole,
    internalRelationship: brief.who.recipient.internalRelationship,
    internalDomain: brief.who.recipient.internalDomain,
    hasCompany: brief.what.scope === "account" ? Boolean(brief.who.recipient.companyName) || Boolean(brief.who.recipient.contactId) : undefined,
    hasContact: Boolean(brief.who.recipient.contactId),
    hasOpportunity: Boolean(brief.context.opportunityRef),
    hasMission: Boolean(brief.context.missionRef),
    hasCandidate: Boolean(brief.context.profileRef),
    hasCollaborator: brief.what.scope === "collaborator" ? Boolean(brief.context.collaboratorRef || brief.who.recipient.collaboratorId) : undefined,
    hasOffer: Boolean(brief.context.offerRef),
  }
}

function chooseScenarioForPurpose(
  currentBrief: CommunicationBrief,
  outputKind: CommunicationPurpose,
  availableScenarios: CommunicationScenario[],
): CommunicationScenario {
  const currentDefinition = getScenarioDefinition(currentBrief.what.scenario)
  if (
    currentDefinition &&
    currentDefinition.allowedOutputKinds.includes(outputKind) &&
    availableScenarios.includes(currentDefinition.id)
  ) {
    return currentDefinition.id
  }

  const preferred = DEFAULT_SCENARIOS_BY_PURPOSE[outputKind]
  if (availableScenarios.includes(preferred)) return preferred

  const compatible = availableScenarios.find((scenarioId) =>
    getScenarioDefinition(scenarioId)?.allowedOutputKinds.includes(outputKind),
  )
  if (compatible) return compatible

  return preferred
}

export function applyCommunicationPurposeToBrief(
  currentBrief: CommunicationBrief,
  outputKind: CommunicationPurpose,
  facts: CommunicationContextFacts = inferFactsFromBrief(currentBrief),
): ApplyCommunicationPurposeResult {
  const baseResolution = resolveCommunicationOptions(facts, currentBrief)
  const nextScenarioId = chooseScenarioForPurpose(
    baseResolution.normalizedBrief,
    outputKind,
    baseResolution.availableScenarios,
  )
  const nextScenario = getScenarioDefinition(nextScenarioId)
  const nextChannel = isChannelCompatibleWithPurpose(baseResolution.normalizedBrief.what.channel, outputKind)
    ? baseResolution.normalizedBrief.what.channel
    : defaultChannelForPurpose(outputKind)

  const draft: CommunicationBrief = {
    ...baseResolution.normalizedBrief,
    what: {
      ...baseResolution.normalizedBrief.what,
      scenario: nextScenarioId,
      outputKind,
      channel: nextChannel,
      activityCategory: nextScenario?.activityCategory ?? baseResolution.normalizedBrief.what.activityCategory,
    },
    who: {
      ...baseResolution.normalizedBrief.who,
      objective: nextScenario?.allowedObjectives.includes(baseResolution.normalizedBrief.who.objective)
        ? baseResolution.normalizedBrief.who.objective
        : nextScenario?.defaultObjective ?? baseResolution.normalizedBrief.who.objective,
    },
    context: {
      ...baseResolution.normalizedBrief.context,
      ...(outputKind === "written_message" ? { offerRef: undefined } : {}),
    },
  }

  const resolution = resolveCommunicationOptions(facts, draft)
  const adjustments = [
    ...baseResolution.adjustments,
    ...resolution.adjustments,
  ].filter((adjustment, index, all) =>
    all.findIndex((item) =>
      item.field === adjustment.field &&
      item.previousValue === adjustment.previousValue &&
      item.nextValue === adjustment.nextValue &&
      item.reason === adjustment.reason,
    ) === index,
  )

  return {
    brief: resolution.normalizedBrief,
    resolution,
    adjustments,
  }
}
