import type {
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationPersona,
  CommunicationRecipientType,
  CommunicationRelation,
  CommunicationScope,
} from "@/lib/n8n/types"
import type { CommunicationContextFacts } from "./communication-options-resolver"

export type CommunicationSourceAvailabilityKey =
  | "company"
  | "contact"
  | "opportunity"
  | "mission"
  | "candidate"
  | "collaborator"
  | "offer"
  | "interactions"
  | "news"
  | "sector_analysis"
  | "documents"
  | "agenda"

export type CommunicationSourceAvailability = Record<CommunicationSourceAvailabilityKey, boolean>

export type LoadedCommunicationFacts = CommunicationContextFacts & {
  opportunityStatus?: string
  missionStatus?: string
  candidateStatus?: string
  collaboratorStatus?: string
  collaboratorAvailability?: string
  collaboratorPractice?: string
  collaboratorSeniority?: string
  hasManagerProfile?: boolean
  hasJobProfile?: boolean
  hasSkills?: boolean
}

export type AccountCommunicationContext = Record<string, unknown> | null | undefined
export type CollaboratorCommunicationContext = Record<string, unknown> | null | undefined

export type InternalContextInput = {
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
  recipientName?: string
}

export function createEmptySourceAvailability(): CommunicationSourceAvailability {
  return {
    company: false,
    contact: false,
    opportunity: false,
    mission: false,
    candidate: false,
    collaborator: false,
    offer: false,
    interactions: false,
    news: false,
    sector_analysis: false,
    documents: false,
    agenda: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function recipientTypeFromLifecycle(lifecycleStatus: unknown): CommunicationRecipientType | undefined {
  switch (lifecycleStatus) {
    case "client":
    case "client_actif":
      return "active_client"
    case "client_dormant":
    case "ancien_client":
      return "former_client"
    case "partenaire":
      return "partner"
    case "prospect":
      return "prospect"
    default:
      return undefined
  }
}

function relationFromLifecycle(lifecycleStatus: unknown): CommunicationRelation | undefined {
  switch (lifecycleStatus) {
    case "client":
    case "client_actif":
      return "active_client"
    case "client_dormant":
    case "ancien_client":
      return "former"
    case "partenaire":
      return "established"
    case "prospect":
      return "warm"
    default:
      return undefined
  }
}

function personaFromContactRole(role: unknown): CommunicationPersona | undefined {
  if (typeof role !== "string") return undefined
  const normalized = role.toLowerCase()
  if (normalized.includes("achat")) return "purchasing"
  if (normalized.includes("rh") || normalized.includes("talent")) return "hr_talent"
  if (normalized.includes("tech") || normalized.includes("dsi") || normalized.includes("cto")) return "cto_cio"
  if (normalized.includes("operation")) return "operational"
  if (normalized.includes("direction") || normalized.includes("ceo")) return "ceo"
  return "other"
}

export function mapAccountContextToFacts(
  generalContext: AccountCommunicationContext,
  offerContext?: AccountCommunicationContext,
  options: { candidateId?: string; offerId?: string } = {},
): { facts: LoadedCommunicationFacts; sourceAvailability: CommunicationSourceAvailability } {
  const general = asRecord(generalContext)
  const offer = asRecord(offerContext)
  const company = asRecord(general?.company ?? offer?.company)
  const contact = asRecord(general?.contact)
  const anchorOpportunity = asRecord(offer?.anchorOpportunity)
  const activeOpportunities = asArray(general?.activeOpportunities ?? offer?.activeOpportunities)
  const anchorMission = asRecord(offer?.anchorMission)
  const activeMissions = asArray(general?.activeMissions ?? offer?.activeMissions)
  const recentInteractions = asArray(general?.recentInteractions ?? offer?.recentInteractions)
  const sectorNews = asArray(general?.sectorNews ?? offer?.sectorNews)
  const sectorIntelligence = asRecord(general?.sectorIntelligence ?? offer?.sectorIntelligence)
  const selectedOffer = asRecord(offer?.offer)

  const facts: LoadedCommunicationFacts = {
    scope: "account",
    ...(recipientTypeFromLifecycle(company?.lifecycle_status) ? { recipientType: recipientTypeFromLifecycle(company?.lifecycle_status) } : {}),
    ...(asNonEmptyString(company?.lifecycle_status) ? { accountLifecycle: asNonEmptyString(company?.lifecycle_status) } : {}),
    ...(personaFromContactRole(contact?.relationship_role) ? { persona: personaFromContactRole(contact?.relationship_role) } : {}),
    ...(relationFromLifecycle(company?.lifecycle_status) ? { relation: relationFromLifecycle(company?.lifecycle_status) } : {}),
    hasCompany: Boolean(company),
    hasContact: Boolean(contact),
    hasOpportunity: Boolean(anchorOpportunity) || activeOpportunities.length > 0,
    hasMission: Boolean(anchorMission) || activeMissions.length > 0,
    hasCandidate: Boolean(options.candidateId),
    hasOffer: Boolean(selectedOffer) || Boolean(options.offerId),
    ...(asNonEmptyString(anchorOpportunity?.stage ?? asRecord(activeOpportunities[0])?.stage)
      ? { opportunityStatus: asNonEmptyString(anchorOpportunity?.stage ?? asRecord(activeOpportunities[0])?.stage) }
      : {}),
    ...(asNonEmptyString(anchorMission?.status ?? asRecord(activeMissions[0])?.status)
      ? { missionStatus: asNonEmptyString(anchorMission?.status ?? asRecord(activeMissions[0])?.status) }
      : {}),
  }

  return {
    facts,
    sourceAvailability: {
      ...createEmptySourceAvailability(),
      company: Boolean(company),
      contact: Boolean(contact),
      opportunity: facts.hasOpportunity === true,
      mission: facts.hasMission === true,
      candidate: Boolean(options.candidateId),
      offer: facts.hasOffer === true,
      interactions: recentInteractions.length > 0,
      news: sectorNews.length > 0,
      sector_analysis: Boolean(sectorIntelligence),
    },
  }
}

export function mapCollaboratorContextToFacts(
  context: CollaboratorCommunicationContext,
): { facts: LoadedCommunicationFacts; sourceAvailability: CommunicationSourceAvailability } {
  const ctx = asRecord(context)
  const collaborator = asRecord(ctx?.collaborator)
  const currentMission = asRecord(ctx?.currentMission)
  const recentMissions = asArray(ctx?.recentMissions)
  const managerProfile = asRecord(ctx?.managerProfile)
  const jobProfile = asRecord(ctx?.jobProfile)
  const skills = asArray(ctx?.skills)
  const recentActivity = asArray(ctx?.recentActivity)
  const recentAbsences = asArray(ctx?.recentAbsences)

  return {
    facts: {
      scope: "collaborator",
      recipientType: "collaborator",
      hasCollaborator: Boolean(collaborator),
      hasMission: Boolean(currentMission),
      collaboratorStatus: asNonEmptyString(collaborator?.status),
      collaboratorAvailability: asNonEmptyString(collaborator?.availability),
      collaboratorPractice: asNonEmptyString(collaborator?.practice),
      collaboratorSeniority: asNonEmptyString(collaborator?.seniority),
      hasManagerProfile: Boolean(managerProfile),
      hasJobProfile: Boolean(jobProfile),
      hasSkills: skills.length > 0,
      ...(asNonEmptyString(currentMission?.status) ? { missionStatus: asNonEmptyString(currentMission?.status) } : {}),
    },
    sourceAvailability: {
      ...createEmptySourceAvailability(),
      collaborator: Boolean(collaborator),
      mission: Boolean(currentMission) || recentMissions.length > 0,
      agenda: recentActivity.length > 0 || recentAbsences.length > 0,
    },
  }
}

export function mapInternalContextToFacts(
  input: InternalContextInput,
): { facts: LoadedCommunicationFacts; sourceAvailability: CommunicationSourceAvailability } {
  return {
    facts: {
      scope: "internal" satisfies CommunicationScope,
      recipientType: "internal",
      ...(input.internalRole ? { internalRole: input.internalRole } : {}),
      ...(input.internalRelationship ? { internalRelationship: input.internalRelationship } : {}),
      ...(input.internalDomain ? { internalDomain: input.internalDomain } : {}),
    },
    sourceAvailability: createEmptySourceAvailability(),
  }
}
