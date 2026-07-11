import type {
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
  CommunicationScope,
} from "@/lib/n8n/types"
import {
  createEmptySourceAvailability,
  mapAccountContextToFacts,
  mapCollaboratorContextToFacts,
  mapInternalContextToFacts,
  type CommunicationSourceAvailability,
  type LoadedCommunicationFacts,
} from "./communication-context-mappers"

export type LoadCommunicationContextInput = {
  workspaceId: string
  scope: CommunicationScope
  companyId?: string
  contactId?: string
  opportunityId?: string
  missionId?: string
  candidateId?: string
  collaboratorId?: string
  offerId?: string
  requiresOffer?: boolean
  internalRecipientName?: string
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
}

export type LoadedCommunicationContext = {
  facts: LoadedCommunicationFacts
  references: Record<string, unknown>
  sourceAvailability: CommunicationSourceAvailability
}

export type CommunicationContextRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>
}

function assertRpcSuccess<T>(result: { data: unknown; error: { message?: string } | null }, rpcName: string): T | null {
  if (result.error) {
    throw new Error(`${rpcName} failed: ${result.error.message ?? "unknown error"}`)
  }
  return (result.data ?? null) as T | null
}

function hasMeaningfulReference(value: unknown): boolean {
  if (!value) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export async function loadCommunicationContext(
  input: LoadCommunicationContextInput,
  client: CommunicationContextRpcClient,
): Promise<LoadedCommunicationContext> {
  if (input.scope === "internal") {
    const mapped = mapInternalContextToFacts({
      internalRole: input.internalRole,
      internalRelationship: input.internalRelationship,
      internalDomain: input.internalDomain,
      recipientName: input.internalRecipientName,
    })

    return {
      facts: mapped.facts,
      references: {
        internalRecipient: {
          role: input.internalRole,
          relationship: input.internalRelationship,
          domain: input.internalDomain,
          name: input.internalRecipientName,
        },
      },
      sourceAvailability: mapped.sourceAvailability,
    }
  }

  if (input.scope === "collaborator") {
    if (!input.collaboratorId) {
      return {
        facts: { scope: "collaborator", recipientType: "collaborator", hasCollaborator: false },
        references: {},
        sourceAvailability: createEmptySourceAvailability(),
      }
    }

    const result = await client.rpc("get_collaborator_communication_context", {
      p_workspace_id: input.workspaceId,
      p_collaborator_id: input.collaboratorId,
      ...(input.missionId ? { p_mission_id: input.missionId } : {}),
    })
    const collaboratorContext = assertRpcSuccess<Record<string, unknown>>(result, "get_collaborator_communication_context")
    const mapped = mapCollaboratorContextToFacts(collaboratorContext)

    return {
      facts: mapped.facts,
      references: {
        collaboratorContext,
      },
      sourceAvailability: mapped.sourceAvailability,
    }
  }

  const loadOfferContext = Boolean(input.offerId || input.requiresOffer)
  const accountPromise = client.rpc("get_communication_context", {
    p_workspace_id: input.workspaceId,
    ...(input.companyId ? { p_company_id: input.companyId } : {}),
    ...(input.contactId ? { p_contact_id: input.contactId } : {}),
    ...(input.opportunityId ? { p_opportunity_id: input.opportunityId } : {}),
    ...(input.missionId ? { p_mission_id: input.missionId } : {}),
  })
  const offerPromise = loadOfferContext
    ? client.rpc("get_pitch_context", {
      p_workspace_id: input.workspaceId,
      ...(input.companyId ? { p_company_id: input.companyId } : {}),
      ...(input.offerId ? { p_offer_id: input.offerId } : {}),
      ...(input.opportunityId ? { p_opportunity_id: input.opportunityId } : {}),
      ...(input.missionId ? { p_mission_id: input.missionId } : {}),
    })
    : Promise.resolve<{ data: unknown; error: null }>({ data: null, error: null })

  const [accountResult, offerResult] = await Promise.all([accountPromise, offerPromise])
  const accountContext = assertRpcSuccess<Record<string, unknown>>(accountResult, "get_communication_context")
  const offerContext = assertRpcSuccess<Record<string, unknown>>(offerResult, "get_pitch_context")
  const mapped = mapAccountContextToFacts(accountContext, offerContext, {
    candidateId: input.candidateId,
    offerId: input.offerId,
  })

  return {
    facts: mapped.facts,
    references: {
      accountContext,
      ...(hasMeaningfulReference(offerContext) ? { offerContext } : {}),
      ...(input.candidateId ? { candidateRef: input.candidateId } : {}),
    },
    sourceAvailability: mapped.sourceAvailability,
  }
}
