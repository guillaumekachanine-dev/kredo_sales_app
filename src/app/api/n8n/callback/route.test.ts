// ─── Callback n8n → persistance : portail account_knowledge (Lot 4) ─────────
// Ce que ces tests protègent, et qu'aucun test unitaire d'ingestion ne couvre :
// le CHAÎNAGE de la route. Un artefact refusé doit faire basculer le run en
// `failed` ET ne rien écrire ; un artefact accepté doit être persisté sous sa
// forme NORMALISÉE (pas celle reçue de n8n) ; rejouer le même callback doit
// rester sans danger.
//
// Le client Supabase est un faux qui échoue bruyamment sur toute table
// inattendue : une écriture dans `companies` ferait échouer le test au lieu de
// passer inaperçue.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/** Signatures réelles des dépendances de la route — typées pour que les
 *  assertions sur `mock.calls` portent sur des arguments nommés, pas sur `any`. */
type PersistedPayload = { phase: number; contentJson: Record<string, unknown> }
type SaveResultArgs = [string, string | null, string, string, PersistedPayload]
type UpdateRunStatusArgs = [string, string, { phase?: number; errorMessage?: string }?]

const verifyHmac = vi.fn(() => true)
const saveResult = vi.fn<(...args: SaveResultArgs) => Promise<string>>(async () => "result-1")
const updateRunStatus = vi.fn<(...args: UpdateRunStatusArgs) => Promise<void>>(async () => undefined)
const updateRunN8nIds = vi.fn(async () => undefined)
const materializeAccountIssues = vi.fn(async () => ({ success: true as const }))
const saveResultAsDocumentWithSupabaseClient = vi.fn(async () => ({ success: true as const }))

vi.mock("@/lib/n8n/hmac", () => ({ verifyHmac: () => verifyHmac() }))
vi.mock("@/lib/n8n/runs", () => ({
  saveResult: (...args: SaveResultArgs) => saveResult(...args),
  updateRunStatus: (...args: UpdateRunStatusArgs) => updateRunStatus(...args),
  updateRunN8nIds: (...args: unknown[]) => updateRunN8nIds(...(args as [])),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/intelligence/materialize-account-issues", () => ({
  materializeAccountIssues: (...args: unknown[]) => materializeAccountIssues(...(args as [])),
}))
vi.mock("@/components/accounts-contacts/intelligence/save-as-document", () => ({
  saveResultAsDocumentWithSupabaseClient: (...args: unknown[]) =>
    saveResultAsDocumentWithSupabaseClient(...(args as [])),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeSupabase }))

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const OWNER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"
const SIGNAL_A = "a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1"
const SIGNAL_UNKNOWN = "a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4"

const KNOWN_SOURCES = [SOURCE_A, SOURCE_B]
const KNOWN_SIGNALS = [{ id: SIGNAL_A, workspace_id: WORKSPACE, company_id: COMPANY }]

/** Instant de référence des tests — l'horloge n'est jamais laissée au hasard. */
const NOW = new Date("2026-08-05T12:00:00.000Z")

/** Signal réel du compte : alimente le calcul déterministe de `identity.dynamic`. */
const DYNAMIC_SIGNALS = [
  {
    primary_source_id: SOURCE_A,
    detected_at: "2026-07-26T00:00:00.000Z",
    relevance_score: 0.8,
    urgency_score: 0.4,
    confidence_score: 1,
    status: "new",
    expires_at: null,
  },
]

const fakeSupabase = {
  from(table: string) {
    if (table === "ai_intelligence_runs") {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: async () => ({
          data: {
            company_id: COMPANY,
            workspace_id: WORKSPACE,
            owner_id: OWNER,
            trigger_source: "manual",
          },
          error: null,
        }),
      }
      return builder
    }

    if (table === "intelligence_sources") {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: (_column: string, values: string[]) => ({
          data: values.filter((id) => KNOWN_SOURCES.includes(id)).map((id) => ({ id })),
          error: null,
        }),
      }
      return builder
    }

    if (table === "account_signals") {
      const filters: Record<string, string> = {}
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters[column] = value
          return builder
        },
        not: () => ({ data: DYNAMIC_SIGNALS, error: null }),
        in: (_column: string, values: string[]) => ({
          data: KNOWN_SIGNALS.filter(
            (row) =>
              values.includes(row.id) &&
              row.workspace_id === filters.workspace_id &&
              row.company_id === filters.company_id,
          ).map((row) => ({ id: row.id })),
          error: null,
        }),
      }
      return builder
    }

    throw new Error(`Table inattendue interrogée par le callback : ${table}`)
  },
}

const { POST } = await import("./route")

function v3Claim(overrides: Record<string, unknown> = {}) {
  return {
    text: "Le groupe exploite quatre sites industriels en France.",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.85,
    verified_at: null,
    attribution: "independent",
    ...overrides,
  }
}

function artifactV3(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 3,
    account_summary: null,
    identity: {
      company_name: null,
      legal_name: null,
      primary_activity: v3Claim(),
      headquarters: null,
      sector: null,
      business_segment: null,
      revenue: null,
      employee_count: null,
      geographic_reach: [],
      // Valeur inventée par le modèle : elle doit être écrasée avant persistance.
      dynamic: {
        label: "Croissance explosive",
        score: 100,
        period_start: "2020-01-01T00:00:00.000Z",
        period_end: "2026-08-05T00:00:00.000Z",
        evidence_count: 999,
        method_version: "invented-by-llm",
        source_refs: [SOURCE_B],
      },
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
    trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_A] },
    verification_results: [
      {
        claim_path: "$.identity.primary_activity",
        verdict: "confirmed",
        checked_at: "2026-08-05T10:00:00Z",
        supporting_source_refs: [SOURCE_B],
        contradicting_source_refs: [],
        rationale: null,
      },
    ],
    source_coverage: {
      displayed_claims: 42,
      sourced_claims: 42,
      coverage_rate: 0.1,
      missing_source_paths: [],
      stale_source_paths: [],
      contradiction_paths: [],
      passed: false,
    },
    generated_at: "2026-08-05T10:00:00Z",
    ...overrides,
  }
}

