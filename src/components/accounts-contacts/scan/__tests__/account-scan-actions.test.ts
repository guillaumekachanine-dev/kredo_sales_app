/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, expect, it, beforeEach } from "vitest"
import { applyAccountScanProposals, getLatestAccountScanRun } from "../account-scan-actions"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockRpc = vi.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn(),
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}))

function createFluentChain() {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  // Toujours terminaux dans notre code — jamais chaînés après (cf. account-scan-actions.ts)
  chain.in = vi.fn().mockResolvedValue({ data: [], error: null })
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

describe("applyAccountScanProposals", () => {
  let chain: any

  beforeEach(() => {
    vi.clearAllMocks()
    chain = createFluentChain()
    mockSupabase.from.mockReturnValue(chain)
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
  })

  it("rejects an empty proposalIds array without touching the network", async () => {
    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: [] })
    expect(res.error).toBe("Paramètres invalides")
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it("rejects when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toBe("Non authentifié")
  })

  it("blocks a proposal that belongs to a different company than the requested one", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null }) // profiles
    chain.in.mockResolvedValueOnce({
      data: [{ id: "p1", workspace_id: "ws-1", target_type: "company", target_id: "OTHER-company", run_id: "run-1", status: "proposed" }],
      error: null,
    })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toMatch(/n'appartient pas/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("blocks a proposal from a different run", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
    chain.in.mockResolvedValueOnce({
      data: [{ id: "p1", workspace_id: "ws-1", target_type: "company", target_id: "company-1", run_id: "OTHER-run", status: "proposed" }],
      error: null,
    })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toMatch(/n'appartient pas/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("blocks a proposal that is no longer in an applicable status (e.g. rejected)", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
    chain.in.mockResolvedValueOnce({
      data: [{ id: "p1", workspace_id: "ws-1", target_type: "company", target_id: "company-1", run_id: "run-1", status: "rejected" }],
      error: null,
    })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toMatch(/statut applicable/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("rejects if a requested proposal id does not exist at all", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
    chain.in.mockResolvedValueOnce({ data: [], error: null })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1", "p2"] })
    expect(res.error).toMatch(/introuvable/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("calls the batch RPC once ownership checks pass and returns its results", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
    chain.in.mockResolvedValueOnce({
      data: [{ id: "p1", workspace_id: "ws-1", target_type: "company", target_id: "company-1", run_id: "run-1", status: "proposed" }],
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: [{ proposal_id: "p1", status: "applied", operation: "applied", target_type: "company", target_id: "company-1", target_field: "siren", fact_id: null, previous_value: null, applied_value: "123456789", conflict: null, message: "ok" }],
      error: null,
    })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toBeNull()
    expect(res.results).toHaveLength(1)
    expect(mockRpc).toHaveBeenCalledWith("validate_and_apply_enrichment_proposals", { p_proposal_ids: ["p1"], p_reason: undefined })
  })

  it("surfaces an RPC error instead of silently swallowing it", async () => {
    chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
    chain.in.mockResolvedValueOnce({
      data: [{ id: "p1", workspace_id: "ws-1", target_type: "company", target_id: "company-1", run_id: "run-1", status: "proposed" }],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } })

    const res = await applyAccountScanProposals({ runId: "run-1", companyId: "company-1", proposalIds: ["p1"] })
    expect(res.error).toMatch(/Erreur RPC/)
    expect(res.results).toEqual([])
  })
})

describe("getLatestAccountScanRun", () => {
  let chain: any

  beforeEach(() => {
    vi.clearAllMocks()
    chain = createFluentChain()
    mockSupabase.from.mockReturnValue(chain)
  })

  it("returns null when no run exists for the company", async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const result = await getLatestAccountScanRun("company-1")
    expect(result).toBeNull()
  })

  it("returns null when the latest intel-010-refresh run was not an account_scan operation", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "run-1", status: "succeeded", created_at: "2026-07-12T00:00:00Z", error_message: null, input_snapshot: { operation: "client_intelligence_refresh" } },
      error: null,
    })
    const result = await getLatestAccountScanRun("company-1")
    expect(result).toBeNull()
  })

  it("returns a queued/running run without querying the results table", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "run-1", status: "running", created_at: "2026-07-12T00:00:00Z", error_message: null, input_snapshot: { operation: "account_scan" } },
      error: null,
    })
    const result = await getLatestAccountScanRun("company-1")
    expect(result).toEqual({
      runId: "run-1",
      status: "running",
      createdAt: "2026-07-12T00:00:00Z",
      errorMessage: null,
      resultStatus: null,
      contentJson: null,
    })
  })

  it("returns the succeeded result content for a completed run", async () => {
    chain.maybeSingle
      .mockResolvedValueOnce({
        data: { id: "run-1", status: "succeeded", created_at: "2026-07-12T00:00:00Z", error_message: null, input_snapshot: { operation: "account_scan" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { status: "succeeded", content_json: { schemaVersion: 1, resolution: { status: "resolved" } } },
        error: null,
      })

    const result = await getLatestAccountScanRun("company-1")
    expect(result?.status).toBe("succeeded")
    expect(result?.resultStatus).toBe("succeeded")
    expect(result?.contentJson).toEqual({ schemaVersion: 1, resolution: { status: "resolved" } })
  })
})
