import type {
  CanonicalCommunicationActivityCategory,
  CommunicationBrief,
  CommunicationOutputKind,
  CommunicationRecipientType,
  CommunicationScenario,
  CommunicationScope,
} from "@/lib/n8n/types"
import type {
  CommunicationComposerPrimaryEntity,
  CommunicationComposerRequest,
} from "@/lib/communication/communication-composer"
import {
  getScenarioDefinition,
  SCENARIO_REGISTRY,
} from "@/lib/communication/communication-scenario-registry"
import {
  resolveCommunicationOptions,
  type CommunicationContextFacts,
} from "@/lib/communication/communication-options-resolver"

export type CommunicationEntryIntent =
  | "signal_outreach"
  | "prospection_follow_up"
  | "discovery_preparation"
  | "proposal_follow_up"
  | "proposal_defense"
  | "price_objection"
  | "mission_renewal"
  | "sector_rebound"
  | "sector_persona_preparation"
  | "delivery_risk_message"
  | "delivery_risk_briefing"
  | "milestone_validation"
  | "steering_committee"
  | "candidate_contact"
  | "candidate_interview"
  | "candidate_availability"
  | "candidate_feedback"
  | "candidate_closing"
  | "candidate_mobility_salary"
  | "candidate_to_client"
  | "atypical_candidate_defense"
  | "opportunity_to_candidate"
  | "recruiter_preparation"

export type CommunicationEntryEntityKind =
  | "company"
  | "contact"
  | "opportunity"
  | "mission"
  | "candidate"
  | "offer"
  | "signal"
  | "sector"

export type CommunicationEntryIntentDefinition = {
  label: string
  activityCategory: CanonicalCommunicationActivityCategory
  scope: CommunicationScope
  scenario: CommunicationScenario
  outputKind: CommunicationOutputKind
  requiredEntityKinds: CommunicationEntryEntityKind[]
  optionalReferenceKinds: CommunicationEntryEntityKind[]
}

export type CommunicationEntryContext = {
  companyId?: string | null
  companyName?: string | null
  contactId?: string | null
  contactName?: string | null
  opportunityId?: string | null
  opportunityTitle?: string | null
  missionId?: string | null
  missionTitle?: string | null
  candidateId?: string | null
  candidateName?: string | null
  offerId?: string | null
  signalId?: string | null
  sectorId?: string | null
  sectorName?: string | null
  recipientType?: CommunicationRecipientType
  mustInclude?: string | null
  origin?: CommunicationComposerRequest["origin"]
}

export type CommunicationEntryPresetResult =
  | {
    ok: true
    definition: CommunicationEntryIntentDefinition
    brief: CommunicationBrief
    request: CommunicationComposerRequest
  }
  | {
    ok: false
    definition: CommunicationEntryIntentDefinition
    error: string
    missingEntityKinds: CommunicationEntryEntityKind[]
  }