function callbackRequest(contentJson: Record<string, unknown>) {
  const body = JSON.stringify({
    runId: RUN,
    phase: 1,
    resultType: "account_knowledge",
    status: "succeeded",
    contentJson,
  })
  return new Request("https://kredo.example/api/n8n/callback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-kredo-signature": "sha256=sig" },
    body,
  })
}

describe("POST /api/n8n/callback — account_knowledge V3", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyHmac.mockReturnValue(true)
    saveResult.mockResolvedValue("result-1")
    // `identity.dynamic` porte la fenêtre d'observation réellement calculée à
    // l'ingestion : sans horloge figée, deux appels successifs diffèrent d'une
    // milliseconde et l'égalité de l'artefact persisté n'est pas observable.
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("persiste un artefact V3 valide sous sa forme normalisée", async () => {
    const response = await POST(callbackRequest(artifactV3()))

    expect(response.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(1)

    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    const content = persisted.contentJson
    expect(content.schema_version).toBe(3)

    // La dynamique inventée par le modèle n'est jamais persistée.
    const identity = content.identity as { dynamic: { method_version: string; evidence_count: number } }
    expect(identity.dynamic.method_version).toBe("account-dynamic-v1")
    expect(identity.dynamic.evidence_count).toBe(1)

    // La couverture annoncée (42/42) est remplacée par le décompte réel.
    const coverage = content.source_coverage as { displayed_claims: number; passed: boolean }
    expect(coverage.displayed_claims).toBe(1)
    expect(coverage.passed).toBe(true)

    expect(updateRunStatus).toHaveBeenCalledWith(RUN, "succeeded", expect.objectContaining({ phase: 1 }))
  })

  it("bascule le run en échec et n'écrit rien quand l'artefact V3 est refusé", async () => {
    const response = await POST(
      callbackRequest(
        artifactV3({ trends_and_news: { analysis: null, significant_signal_ids: [SIGNAL_UNKNOWN] } }),
      ),
    )

    expect(response.status).toBe(400)
    // Aucune persistance partielle : le résultat n'est pas écrit du tout.
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledTimes(1)
    expect(updateRunStatus).toHaveBeenCalledWith(
      RUN,
      "failed",
      expect.objectContaining({ errorMessage: expect.stringContaining("Signaux cités inconnus") }),
    )

    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain("Signaux cités inconnus")
  })

  it("ne laisse jamais un run en cours après un refus de structure", async () => {
    const response = await POST(callbackRequest({ schema_version: 3 }))

    expect(response.status).toBe(400)
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).toHaveBeenCalledWith(RUN, "failed", expect.anything())
  })

  it("reste idempotent : rejouer le même callback produit la même écriture", async () => {
    const first = await POST(callbackRequest(artifactV3()))
    const second = await POST(callbackRequest(artifactV3()))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(saveResult).toHaveBeenCalledTimes(2)

    // Même run, même phase, même contenu normalisé : l'upsert (run_id, phase)
    // réécrit la même ligne au lieu d'en empiler une seconde.
    const [firstCall, secondCall] = saveResult.mock.calls
    if (!firstCall || !secondCall) throw new Error("deux appels à saveResult attendus")
    expect(firstCall[0]).toBe(RUN)
    expect(secondCall[0]).toBe(RUN)
    expect(secondCall[4].phase).toBe(firstCall[4].phase)
    expect(secondCall[4].contentJson).toEqual(firstCall[4].contentJson)
  })

  it("laisse le chemin V2 inchangé", async () => {
    const v2 = {
      schema_version: 2,
      identity: {
        primary_activity: { text: "Agence de voyage", nature: "fact", source_refs: [SOURCE_A], confidence: 0.9, verified_at: null },
        headquarters: null,
        revenue: null,
        employee_count: null,
        dynamic: null,
      },
      account_summary: null,
      market_positioning: {
        positioning: null, direct_competitors: [], customer_segments: [], differentiators: [],
        uncovered_scope: [], claimed_identity: null, threats: [], opportunities: [],
      },
      company_value_chain: {
        description: null, value_proposition: null, key_links: [], dependencies: [],
        vulnerabilities: [], customer_base: [],
      },
      organisation: { departments: [], strategic_weight: null, key_contacts: [], process_observations: [] },
      open_questions: [],
      source_coverage: {
        displayed_claims: 1, sourced_claims: 1, coverage_rate: 1,
        missing_source_paths: [], stale_source_paths: [], contradiction_paths: [], passed: true,
      },
      generated_at: "2026-08-04T10:00:00.000Z",
    }

    const response = await POST(callbackRequest(v2))

    expect(response.status).toBe(200)
    const persisted = saveResult.mock.calls[0]?.[4]
    if (!persisted) throw new Error("saveResult n'a pas été appelé")
    expect(persisted.contentJson.schema_version).toBe(2)
    // Aucune promotion silencieuse vers V3.
    expect("verification_results" in persisted.contentJson).toBe(false)
  })

  it("rejette une signature HMAC invalide avant toute lecture de run", async () => {
    verifyHmac.mockReturnValue(false)

    const response = await POST(callbackRequest(artifactV3()))

    expect(response.status).toBe(401)
    expect(saveResult).not.toHaveBeenCalled()
    expect(updateRunStatus).not.toHaveBeenCalled()
  })
})
