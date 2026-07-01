/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, expect, it, beforeEach } from "vitest"
import { completeAgendaTask, reopenAgendaTask, createTaskFromAgendaItem } from "./agenda-actions"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockGetUser = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(),
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Helper to create a fluent mock chain
function createFluentChain() {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

describe("agenda-actions mutations", () => {
  let chain: any

  beforeEach(() => {
    vi.clearAllMocks()
    chain = createFluentChain()
    mockSupabase.from.mockReturnValue(chain)
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
  })

  describe("completeAgendaTask", () => {
    it("successfully completes a task in user's workspace", async () => {
      // 1. profiles single
      // 2. tasks single
      chain.single
        .mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "task-1", workspace_id: "ws-1" }, error: null })

      const res = await completeAgendaTask("task-1")
      expect(res.success).toBe(true)
      expect(chain.update).toHaveBeenCalledWith({
        status: "completed",
        completed_at: expect.any(String),
      })
    })

    it("blocks completion if task is outside user's workspace", async () => {
      chain.single
        .mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "task-1", workspace_id: "ws-other" }, error: null })

      const res = await completeAgendaTask("task-1")
      expect(res.error).toBe("Accès refusé")
      expect(chain.update).not.toHaveBeenCalled()
    })
  })

  describe("reopenAgendaTask", () => {
    it("successfully reopens a completed task", async () => {
      chain.single
        .mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "task-1", workspace_id: "ws-1" }, error: null })

      const res = await reopenAgendaTask("task-1")
      expect(res.success).toBe(true)
      expect(chain.update).toHaveBeenCalledWith({
        status: "open",
        completed_at: null,
      })
    })
  })

  describe("createTaskFromAgendaItem", () => {
    it("successfully creates task if no duplicate exists", async () => {
      // 1. profile fetch
      chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
      // 2. verifySourceAccess check (opportunity)
      chain.single.mockResolvedValueOnce({ data: { id: "opp-1", workspace_id: "ws-1" }, error: null })
      // 3. duplicate check (returns empty list of active tasks)
      chain.limit.mockResolvedValueOnce({ data: [], error: null })
      // 4. insert output single
      chain.single.mockResolvedValueOnce({ data: { id: "new-task-uuid" }, error: null })

      const res = await createTaskFromAgendaItem({
        title: "Test Task",
        due_date: "2026-07-01",
        priority: "normal",
        entity_type: "opportunity",
        entity_id: "opp-1",
      })

      expect(res.success).toBe(true)
      expect(res.taskId).toBe("new-task-uuid")
    })

    it("returns duplicate warning if an active matching task exists", async () => {
      // 1. profile fetch
      chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
      // 2. verifySourceAccess check
      chain.single.mockResolvedValueOnce({ data: { id: "opp-1", workspace_id: "ws-1" }, error: null })
      // 3. duplicate check returns active tasks
      chain.limit.mockResolvedValueOnce({ data: [{ id: "existing-task-id" }], error: null })

      const res = await createTaskFromAgendaItem({
        title: "Test Task",
        due_date: "2026-07-01",
        priority: "normal",
        entity_type: "opportunity",
        entity_id: "opp-1",
      })

      expect(res.warning).toBe("DUPLICATE_EXISTS")
      expect(res.taskId).toBeUndefined()
    })

    it("bypasses duplicate check if bypassDuplicateCheck is true", async () => {
      // 1. profile fetch
      chain.single.mockResolvedValueOnce({ data: { workspace_id: "ws-1" }, error: null })
      // 2. verifySourceAccess check
      chain.single.mockResolvedValueOnce({ data: { id: "opp-1", workspace_id: "ws-1" }, error: null })
      // 3. insert output single (no duplicate limit call is made)
      chain.single.mockResolvedValueOnce({ data: { id: "new-task-uuid" }, error: null })

      const res = await createTaskFromAgendaItem({
        title: "Test Task",
        due_date: "2026-07-01",
        priority: "normal",
        entity_type: "opportunity",
        entity_id: "opp-1",
        bypassDuplicateCheck: true,
      })

      expect(res.success).toBe(true)
      expect(res.taskId).toBe("new-task-uuid")
    })
  })
})
