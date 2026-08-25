import { beforeEach, describe, expect, it, vi } from "vitest"

const USER_ID = "11111111-1111-1111-1111-111111111111"
const WORKSPACE_ID = "22222222-2222-2222-2222-222222222222"

const EMPTY_RUN_FACTS = {
  totalRuns: 0,
  successCount: 0,
  failureCount: 0,
  successRatePct: null,
  healthStatus: "unavailable",
  topAutomations: [],
  topAlerts: [],
  totalCost: null,
  hasPricingGap: false,
  costBreakdown: [],
}

type Row = Record<string, unknown>

const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, Row[]>,
  errors: {} as Record<string, { message: string } | null>,
  saveAsDocumentWithClient: vi.fn(),
}))

function queryFor(table: string) {
  let rows = [...(mocks.rows[table] ?? [])]
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value)
      return builder
    },
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    in: (column: string, values: unknown[]) => {
      rows = rows.filter((row) => values.includes(row[column]))
      return builder
    },
    single: async () => ({ data: rows[0] ?? null, error: mocks.errors[table] ?? null }),
    then: (onOk: (value: unknown) => unknown, onError?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: mocks.errors[table] ?? null }).then(onOk, onError),
  }
  return builder
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: queryFor,
  }),
}))

vi.mock("@/app/(app)/reports/_data/reports-actions", () => ({
  createReportsServiceClient: async () => ({ from: queryFor }),
  saveAsDocumentWithClient: mocks.saveAsDocumentWithClient,
}))

import { POST } from "./route"

function generateRequest() {
  return new Request("http://localhost/api/reports/technical/generate", {
    method: "POST",
    body: JSON.stringify({ periodPreset: "month" }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.errors = {}
  mocks.rows = {
    profiles: [{ id: USER_ID, workspace_id: WORKSPACE_ID }],
    ai_intelligence_runs: [],
    v_ai_run_costs: [],
  }
  mocks.saveAsDocumentWithClient.mockResolvedValue({
    success: true,
    documentId: "document-1",
  })
})

describe("POST /api/reports/technical/generate", () => {
  it("produit un état factuel indisponible lorsqu'aucune exécution n'existe", async () => {
    const response = await POST(generateRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.content.facts).toMatchObject(EMPTY_RUN_FACTS)
  })

  it("calcule les métriques uniquement depuis les exécutions et coûts réels", async () => {
    mocks.rows.ai_intelligence_runs = [
      {
        id: "run-success",
        workspace_id: WORKSPACE_ID,
        run_type: "intel-010-refresh",
        status: "succeeded",
        created_at: "2026-08-20T10:00:00.000Z",
        started_at: "2026-08-20T10:00:00.000Z",
        completed_at: "2026-08-20T10:00:02.000Z",
        failed_at: null,
        error_message: null,
      },
      {
        id: "run-failure",
        workspace_id: WORKSPACE_ID,
        run_type: "report-activity-commercial",
        status: "failed",
        created_at: "2026-08-21T11:00:00.000Z",
        started_at: "2026-08-21T11:00:00.000Z",
        completed_at: "2026-08-21T11:00:03.000Z",
        failed_at: "2026-08-21T11:00:03.000Z",
        error_message: "Erreur réelle",
      },
    ]
    mocks.rows.v_ai_run_costs = [
      {
        run_id: "run-success",
        duration_ms: 2_000,
        cost_estimate: 0.4,
        has_pricing_gap: false,
        has_tokens_gap: false,
      },
      {
        run_id: "run-failure",
        duration_ms: 3_000,
        cost_estimate: 0.6,
        has_pricing_gap: false,
        has_tokens_gap: false,
      },
    ]

    const response = await POST(generateRequest())
    const body = await response.json()
    const facts = body.content.facts

    expect(response.status).toBe(200)
    expect(facts).toMatchObject({
      totalRuns: 2,
      successCount: 1,
      failureCount: 1,
      successRatePct: 50,
      healthStatus: "critical",
      totalCost: 1,
      hasPricingGap: false,
    })
    expect(facts.topAutomations).toHaveLength(2)
    expect(facts.topAutomations.map((item: Row) => item.runType)).toEqual([
      "intel-010-refresh",
      "report-activity-commercial",
    ])
    expect(facts.topAlerts).toEqual([
      expect.objectContaining({
        id: "run-failure",
        runId: "run-failure",
        errorMessage: "Erreur réelle",
      }),
    ])
    expect(facts.costBreakdown).toEqual([
      expect.objectContaining({ runType: "intel-010-refresh", costTotal: 0.4, runsCount: 1 }),
      expect.objectContaining({ runType: "report-activity-commercial", costTotal: 0.6, runsCount: 1 }),
    ])
  })

  it("persiste exactement le contenu factuel généré dans intelligence_documents", async () => {
    const response = await POST(generateRequest())
    const body = await response.json()

    expect(mocks.saveAsDocumentWithClient).toHaveBeenCalledTimes(1)
    const [, persistedUserId, persistedInput, persistedOptions] =
      mocks.saveAsDocumentWithClient.mock.calls[0]

    expect(persistedUserId).toBe(USER_ID)
    expect(persistedInput.contentJson).toEqual(body.content)
    expect(persistedInput.contentJson.facts).toMatchObject(EMPTY_RUN_FACTS)
    expect(persistedOptions).toEqual({ workspaceId: WORKSPACE_ID })
  })

  it("échoue au lieu de transformer une erreur Supabase en période vide", async () => {
    mocks.errors.ai_intelligence_runs = { message: "lecture indisponible" }

    const response = await POST(generateRequest())

    expect(response.status).toBe(500)
    expect(mocks.saveAsDocumentWithClient).not.toHaveBeenCalled()
  })
})
