import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { launchDigest } from "../client/launch-digest"
import { ON_DEMAND_DIGEST_WORKFLOW_ID } from "@/components/veille/veille-desktop-contracts"

describe("launchDigest client helper", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("sends strictly V2 payload without framing, source, or workspaceId", async () => {
    let capturedUrl = ""
    let capturedOptions: RequestInit | undefined

    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedOptions = init
      return {
        ok: true,
        json: async () => ({ runId: "test-run-456" }),
      } as Response
    })

    const result = await launchDigest({
      topicKey: "ia",
      corpusId: "folio-ai-tech-id",
    })

    expect(result).toEqual({
      ok: true,
      runId: "test-run-456",
    })

    expect(capturedUrl).toBe("/api/n8n/trigger")
    expect(capturedOptions?.method).toBe("POST")
    expect(capturedOptions?.headers).toEqual({ "content-type": "application/json" })

    const parsedBody = JSON.parse(capturedOptions?.body as string)
    expect(parsedBody).toEqual({
      workflowId: ON_DEMAND_DIGEST_WORKFLOW_ID,
      entityType: "workspace",
      input: {
        schemaVersion: 2,
        triggerMode: "manual",
        topicKey: "ia",
        corpusId: "folio-ai-tech-id",
      },
    })

    // Strict negative assertion: no legacy or forbidden parameters
    expect(parsedBody).not.toHaveProperty("framing")
    expect(parsedBody).not.toHaveProperty("sources")
    expect(parsedBody).not.toHaveProperty("urls")
    expect(parsedBody).not.toHaveProperty("workspaceId")
    expect(parsedBody.input).not.toHaveProperty("framing")
    expect(parsedBody.input).not.toHaveProperty("sources")
    expect(parsedBody.input).not.toHaveProperty("topicSectorId")
    expect(parsedBody.input).not.toHaveProperty("generationMode")
    expect(parsedBody.input).not.toHaveProperty("workspaceId")
  })

  it("handles null corpusId correctly for default socle", async () => {
    let capturedBody: unknown

    global.fetch = vi.fn(async (_url, init) => {
      capturedBody = JSON.parse(init?.body as string)
      return {
        ok: true,
        json: async () => ({ runId: "socle-run-789" }),
      } as Response
    })

    const result = await launchDigest({
      topicKey: "global",
      corpusId: null,
    })

    expect(result.ok).toBe(true)
    expect(capturedBody).toEqual({
      workflowId: ON_DEMAND_DIGEST_WORKFLOW_ID,
      entityType: "workspace",
      input: {
        schemaVersion: 2,
        triggerMode: "manual",
        topicKey: "global",
        corpusId: null,
      },
    })
  })

  it("returns clean error message when API responds with error", async () => {
    global.fetch = vi.fn(async () => {
      return {
        ok: false,
        json: async () => ({ error: "Corpus non accessible." }),
      } as Response
    })

    const result = await launchDigest({
      topicKey: "ia",
      corpusId: "invalid-id",
    })

    expect(result).toEqual({
      ok: false,
      error: "Corpus non accessible.",
    })
  })

  it("returns network error message when fetch throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("Network failure")
    })

    const result = await launchDigest({
      topicKey: "ia",
      corpusId: null,
    })

    expect(result).toEqual({
      ok: false,
      error: "Erreur réseau : la génération du digest n’a pas pu être lancée.",
    })
  })
})
