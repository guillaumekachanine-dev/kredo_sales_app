import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FinancialModelFormState } from "../persistence"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../domain/financial-model.constants"

const { fromMock, rpcMock, revalidatePathMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
    rpc: rpcMock,
  })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

import { saveFinancialModelAction } from "../actions/save-financial-model"

function makeDraftState(): FinancialModelFormState {
  return {
    title: "Simulation RPC",
    status: "draft",
    resourceLabel: "Consultant RPC",
    collaboratorId: "collaborator-rpc",
    input: {
      mode: "full",
      resourceType: "collaborator",
      costModel: "salaried",
      annualGrossSalary: 60_000,
      annualVariablePay: 2_000,
      employerChargesRate: 0.45,
      annualWorkingDays: 218,
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      salesDailyRate: 850,
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION,
    },
  }
}

describe("saveFinancialModelAction", () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it("sends all four RPC keys with null creation identifiers", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "sim-1",
          status: "draft",
          updated_at: "2026-06-30T10:00:00Z",
        },
      ],
      error: null,
    })

    const result = await saveFinancialModelAction(makeDraftState())

    expect(result).toMatchObject({
      success: true,
      id: "sim-1",
      status: "draft",
    })
    expect(rpcMock).toHaveBeenCalledTimes(1)

    const [fnName, payload] = rpcMock.mock.calls[0]
    expect(fnName).toBe("save_financial_model_snapshot")
    expect(Object.keys(payload).sort()).toEqual(
      ["p_expected_updated_at", "p_expenses", "p_model", "p_model_id"].sort(),
    )
    expect(payload).toMatchObject({
      p_model_id: null,
      p_expected_updated_at: null,
    })
    expect(payload.p_model).toBeTruthy()
    expect(payload.p_expenses).toEqual([])
    expect(revalidatePathMock).toHaveBeenCalledWith("/finance")
  })

  it("replaces a generic linked title with the canonical nomenclature", async () => {
    fromMock.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "companies"
              ? { name: "CHU de Nice" }
              : { title: "Interopérabilité SIRH" },
          }),
        }),
      }),
    }))
    rpcMock.mockResolvedValue({
      data: [{ id: "sim-2", status: "draft", updated_at: "2026-08-03T10:00:00Z" }],
      error: null,
    })

    await saveFinancialModelAction({
      ...makeDraftState(),
      title: "Nouvelle simulation",
      companyId: "company-1",
      opportunityId: "opportunity-1",
    })

    expect(rpcMock.mock.calls[0][1].p_model.title).toBe(
      "CHU de Nice - Consultant RPC - Interopérabilité SIRH",
    )
  })

  it("preserves a manually customized linked title", async () => {
    rpcMock.mockResolvedValue({
      data: [{ id: "sim-3", status: "draft", updated_at: "2026-08-03T10:00:00Z" }],
      error: null,
    })

    await saveFinancialModelAction({
      ...makeDraftState(),
      title: "Titre commercial personnalisé",
      companyId: "company-1",
      opportunityId: "opportunity-1",
    })

    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock.mock.calls[0][1].p_model.title).toBe("Titre commercial personnalisé")
  })
})
