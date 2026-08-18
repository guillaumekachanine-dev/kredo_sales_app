import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createRun: vi.fn<(...args: [Record<string, unknown>]) => Promise<string>>(async () => "run-1"),
  updateRunStatus: vi.fn(async () => undefined),
  callN8nWebhook:
    vi.fn<(...args: [string, Record<string, unknown>]) => Promise<void>>(async () => undefined),
}))

vi.mock("./runs", () => ({
  createRun: mocks.createRun,
  updateRunStatus: mocks.updateRunStatus,
}))
vi.mock("./client", () => ({ callN8nWebhook: mocks.callN8nWebhook }))

import { triggerN8nRun } from "./trigger-run"

const BASE = {
  entityType: "workspace" as const,
  entityId: "ws-1",
  workspaceId: "ws-1",
  userId: "user-1",
  input: { hello: "world" },
}

beforeEach(() => {
  mocks.createRun.mockClear()
  mocks.callN8nWebhook.mockClear()
})

describe("triggerN8nRun — traversée des options de mission (ADR-0020)", () => {
  it("fait traverser runType, inputSnapshot et extraConfig jusqu'à createRun", async () => {
    await triggerN8nRun({
      ...BASE,
      workflowId: "mission-001-run",
      runType: "mission:veille-analyse-mensuelle",
      inputSnapshot: { trace: [] },
      extraConfig: { missionSlug: "veille-analyse-mensuelle" },
    })

    expect(mocks.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "mission-001-run",
        runType: "mission:veille-analyse-mensuelle",
        inputSnapshot: { trace: [] },
        extraConfig: { missionSlug: "veille-analyse-mensuelle" },
      }),
    )
  })

  it("envoie à n8n l'`input`, jamais l'`inputSnapshot`", async () => {
    await triggerN8nRun({
      ...BASE,
      workflowId: "mission-001-run",
      input: { userPrompt: "contenu du corpus" },
      inputSnapshot: { trace: [{ ref: "…" }] },
    })

    const [workflowPath, payload] = mocks.callN8nWebhook.mock.calls[0]!
    expect(workflowPath).toBe("mission-001-run")
    expect(payload.input).toEqual({ userPrompt: "contenu du corpus" })
    expect(JSON.stringify(payload)).not.toContain("trace")
  })

  it("laisse les appelants existants strictement inchangés", async () => {
    await triggerN8nRun({ ...BASE, workflowId: "intel-020-communication" })

    const options = mocks.createRun.mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(options.runType).toBeUndefined()
    expect(options.inputSnapshot).toBeUndefined()
    expect(options.extraConfig).toBeUndefined()
  })
})
