import { describe, expect, it, vi } from "vitest"
import type { WatchAnalysisSource } from "@/lib/n8n/types"
import { launchWatchAnalysis, WATCH_ANALYSIS_WORKFLOW_ID, type FetchLike } from "../data/launch-watch-analysis"

const DIGEST_SOURCE: WatchAnalysisSource = { kind: "digest", digestId: "digest-1" }

function okFetch(runId: string): FetchLike {
  return vi.fn(async () => ({ ok: true, json: async () => ({ runId }) }))
}

describe("launchWatchAnalysis", () => {
  it("refuse une intention vide sans jamais appeler fetch", async () => {
    const fetchImpl = vi.fn()
    const result = await launchWatchAnalysis(
      { intention: "   ", sources: [DIGEST_SOURCE] },
      { fetchImpl: fetchImpl as unknown as FetchLike },
    )
    expect(result.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("produit requestedAt au moment du lancement, pas avant", async () => {
    const now = vi.fn().mockReturnValueOnce("2026-08-19T09:00:00.000Z").mockReturnValueOnce("2026-08-19T09:05:00.000Z")
    const fetchImpl = okFetch("run-1")

    await launchWatchAnalysis({ intention: "x", sources: [DIGEST_SOURCE] }, { fetchImpl, now })
    await launchWatchAnalysis({ intention: "x", sources: [DIGEST_SOURCE] }, { fetchImpl, now })

    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls as unknown as Array<[string, RequestInit]>
    const bodies = calls.map(([, init]) => JSON.parse(init.body as string))
    expect(bodies[0].input.requestedAt).toBe("2026-08-19T09:00:00.000Z")
    expect(bodies[1].input.requestedAt).toBe("2026-08-19T09:05:00.000Z")
    expect(bodies[0].input.requestedAt).not.toBe(bodies[1].input.requestedAt)
  })

  it("POST vers /api/n8n/trigger avec le workflow intel-021 et triggerMode manual_custom", async () => {
    const fetchImpl = okFetch("run-1")
    await launchWatchAnalysis({ intention: "Analyse test", sources: [DIGEST_SOURCE] }, { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/n8n/trigger",
      expect.objectContaining({ method: "POST" }),
    )
    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.workflowId).toBe(WATCH_ANALYSIS_WORKFLOW_ID)
    expect(body.entityType).toBe("workspace")
    expect(body.input.triggerMode).toBe("manual_custom")
    expect(body.input.schemaVersion).toBe(2)
  })

  it("n'envoie jamais de resolvedRefs ni de workspaceId choisi par le client", async () => {
    const fetchImpl = okFetch("run-1")
    await launchWatchAnalysis({ intention: "Analyse test", sources: [DIGEST_SOURCE] }, { fetchImpl })

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).not.toHaveProperty("workspaceId")
    expect(body.input).not.toHaveProperty("refs")
    expect(body.input).not.toHaveProperty("resolvedRefs")
    expect(Object.keys(body.input).sort()).toEqual(["intention", "requestedAt", "schemaVersion", "sources", "triggerMode"])
  })

  it("HTTP 202 avec runId → succès", async () => {
    const fetchImpl = okFetch("run-42")
    const result = await launchWatchAnalysis({ intention: "x", sources: [DIGEST_SOURCE] }, { fetchImpl })
    expect(result).toEqual({ ok: true, runId: "run-42" })
  })

  it("réponse HTTP en erreur → message d'erreur exploitable", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => ({ ok: false, json: async () => ({ error: "Corpus vide." }) }))
    const result = await launchWatchAnalysis({ intention: "x", sources: [DIGEST_SOURCE] }, { fetchImpl })
    expect(result).toEqual({ ok: false, error: "Corpus vide." })
  })

  it("erreur réseau → message d'erreur générique, ne jette pas", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => {
      throw new Error("network down")
    })
    const result = await launchWatchAnalysis({ intention: "x", sources: [DIGEST_SOURCE] }, { fetchImpl })
    expect(result.ok).toBe(false)
  })
})
