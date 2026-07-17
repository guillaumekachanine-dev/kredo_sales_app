import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { createCompanyInteraction } from "@/app/(app)/prospection/_actions/company-interaction"

describe("createCompanyInteraction validation", () => {
  it("rejects missing company_id", async () => {
    const result = await createCompanyInteraction({
      company_id: "",
      type: "appel",
      summary: "Appel test",
      occurred_at: "2026-06-27T10:00:00Z",
    })
    expect(result.error).toBe("Compte manquant.")
  })

  it("rejects disallowed type", async () => {
    const result = await createCompanyInteraction({
      company_id: "comp-1",
      type: "hacking",
      summary: "Test",
      occurred_at: "2026-06-27T10:00:00Z",
    })
    expect(result.error).toContain("non autorisé")
  })

  it("rejects empty summary", async () => {
    const result = await createCompanyInteraction({
      company_id: "comp-1",
      type: "appel",
      summary: "   ",
      occurred_at: "2026-06-27T10:00:00Z",
    })
    expect(result.error).toBe("Le résumé est requis.")
  })

  it("rejects invalid date", async () => {
    const result = await createCompanyInteraction({
      company_id: "comp-1",
      type: "appel",
      summary: "Appel test",
      occurred_at: "not-a-date",
    })
    expect(result.error).toBe("Date invalide.")
  })

  it("accepts valid input with allowed type", async () => {
    const result = await createCompanyInteraction({
      company_id: "comp-1",
      type: "appel",
      summary: "Appel de qualification",
      occurred_at: "2026-06-27T10:00:00Z",
    })
    expect(result.success).toBe(true)
  })
})
