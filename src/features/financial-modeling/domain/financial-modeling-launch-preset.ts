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
  companyName?: string | null
  opportunityId?: string | null
  opportunityTitle?: string | null
  salesDailyRate?: number | null
}

interface FinancialModelTitleParts {
  companyName?: string | null
  consultantName?: string | null
  opportunityTitle?: string | null
}

function normalizeTitlePart(value?: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ")
  return normalized ? normalized : null
}

export function buildFinancialModelTitle({
  companyName,
  consultantName,
  opportunityTitle,
}: FinancialModelTitleParts): string | null {
  const normalizedCompanyName = normalizeTitlePart(companyName)
  const normalizedConsultantName = normalizeTitlePart(consultantName)
  const normalizedOpportunityTitle = normalizeTitlePart(opportunityTitle)

  if (!normalizedCompanyName || !normalizedConsultantName || !normalizedOpportunityTitle) {
    return null
  }

  return `${normalizedCompanyName} - ${normalizedConsultantName} - ${normalizedOpportunityTitle}`
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
  const generatedTitle = buildFinancialModelTitle({
    companyName: preset.companyName,
    consultantName: candidateName,
    opportunityTitle: preset.opportunityTitle,
  })
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
      title: generatedTitle ?? preset.title ?? base.title,
      companyId: preset.companyId ?? base.companyId,
      opportunityId: preset.opportunityId ?? base.opportunityId,
      input: sharedInput,
    }
  }

  return {
    ...base,
    title: generatedTitle ?? preset.title ?? `Simulation financière — ${candidateName || "candidat"}`,
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
