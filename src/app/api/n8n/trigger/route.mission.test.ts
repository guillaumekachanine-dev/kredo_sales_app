/**
 * Branche « mission d'intelligence » de la gateway existante (ADR-0020 §5.2).
 *
 * Ce qui est vérifié ici n'est pas l'hydratation (testée par les providers) mais les
 * décisions de la ROUTE : d'où vient le workspace, ce qui est imposé au navigateur,
 * et ce qui part vers n8n par rapport à ce qui est persisté.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const ATTACKER_WORKSPACE = "22222222-2222-2222-2222-222222222222"
const USER = "33333333-3333-3333-3333-333333333333"

const mocks = vi.hoisted(() => ({
  triggerN8nRun: vi.fn<(...args: [Record<string, unknown>]) => Promise<{ ok: true; runId: string }>>(
    async () => ({ ok: true as const, runId: "run-1" }),
  ),
  rows: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock("@/lib/n8n/trigger-run", () => ({ triggerN8nRun: mocks.triggerN8nRun }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
    from(table: string) {
      let rows = [...(mocks.rows[table] ?? [])]
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        in: (column: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[column]))
          return builder
        },
        gte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) >= String(value))
          return builder
        },
        lte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) <= String(value))
          return builder
        },
        is: (column: string, value: unknown) => {
          rows = rows.filter((row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value))
          return builder
        },
        order: () => builder,
        limit: (count: number) => {
          rows = rows.slice(0, count)
          return builder
        },
        single: async () => ({ data: rows[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (onOk: (value: unknown) => unknown, onErr?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(onOk, onErr),
      }
      return builder
    },
  }),
}))

import { POST } from "./route"

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/n8n/trigger", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

const PERIOD = { kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }

beforeEach(() => {
  mocks.triggerN8nRun.mockClear()
  mocks.rows = {
    profiles: [{ id: USER, workspace_id: WORKSPACE }],
    veille_digests: [
      {
        id: "digest-1",
        workspace_id: WORKSPACE,
        titre_digest: "Semaine du 7 juillet",
        resume_hebdo: "Consolidation du marché cyber.",
        digest_date: "2026-07-07",
      },
    ],
    veille_articles: [
      {
        id: "article-1",
        workspace_id: WORKSPACE,
        digest_id: "digest-1",
        titre_fr: "NIS2",
        resume: "Entrée en application.",
        analyse_kredo: "",
        action_commerciale: "",
        published_at: "2026-07-09",
        source_name: "Les Echos",
      },
    ],
  }
})

describe("POST /api/n8n/trigger — branche mission", () => {
  it("lance la mission sans `workflowId` ni `input`, et rend 202", async () => {
    const response = await POST(request({ missionSlug: "veille-analyse-mensuelle", selectors: [PERIOD] }))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ runId: "run-1", status: "queued" })
    expect(mocks.triggerN8nRun).toHaveBeenCalledTimes(1)
  })

  it("prend le workspace dans `profiles`, jamais dans le corps de la requête", async () => {
    await POST(
      request({
        missionSlug: "veille-analyse-mensuelle",
        selectors: [PERIOD],
        // Champs hostiles : ils ne doivent avoir aucun effet.
        workspaceId: ATTACKER_WORKSPACE,
        companyId: "44444444-4444-4444-4444-444444444444",
        resultType: "account_issues_map",
      }),
    )

    const call = mocks.triggerN8nRun.mock.calls[0]![0] as unknown as Record<string, unknown>
    expect(call.workspaceId).toBe(WORKSPACE)
    expect(call.userId).toBe(USER)
    expect(call.companyId).toBeNull()
    expect(call.entityType).toBe("workspace")
    expect(JSON.stringify(call)).not.toContain(ATTACKER_WORKSPACE)
    expect(JSON.stringify(call)).not.toContain("account_issues_map")
  })

  it("impose le workflow, le run_type et la config de mission", async () => {
    await POST(request({ missionSlug: "veille-analyse-mensuelle", selectors: [PERIOD] }))

    const call = mocks.triggerN8nRun.mock.calls[0]![0] as unknown as Record<string, unknown>
    expect(call.workflowId).toBe("mission-001-run")
    expect(call.runType).toBe("mission:veille-analyse-mensuelle")
    expect(call.extraConfig).toMatchObject({
      missionSlug: "veille-analyse-mensuelle",
      missionVersion: 3,
    })
  })

  it("envoie le prompt à n8n et ne persiste que la trace", async () => {
    await POST(request({ missionSlug: "veille-analyse-mensuelle", selectors: [PERIOD] }))

    const call = mocks.triggerN8nRun.mock.calls[0]![0] as unknown as {
      input: Record<string, unknown>
      inputSnapshot: Record<string, unknown>
    }
    expect(String(call.input.userPrompt)).toContain("Entrée en application.")
    expect(JSON.stringify(call.inputSnapshot)).not.toContain("Entrée en application.")
    expect(call.inputSnapshot.trace).toBeDefined()
  })

  it("refuse une mission inconnue", async () => {
    const response = await POST(request({ missionSlug: "mission-inventee", selectors: [PERIOD] }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Mission « mission-inventee » inconnue.",
    })
    expect(mocks.triggerN8nRun).not.toHaveBeenCalled()
  })

  it("refuse un corpus que le preset n'autorise pas", async () => {
    const response = await POST(
      request({
        missionSlug: "veille-analyse-mensuelle",
        selectors: [PERIOD, { kind: "account_context", companyId: "44444444-4444-4444-4444-444444444444" }],
      }),
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("non autorisé"),
    })
    expect(mocks.triggerN8nRun).not.toHaveBeenCalled()
  })

  it("refuse un sélecteur malformé et un corpus exigé manquant", async () => {
    const malformed = await POST(
      request({ missionSlug: "veille-analyse-mensuelle", selectors: [{ kind: "veille_period" }] }),
    )
    expect(malformed.status).toBe(400)

    const missing = await POST(request({ missionSlug: "veille-analyse-mensuelle", selectors: [] }))
    expect(missing.status).toBe(400)
    await expect(missing.json()).resolves.toMatchObject({
      error: expect.stringContaining("exige un sélecteur « veille_period »"),
    })
  })

  it("refuse de lancer un appel LLM sur un corpus vide", async () => {
    mocks.rows.veille_digests = []
    mocks.rows.veille_articles = []

    const response = await POST(request({ missionSlug: "veille-analyse-mensuelle", selectors: [PERIOD] }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Corpus vide : aucune source lisible pour cette mission.",
    })
    expect(mocks.triggerN8nRun).not.toHaveBeenCalled()
  })

  it("laisse le chemin des workflows existants intact", async () => {
    const response = await POST(
      request({ workflowId: "intel-022-campaign", companyId: "44444444-4444-4444-4444-444444444444", input: {} }),
    )

    expect(response.status).toBe(202)
    const call = mocks.triggerN8nRun.mock.calls[0]![0] as unknown as Record<string, unknown>
    expect(call.workflowId).toBe("intel-022-campaign")
    expect(call.runType).toBeUndefined()
    expect(call.inputSnapshot).toBeUndefined()
  })
})
