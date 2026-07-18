import { beforeEach, describe, expect, it, vi } from "vitest"
import { revalidatePath } from "next/cache"
import { updateAccountSignalStatus } from "./update-account-signal-status"
import { validateAccountSignal } from "./validate-account-signal"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("./update-account-signal-status", () => ({ updateAccountSignalStatus: vi.fn() }))

describe("validateAccountSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateAccountSignalStatus).mockResolvedValue({ companyId: "company-1", error: null })
  })

  it("passe le signal au statut validated sans déclencher d'autre action", async () => {
    const result = await validateAccountSignal("signal-1")

    expect(result).toEqual({ error: null })
    expect(updateAccountSignalStatus).toHaveBeenCalledWith("signal-1", "qualified")
    expect(revalidatePath).toHaveBeenCalledWith("/prospection/accounts/company-1")
  })

  it("remonte une erreur sans revalider la page", async () => {
    vi.mocked(updateAccountSignalStatus).mockResolvedValue({ companyId: null, error: "Non authentifié" })

    expect(await validateAccountSignal("signal-1")).toEqual({ error: "Non authentifié" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
