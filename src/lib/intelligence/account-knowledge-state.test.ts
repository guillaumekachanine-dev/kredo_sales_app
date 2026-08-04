import { describe, expect, it } from "vitest"

import { resolveAccountKnowledgeState } from "./account-knowledge-state"

const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"

function v1(id: string, createdAt: string) {
  return {
    id,
    created_at: createdAt,
    content_json: {
      schema_version: 1,
      identity_positioning: [{ text: "ETI industrielle", provenance: "folio_legacy" }],
      commercial_relationship: [],
      key_contacts: [{ contact_id: CONTACT, role_summary: "DSI", provenance: "relational" }],
      organisation_observed: [],
      frictions_and_signals: [],
      open_questions: [],
      generated_at: createdAt,
    },
  }
}

function v2(id: string, createdAt: string) {
  const claim = {
    text: "Agence de voyage en ligne",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.9,
    verified_at: null,
  }
  return {
    id,
    created_at: createdAt,
    content_json: {
      schema_version: 2,
      identity: {
        primary_activity: claim,
        headquarters: null,
        revenue: null,
        employee_count: null,
        dynamic: null,
      },
      account_summary: null,
      market_positioning: {
        positioning: null,
        direct_competitors: [],
        customer_segments: [],
        differentiators: [],
        uncovered_scope: [],
        claimed_identity: null,
        threats: [],
        opportunities: [],
      },
      company_value_chain: {
        description: null,
        value_proposition: null,
        key_links: [],
        dependencies: [],
        vulnerabilities: [],
        customer_base: [],
      },
      organisation: { departments: [], strategic_weight: null, key_contacts: [], process_observations: [] },
      open_questions: [],
      source_coverage: {
        displayed_claims: 1,
        sourced_claims: 1,
        coverage_rate: 1,
        missing_source_paths: [],
        stale_source_paths: [],
        contradiction_paths: [],
        passed: true,
      },
      generated_at: createdAt,
    },
  }
}

describe("resolveAccountKnowledgeState", () => {
  it("retourne le dernier V2 réussi en priorité", () => {
    // Lignes triées par created_at décroissant, comme les fournit le loader.
    const state = resolveAccountKnowledgeState([
      v2("r3", "2026-08-04T10:00:00Z"),
      v2("r2", "2026-08-01T10:00:00Z"),
      v1("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(2)
    expect(state?.resultId).toBe("r3")
    expect(state?.createdAt).toBe("2026-08-04T10:00:00Z")
  })

  it("retombe sur le dernier V1 quand aucun V2 n'existe", () => {
    const state = resolveAccountKnowledgeState([
      v1("r2", "2026-07-20T10:00:00Z"),
      v1("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(1)
    expect(state?.resultId).toBe("r2")
  })

  it("préfère un V2 même plus ancien qu'un V1 plus récent", () => {
    // Cas volontaire : la V2 est la version sourcée, elle prime sur la
    // fraîcheur d'un artefact non sourcé.
    const state = resolveAccountKnowledgeState([
      v1("r2", "2026-08-04T10:00:00Z"),
      v2("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(2)
    expect(state?.resultId).toBe("r1")
  })

  it("retourne null quand aucun artefact n'existe (état vide)", () => {
    expect(resolveAccountKnowledgeState([])).toBeNull()
  })

  it("ignore un artefact non conforme au lieu de le réparer", () => {
    const corrupted = { id: "bad", created_at: "2026-08-04T10:00:00Z", content_json: { schema_version: 2 } }

    const state = resolveAccountKnowledgeState([corrupted, v1("r1", "2026-07-07T10:00:00Z")])

    expect(state?.version).toBe(1)
    expect(state?.resultId).toBe("r1")
  })

  it("ne convertit jamais un V1 en V2", () => {
    const state = resolveAccountKnowledgeState([v1("r1", "2026-07-07T10:00:00Z")])

    expect(state?.version).toBe(1)
    expect(state && "identity" in state.data).toBe(false)
  })

  it("ignore un content_json qui n'est pas un artefact account_knowledge", () => {
    const foreign = { id: "x", created_at: "2026-08-04T10:00:00Z", content_json: { facts: { period: {} } } }

    expect(resolveAccountKnowledgeState([foreign])).toBeNull()
  })
})
