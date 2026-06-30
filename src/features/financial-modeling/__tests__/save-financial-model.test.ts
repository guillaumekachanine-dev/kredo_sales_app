import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FinancialModelFormState } from "../persistence"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../domain/financial-model.constants"

const { rpcMock, revalidatePathMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
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
})
