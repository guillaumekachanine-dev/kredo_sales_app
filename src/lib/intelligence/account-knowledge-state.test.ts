import { describe, expect, it } from "vitest"

import { resolveAccountKnowledge } from "./account-knowledge-state"

const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"

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

/**
 * Artefact V3 minimal mais VALIDE : une affirmation publiée, sa vérification
 * confirmée. Volontairement autonome (comme les fixtures V1/V2 ci-dessus) —
 * une fixture partagée entre fichiers ferait passer une régression de contrat
 * inaperçue dans l'un des deux.
 */
function v3(id: string, createdAt: string) {
  const claim = {
    text: "Le groupe exploite quatre sites industriels en France.",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.9,
    verified_at: null,
    attribution: "independent",
  }
  return {
    id,
    created_at: createdAt,
    content_json: {
      schema_version: 3,
      account_summary: claim,
      identity: {
        company_name: null,
        legal_name: null,
        primary_activity: null,
        headquarters: null,
        sector: null,
        business_segment: null,
        revenue: null,
        employee_count: null,
        geographic_reach: [],
        dynamic: null,
      },
      market_positioning: {
        account_positioning: null,
        competitive_environment: null,
        direct_competitors: [],
        competitive_advantages: [],
        opportunities: [],
        threats: [],
        policy_and_ambitions: {
          purpose: null,
          philosophy: null,
          culture: [],
          public_statements: [],
          ambitions: [],
          strategic_axes: [],
          leadership_posture: [],
          claimed_identity: null,
        },
      },
      offers_and_customers: {
        core_business: null,
        offers: [],
        covered_domains: [],
        services: [],
        service_models: [],
        complementary_activities: [],
        uncovered_activities: [],
        customer_profile: null,
        customer_segments: [],
        segment_weights: [],
        behavioral_trends: [],
        unmet_needs: [],
      },
      value_chain: {
        description: null,
        value_proposition: null,
        key_links: [],
        critical_partners_or_suppliers: [],
        dependencies: [],
        vulnerabilities: [],
        end_customer_relationship: null,
      },
      regulatory_environment: {
        current_regulations: [],
        required_certifications: [],
        compliance_risks: [],
      },
      trends_and_news: { analysis: null, significant_signal_ids: [] },
      verification_results: [
        {
          claim_path: "$.account_summary",
          verdict: "confirmed",
          checked_at: createdAt,
          supporting_source_refs: [SOURCE_B],
          contradicting_source_refs: [],
          rationale: null,
        },
      ],
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

describe("resolveAccountKnowledge", () => {
  it("retourne le dernier V2 réussi en priorité", () => {
    // Lignes triées par created_at décroissant, comme les fournit le loader.
    const { state } = resolveAccountKnowledge([
      v2("r3", "2026-08-04T10:00:00Z"),
      v2("r2", "2026-08-01T10:00:00Z"),
      v1("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(2)
    expect(state?.resultId).toBe("r3")
    expect(state?.createdAt).toBe("2026-08-04T10:00:00Z")
  })

  it("retombe sur le dernier V1 quand aucun V2 n'existe", () => {
    const { state } = resolveAccountKnowledge([
      v1("r2", "2026-07-20T10:00:00Z"),
      v1("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(1)
    expect(state?.resultId).toBe("r2")
  })

  it("préfère un V2 même plus ancien qu'un V1 plus récent", () => {
    // Cas volontaire : la V2 est la version sourcée, elle prime sur la
    // fraîcheur d'un artefact non sourcé.
    const { state } = resolveAccountKnowledge([
      v1("r2", "2026-08-04T10:00:00Z"),
      v2("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(2)
    expect(state?.resultId).toBe("r1")
  })

  it("retourne null quand aucun artefact n'existe (état vide)", () => {
    expect(resolveAccountKnowledge([])).toEqual({ state: null, unreadable: [] })
  })

  it("ignore un artefact non conforme au lieu de le réparer", () => {
    const corrupted = { id: "bad", created_at: "2026-08-04T10:00:00Z", content_json: { schema_version: 2 } }

    const { state } = resolveAccountKnowledge([corrupted, v1("r1", "2026-07-07T10:00:00Z")])

    expect(state?.version).toBe(1)
    expect(state?.resultId).toBe("r1")
  })

  it("signale l'artefact illisible au lieu de le taire en retombant sur l'ancien", () => {
    const corrupted = { id: "bad", created_at: "2026-08-04T10:00:00Z", content_json: { schema_version: 3 } }

    const { state, unreadable } = resolveAccountKnowledge([corrupted, v2("r1", "2026-07-07T10:00:00Z")])

    expect(state?.resultId).toBe("r1")
    expect(unreadable).toHaveLength(1)
    expect(unreadable[0]?.resultId).toBe("bad")
    expect(unreadable[0]?.issues.length).toBeGreaterThan(0)
  })

  it("ne convertit jamais un V1 en V2", () => {
    const { state } = resolveAccountKnowledge([v1("r1", "2026-07-07T10:00:00Z")])

    expect(state?.version).toBe(1)
    expect(state && "identity" in state.data).toBe(false)
  })

  it("ignore un content_json qui n'est pas un artefact account_knowledge", () => {
    const foreign = { id: "x", created_at: "2026-08-04T10:00:00Z", content_json: { facts: { period: {} } } }

    expect(resolveAccountKnowledge([foreign]).state).toBeNull()
  })

  it("discrimine un artefact V3 sans le convertir ni le confondre avec un V2", () => {
    const { state } = resolveAccountKnowledge([v3("r1", "2026-08-05T10:00:00Z")])

    expect(state?.version).toBe(3)
    if (state?.version !== 3) throw new Error("état V3 attendu")
    // Sections propres à V3, jamais fabriquées pour ressembler à un V2.
    expect(state.data.verification_results).toHaveLength(1)
    expect(state.data.trends_and_news.significant_signal_ids).toEqual([])
    expect("company_value_chain" in state.data).toBe(false)
    expect("organisation" in state.data).toBe(false)
    expect("open_questions" in state.data).toBe(false)
  })

  it("retient le plus récent entre V2 et V3, sans rang de version", () => {
    const v3Recent = resolveAccountKnowledge([
      v3("r2", "2026-08-05T10:00:00Z"),
      v2("r1", "2026-08-01T10:00:00Z"),
    ])
    expect(v3Recent.state?.version).toBe(3)
    expect(v3Recent.state?.resultId).toBe("r2")

    // Une V2 régénérée après une V3 redevient la connaissance courante : le
    // Lot 4 n'active pas V3 par défaut, un retour au chemin V2 doit rester lisible.
    const v2Recent = resolveAccountKnowledge([
      v2("r2", "2026-08-06T10:00:00Z"),
      v3("r1", "2026-08-05T10:00:00Z"),
    ])
    expect(v2Recent.state?.version).toBe(2)
    expect(v2Recent.state?.resultId).toBe("r2")
  })

  it("laisse V1 et V2 strictement inchangés en présence d'un V3 plus ancien", () => {
    const { state } = resolveAccountKnowledge([
      v2("r3", "2026-08-04T10:00:00Z"),
      v3("r2", "2026-08-02T10:00:00Z"),
      v1("r1", "2026-07-07T10:00:00Z"),
    ])

    expect(state?.version).toBe(2)
    if (state?.version !== 2) throw new Error("état V2 attendu")
    // Aucune conversion rétroactive : le V2 ressort avec SES sections.
    expect(state.data.organisation).toBeDefined()
    expect("verification_results" in state.data).toBe(false)
  })

  it("interdit à la compilation de traiter un état V3 comme un V2", () => {
    const { state } = resolveAccountKnowledge([v3("r1", "2026-08-05T10:00:00Z")])
    if (state?.version !== 3) throw new Error("état V3 attendu")

    // @ts-expect-error — `organisation` est une section V2 : le contrat V3 ne
    // l'a pas, et rien ne doit permettre de la lire « au cas où ».
    expect(state.data.organisation).toBeUndefined()
  })
})
