import { CHANNEL_OPTIONS, OBJECTIVE_OPTIONS, buildDefaultBrief } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import { purgeIncompatibleReferences } from "@/lib/communication/communication-brief-form-model"
import { resolveCommunicationOptions } from "@/lib/communication/communication-options-resolver"
import { isChannelCompatibleWithPurpose } from "@/lib/communication/communication-purpose"
import { getScenarioRegistryItem, SCENARIO_REGISTRY, type ActivityCategory } from "@/lib/communication/communication-scenario-registry"
import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationObjective,
  CommunicationOutputKind,
  CommunicationScenario,
} from "@/lib/n8n/types"

export type NeutralFamilyGroup = {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
}

export const NEUTRAL_LAUNCH_FAMILIES: NeutralFamilyGroup[] = [
  { value: "commerce_prospection", label: "Prospection", dataviz: 1 },
  { value: "commerce_actif", label: "Client actif", dataviz: 2 },
  { value: "recrutement", label: "Recrutement", dataviz: 4 },
  { value: "delivery", label: "Delivery", dataviz: 3 },
  { value: "management_consultants", label: "Management", dataviz: 5 },
  { value: "internal_staff", label: "Interne", dataviz: 6 },
]

export type NeutralObjectiveOption = {
  value: CommunicationObjective
  label: string
  suggested: boolean
}

export function getNeutralObjectiveOptions(scenario: CommunicationScenario | undefined): NeutralObjectiveOption[] {
  const scenarioItem = scenario ? getScenarioRegistryItem(scenario) : undefined
  if (!scenarioItem) return []

  const list = OBJECTIVE_OPTIONS.filter((option) => scenarioItem.allowedObjectives.includes(option.value))
  const suggested = list.find((option) => option.value === scenarioItem.defaultObjective)
  const rest = list.filter((option) => option.value !== scenarioItem.defaultObjective)

  return [
    ...(suggested ? [{ ...suggested, suggested: true }] : []),
    ...rest.map((option) => ({ ...option, suggested: false })),
  ]
}

export function getNeutralSecondaryChannelOptions(
  scenario: CommunicationScenario | undefined,
  outputKind: CommunicationOutputKind | null,
): typeof CHANNEL_OPTIONS {
  const scenarioItem = scenario ? getScenarioRegistryItem(scenario) : undefined
  if (!scenarioItem || !outputKind) return []

  return CHANNEL_OPTIONS.filter((option) =>
    scenarioItem.allowedChannels.includes(option.value) &&
    isChannelCompatibleWithPurpose(option.value, outputKind),
  )
}

export function getNeutralScenariosByFamily(category: ActivityCategory) {
  return SCENARIO_REGISTRY.filter((scenario) => scenario.activityCategory === category)
}

export function buildNeutralCommunicationBrief({
  activityCategory,
  scenario,
  objective,
  outputKind,
  channel,
}: {
  activityCategory: ActivityCategory
  scenario: CommunicationScenario
  objective: CommunicationObjective
  outputKind: CommunicationOutputKind
  channel: CommunicationChannel
}): CommunicationBrief {
  const scenarioItem = getScenarioRegistryItem(scenario)
  if (!scenarioItem) {
    throw new Error(`Unknown communication scenario: ${scenario}`)
  }
  if (scenarioItem.activityCategory !== activityCategory) {
    throw new Error(`Scenario ${scenario} is not part of ${activityCategory}`)
  }
  if (!scenarioItem.allowedObjectives.includes(objective)) {
    throw new Error(`Objective ${objective} is not available for ${scenario}`)
  }
  if (!scenarioItem.allowedOutputKinds.includes(outputKind)) {
    throw new Error(`Output kind ${outputKind} is not available for ${scenario}`)
  }
  if (!scenarioItem.allowedChannels.includes(channel) || !isChannelCompatibleWithPurpose(channel, outputKind)) {
    throw new Error(`Channel ${channel} is not available for ${scenario} and ${outputKind}`)
  }

  const scope = scenarioItem.requiredScopes[0] ?? "account"
  const defaultBrief = buildDefaultBrief({ scope }, "")
  const draft: CommunicationBrief = {
    ...defaultBrief,
    what: {
      ...defaultBrief.what,
      scope,
      activityCategory,
      scenario,
      outputKind,
      channel,
    },
    who: {
      ...defaultBrief.who,
      objective,
    },
  }

  const resolution = resolveCommunicationOptions({ scope }, draft, {
    activityCategory: "user",
    scenario: "user",
    objective: "user",
    outputKind: "user",
    channel: "user",
    scope: "user",
  })
  const purged = purgeIncompatibleReferences(resolution.normalizedBrief, resolution).brief

  if (
    purged.what.activityCategory !== activityCategory ||
    purged.what.scenario !== scenario ||
    purged.who.objective !== objective ||
    purged.what.outputKind !== outputKind ||
    purged.what.channel !== channel
  ) {
    throw new Error("Neutral communication launch resolved to an incompatible brief")
  }

  return purged
}
