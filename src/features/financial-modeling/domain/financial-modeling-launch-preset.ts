import type { FinancialResourceCatalogData } from "../data/get-financial-resource-catalog"
import type { FinancialModelFormState } from "../persistence/financial-model-persistence.types"
import type { FinancialModelMode } from "./financial-model.types"

export interface FinancialModelingLaunchPreset {
  mode?: FinancialModelMode
  title?: string
  candidateId?: string | null
  candidateName?: string | null
  annualGrossSalary?: number | null
  companyId?: string | null
  opportunityId?: string | null
  salesDailyRate?: number | null
}

export function applyFinancialModelingLaunchPreset(
  base: FinancialModelFormState,
  preset: FinancialModelingLaunchPreset | undefined,
  catalog: FinancialResourceCatalogData,
): FinancialModelFormState {
  if (!preset) return base

  const candidate = preset.candidateId
    ? catalog.candidates.find((item) => item.id === preset.candidateId)
    : undefined
  const candidateName = preset.candidateName?.trim() || candidate?.label || base.resourceLabel
  const fallbackGrossSalary = base.input.costModel === "salaried"
    ? base.input.annualGrossSalary
    : 0
  const annualGrossSalary = preset.annualGrossSalary
    ?? candidate?.lot0InputMapping.annualGrossSalary
    ?? fallbackGrossSalary
  const sharedInput = {
    ...base.input,
    mode: preset.mode ?? base.input.mode,
    salesDailyRate: preset.salesDailyRate ?? base.input.salesDailyRate,
  }

  if (!preset.candidateId) {
    return {
      ...base,
      title: preset.title ?? base.title,
      companyId: preset.companyId ?? base.companyId,
      opportunityId: preset.opportunityId ?? base.opportunityId,
      input: sharedInput,
    }
  }

  return {
    ...base,
    title: preset.title ?? `Simulation financière — ${candidateName || "candidat"}`,
    collaboratorId: null,
    candidateId: preset.candidateId,
    resourceLabel: candidateName,
    jobProfileId: candidate?.jobProfileId ?? null,
    profileNameSnapshot: candidate?.currentTitle ?? null,
    senioritySnapshot: candidate?.seniority ?? null,
    employmentStatusSnapshot: candidate?.employmentStatus ?? null,
    locationSnapshot: candidate?.location ?? null,
    companyId: preset.companyId ?? base.companyId,
    opportunityId: preset.opportunityId ?? base.opportunityId,
    input: {
      ...sharedInput,
      resourceType: "candidate",
      costModel: "salaried",
      annualGrossSalary,
      annualVariablePay: 0,
      employerChargesRate: null,
      flags: {
        ...sharedInput.flags,
        annualGrossSalaryEstimated: false,
      },
    },
  }
}
