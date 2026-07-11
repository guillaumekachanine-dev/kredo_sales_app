import { describe, expect, it } from "vitest"
import {
  loadCommunicationContext,
  type CommunicationContextRpcClient,
} from "./communication-context-loader"

function createRpcClient(fixtures: Record<string, unknown>): CommunicationContextRpcClient & { calls: Array<{ fn: string; args: Record<string, unknown> }> } {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = []
  return {
    calls,
    async rpc(fn, args) {
      calls.push({ fn, args })
      return { data: fixtures[fn] ?? null, error: null }
    },
  }
}

describe("loadCommunicationContext", () => {
  it("loads account facts from general context only when offer context is optional", async () => {
    const client = createRpcClient({
      get_communication_context: {
        company: { id: "company-1", lifecycle_status: "prospect" },
        activeOpportunities: [],
        activeMissions: [],
      },
    })

    const result = await loadCommunicationContext({
      workspaceId: "workspace-1",
      scope: "account",
      companyId: "company-1",
      contactId: "contact-1",
    }, client)

    expect(result.facts).toMatchObject({ scope: "account", hasCompany: true, hasOffer: false })
    expect(client.calls.map((call) => call.fn)).toEqual(["get_communication_context"])
    expect(client.calls[0]?.args).toMatchObject({
      p_workspace_id: "workspace-1",
      p_company_id: "company-1",
      p_contact_id: "contact-1",
    })
  })

  it("loads offer context only when an offer is selected or required", async () => {
    const client = createRpcClient({
      get_communication_context: {
        company: { id: "company-1", lifecycle_status: "client_actif" },
      },
      get_pitch_context: {
        offer: { id: "offer-1" },
        anchorMission: { id: "mission-1", status: "active" },
      },
    })

    const result = await loadCommunicationContext({
      workspaceId: "workspace-1",
      scope: "account",
      companyId: "company-1",
      missionId: "mission-1",
      offerId: "offer-1",
    }, client)

    expect(client.calls.map((call) => call.fn).sort()).toEqual(["get_communication_context", "get_pitch_context"])
    expect(client.calls.find((call) => call.fn === "get_pitch_context")?.args).toMatchObject({
      p_workspace_id: "workspace-1",
      p_company_id: "company-1",
      p_mission_id: "mission-1",
      p_offer_id: "offer-1",
    })
    expect(result.facts.hasOffer).toBe(true)
    expect(result.sourceAvailability.offer).toBe(true)
  })

  it("represents a bad workspace or inaccessible account without inventing references", async () => {
    const client = createRpcClient({ get_communication_context: null })

    const result = await loadCommunicationContext({
      workspaceId: "wrong-workspace",
      scope: "account",
      companyId: "company-1",
    }, client)

    expect(result.facts).toMatchObject({
      scope: "account",
      hasCompany: false,
      hasContact: false,
      hasOpportunity: false,
      hasMission: false,
    })
    expect(Object.values(result.sourceAvailability).some(Boolean)).toBe(false)
  })

  it("loads collaborator context with current mission fallback from the collaborator RPC", async () => {
    const client = createRpcClient({
      get_collaborator_communication_context: {
        collaborator: { id: "collaborator-1", status: "active" },
        currentMission: { id: "mission-current", status: "active" },
        recentMissions: [],
        skills: [],
        recentActivity: [],
        recentAbsences: [],
      },
    })

    const result = await loadCommunicationContext({
      workspaceId: "workspace-1",
      scope: "collaborator",
      collaboratorId: "collaborator-1",
    }, client)

    expect(client.calls).toEqual([
      {
        fn: "get_collaborator_communication_context",
        args: {
          p_workspace_id: "workspace-1",
          p_collaborator_id: "collaborator-1",
        },
      },
    ])
    expect(result.facts).toMatchObject({
      scope: "collaborator",
      recipientType: "collaborator",
      hasCollaborator: true,
      hasMission: true,
    })
  })

  it("does not load Supabase sources for internal Staff context", async () => {
    const client = createRpcClient({})

    const result = await loadCommunicationContext({
      workspaceId: "workspace-1",
      scope: "internal",
      internalRole: "manager_n1",
      internalRelationship: "hierarchical_up",
      internalDomain: "commercial",
    }, client)

    expect(client.calls).toEqual([])
    expect(result.facts).toMatchObject({
      scope: "internal",
      recipientType: "internal",
      internalRole: "manager_n1",
      internalRelationship: "hierarchical_up",
      internalDomain: "commercial",
    })
  })
})