export const COMMUNICATION_ENTRY_INTENTS = {
  signal_outreach: {
    label: "Contacter sur ce signal",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "signal_outreach",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "signal", "sector"],
  },
  prospection_follow_up: {
    label: "Relancer",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "follow_up_no_reply",
    outputKind: "written_message",
    requiredEntityKinds: ["company"],
    optionalReferenceKinds: ["contact", "signal"],
  },
  discovery_preparation: {
    label: "Préparer la découverte",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "meeting_prep_discovery",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company"],
    optionalReferenceKinds: ["contact", "opportunity", "signal"],
  },
  proposal_follow_up: {
    label: "Relancer la proposition",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "proposal_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  proposal_defense: {
    label: "Préparer la soutenance",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "proposal_defense_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  price_objection: {
    label: "Répondre à l’objection prix",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "price_objection_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["company", "opportunity"],
    optionalReferenceKinds: ["contact", "offer"],
  },
  mission_renewal: {
    label: "Préparer le renouvellement",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "mission_renewal",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity", "offer"],
  },
  sector_rebound: {
    label: "Rebondir sur le secteur",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "sector_rebound",
    outputKind: "written_message",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "sector", "signal"],
  },
  sector_persona_preparation: {
    label: "Préparer le pitch persona",
    activityCategory: "commerce_prospection",
    scope: "account",
    scenario: "sector_persona_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: [],
    optionalReferenceKinds: ["company", "contact", "sector"],
  },
  delivery_risk_message: {
    label: "Communiquer sur le risque",
    activityCategory: "delivery",
    scope: "account",
    scenario: "risk_communication",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  delivery_risk_briefing: {
    label: "Préparer l’escalade",
    activityCategory: "delivery",
    scope: "account",
    scenario: "escalation_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  milestone_validation: {
    label: "Valider un jalon",
    activityCategory: "delivery",
    scope: "account",
    scenario: "milestone_validation_request",
    outputKind: "written_message",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  steering_committee: {
    label: "Préparer le COPIL",
    activityCategory: "commerce_actif",
    scope: "account",
    scenario: "tense_copil_briefing",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "mission"],
    optionalReferenceKinds: ["contact", "opportunity"],
  },
  candidate_contact: {
    label: "Contacter le candidat",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_follow_up",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_interview: {
    label: "Inviter à l’entretien",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_interview_invitation",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_availability: {
    label: "Vérifier la disponibilité",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_availability_check",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_feedback: {
    label: "Envoyer le feedback",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_post_interview_feedback",
    outputKind: "written_message",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_closing: {
    label: "Préparer le closing",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_closing_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_mobility_salary: {
    label: "Préparer mobilité et salaire",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "mobility_salary_pitch",
    outputKind: "spoken_pitch",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
  candidate_to_client: {
    label: "Présenter au client",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "candidate_to_client_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "candidate", "opportunity"],
    optionalReferenceKinds: ["contact"],
  },
  atypical_candidate_defense: {
    label: "Défendre un profil atypique",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "atypical_candidate_defense",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["company", "candidate", "opportunity"],
    optionalReferenceKinds: ["contact"],
  },
  opportunity_to_candidate: {
    label: "Présenter le besoin",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "opportunity_to_candidate_pitch",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["candidate", "opportunity"],
    optionalReferenceKinds: ["company"],
  },
  recruiter_preparation: {
    label: "Préparer l’entretien",
    activityCategory: "recrutement",
    scope: "account",
    scenario: "recruiter_briefing_pre_interview",
    outputKind: "structured_briefing",
    requiredEntityKinds: ["candidate"],
    optionalReferenceKinds: ["opportunity", "company"],
  },
} satisfies Record<CommunicationEntryIntent, CommunicationEntryIntentDefinition>

function hasEntity(kind: CommunicationEntryEntityKind, context: CommunicationEntryContext) {
  switch (kind) {
    case "company":
      return Boolean(context.companyId || context.companyName)
    case "contact":
      return Boolean(context.contactId)
    case "opportunity":
      return Boolean(context.opportunityId)
    case "mission":
      return Boolean(context.missionId)
    case "candidate":
      return Boolean(context.candidateId)
    case "offer":
      return Boolean(context.offerId)
    case "signal":
      return Boolean(context.signalId)
    case "sector":
      return Boolean(context.sectorId || context.sectorName)
  }
}

function entityLabel(kind: CommunicationEntryEntityKind) {
  switch (kind) {
    case "company":
      return "compte"
    case "contact":
      return "contact"
    case "opportunity":
      return "opportunité"
    case "mission":
      return "mission"
    case "candidate":
      return "candidat"
    case "offer":
      return "offre"
    case "signal":
      return "signal"
    case "sector":
      return "secteur"
  }
}

function buildContextReferences(context: CommunicationEntryContext): Partial<CommunicationBrief["context"]> {
  return {
    ...(context.companyId ? { companyRef: context.companyId } : {}),
    ...(context.opportunityId ? { opportunityRef: context.opportunityId } : {}),
    ...(context.missionId ? { missionRef: context.missionId } : {}),
    ...(context.candidateId ? { profileRef: context.candidateId } : {}),
    ...(context.offerId ? { offerRef: context.offerId } : {}),
    ...(context.signalId ? { signalRef: context.signalId } : {}),
  }
}

function buildPrimaryEntity(context: CommunicationEntryContext): CommunicationComposerPrimaryEntity | null {
  if (context.missionId) return { type: "mission", id: context.missionId }
  if (context.opportunityId) return { type: "opportunity", id: context.opportunityId }
  if (context.candidateId) return { type: "candidate", id: context.candidateId }
  if (context.companyId) return { type: "company", id: context.companyId }
  if (context.sectorId) return { type: "sector", id: context.sectorId }
  return null
}

function buildMustInclude(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext) {
  const lines = [
    context.companyName ? `Compte : ${context.companyName}` : null,
    context.contactName ? `Contact : ${context.contactName}` : null,
    context.opportunityTitle ? `Opportunité : ${context.opportunityTitle}` : null,
    context.missionTitle ? `Mission : ${context.missionTitle}` : null,
    context.candidateName ? `Candidat : ${context.candidateName}` : null,
    context.sectorName ? `Secteur : ${context.sectorName}` : null,
    context.mustInclude,
  ].filter(Boolean)

  if (lines.length === 0) return undefined
  return [
    `[POINT_ENTREE_CONTEXT]\nIntention : ${definition.label}`,
    ...lines,
  ].join("\n")
}

function buildBrief(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext): CommunicationBrief {
  const scenario = getScenarioDefinition(definition.scenario)
  const recipientType = context.recipientType ??
    (definition.activityCategory === "recrutement" && (
      definition.scenario === "candidate_to_client_pitch" ||
      definition.scenario === "atypical_candidate_defense"
    ) ? "active_client" : definition.activityCategory === "recrutement" ? "candidate" : "prospect")

  return {
    what: {
      scenario: definition.scenario,
      outputKind: definition.outputKind,
      activityCategory: definition.activityCategory,
      scope: definition.scope,
      channel: scenario?.defaultChannel ?? (definition.outputKind === "structured_briefing" ? "meeting_briefing" : "email"),
      length: "standard",
    },
    who: {
      sender: {
        role: "business_manager",
        name: "",
      },
      recipient: {
        type: recipientType,
        persona: "other",
        relation: definition.activityCategory === "commerce_actif" || definition.activityCategory === "delivery" ? "active_client" : "unknown",
        contactId: context.contactId ?? undefined,
        displayName: context.contactName ?? context.candidateName ?? undefined,
        companyName: context.companyName ?? undefined,
      },
      objective: scenario?.defaultObjective ?? "get_meeting",
    },
    how: {
      tone: scenario?.suggestedTones[0] ?? "direct",
      formality: "vous",
      language: "fr",
    },
    context: {
      ...buildContextReferences(context),
      mustInclude: buildMustInclude(definition, context),
    },
  }
}

function buildFacts(definition: CommunicationEntryIntentDefinition, context: CommunicationEntryContext): CommunicationContextFacts {
  return {
    scope: definition.scope,
    recipientType: context.recipientType,
    hasCompany: hasEntity("company", context),
    hasContact: hasEntity("contact", context),
    hasOpportunity: hasEntity("opportunity", context),
    hasMission: hasEntity("mission", context),
    hasCandidate: hasEntity("candidate", context),
    hasOffer: hasEntity("offer", context),
  }
}

export function buildCommunicationEntryPreset(
  intent: CommunicationEntryIntent,
  context: CommunicationEntryContext = {},
): CommunicationEntryPresetResult {
  const definition = COMMUNICATION_ENTRY_INTENTS[intent]
  const missingEntityKinds = definition.requiredEntityKinds.filter((kind) => !hasEntity(kind, context))
  if (missingEntityKinds.length > 0) {
    return {
      ok: false,
      definition,
      missingEntityKinds,
      error: `Contexte insuffisant : ${missingEntityKinds.map(entityLabel).join(", ")} requis.`,
    }
  }

  const scenario = getScenarioDefinition(definition.scenario)
  if (!scenario) {
    return {
      ok: false,
      definition,
      missingEntityKinds: [],
      error: `Scénario ${definition.scenario} absent de la registry.`,
    }
  }

  const draft = buildBrief(definition, context)
  const resolution = resolveCommunicationOptions(buildFacts(definition, context), draft)
  const brief = resolution.normalizedBrief

  if (brief.what.scenario !== definition.scenario) {
    return {
      ok: false,
      definition,
      missingEntityKinds: [],
      error: `Le scénario ${definition.scenario} est incompatible avec le contexte fourni.`,
    }
  }

  const contextReferences = buildContextReferences(context)
  return {
    ok: true,
    definition,
    brief,
    request: {
      origin: context.origin ?? "global",
      scope: definition.scope,
      companyId: context.companyId ?? null,
      companyName: context.companyName ?? null,
      contactId: context.contactId ?? null,
      primaryEntity: buildPrimaryEntity(context),
      selectedOutputKind: brief.what.outputKind,
      initialBrief: brief,
      contextReferences,
      preset: {
        scenario: brief.what.scenario,
        outputKind: brief.what.outputKind,
        activityCategory: definition.activityCategory,
        channel: brief.what.channel,
        objective: brief.who.objective,
        length: brief.what.length,
        tone: brief.how.tone,
        contactId: context.contactId ?? undefined,
        refs: contextReferences,
        mustInclude: brief.context.mustInclude,
      },
    },
  }
}

export function assertCommunicationEntryRegistryIntegrity() {
  for (const [intent, definition] of Object.entries(COMMUNICATION_ENTRY_INTENTS)) {
    const scenario = SCENARIO_REGISTRY.find((item) => item.value === definition.scenario)
    if (!scenario) throw new Error(`${intent}: scenario ${definition.scenario} is not registered`)
    if (scenario.activityCategory !== definition.activityCategory) {
      throw new Error(`${intent}: activity category mismatch`)
    }
    if (!scenario.requiredScopes.includes(definition.scope)) {
      throw new Error(`${intent}: scope ${definition.scope} is not allowed`)
    }
    if (!scenario.allowedOutputKinds.includes(definition.outputKind)) {
      throw new Error(`${intent}: output kind ${definition.outputKind} is not allowed`)
    }
  }
}
