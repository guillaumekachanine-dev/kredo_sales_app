import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import type { ResourceCostModel } from "../domain"

type PersonRow = Tables<"persons">

type PersonSummary = Pick<PersonRow, "id" | "full_name" | "first_name" | "last_name" | "location">

export type FinancialResourceCatalogItem = {
  id: string
  resourceType: "collaborator" | "candidate"
  personId: string
  label: string
  currentTitle: string | null
  seniority: string | null
  location: string | null
  jobProfileId: string | null
  jobProfileTitle: string | null
  employmentStatus: string | null
  resourceCostModel: ResourceCostModel | null
  loadedDailyCost: number | null
  productiveDailyCost: number | null
  legacyCjm: number | null
  provenance: {
    annualGrossSalary: string | null
    annualVariablePay: string | null
    employerChargesRate: string | null
    annualWorkingDays: string | null
    purchaseDailyRate: string | null
    historicalActivityRate: string | null
    jobProfile: string | null
    employmentStatus: string | null
  }
  missingData: string[]
  isEstimate: boolean
  historicalActivityRate: number | null
  lot0InputMapping: {
    annualGrossSalary: number | null
    annualVariablePay: number | null
    employerChargesRate: number | null
    annualWorkingDays: number | null
    purchaseDailyRate: number | null
    fixedExternalCost: number | null
    resourceCostModel: ResourceCostModel | null
  }
}

export type FinancialResourceCatalogData = {
  collaborators: FinancialResourceCatalogItem[]
  candidates: FinancialResourceCatalogItem[]
  provenance: {
    collaborators: readonly [
      "collaborators",
      "persons",
      "job_profiles",
      "v_financial_model_collaborator_costs",
    ]
    candidates: readonly ["candidates", "persons", "job_profiles"]
  }
}

function getPersonLabel(person: PersonSummary | undefined) {
  const fullName = person?.full_name?.trim()

  if (fullName) {
    return fullName
  }

  const composedName = [person?.first_name, person?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()

  return composedName || "Profil non renseigne"
}

function asCostModel(value: string | null): ResourceCostModel | null {
  if (
    value === "salaried" ||
    value === "subcontractor_daily_rate" ||
    value === "fixed_external_cost"
  ) {
    return value
  }

  return null
}

export async function getFinancialResourceCatalog(): Promise<FinancialResourceCatalogData> {
  const supabase = await createClient()

  const [
    collaboratorsResult,
    candidatesResult,
    personsResult,
    jobProfilesResult,
    collaboratorCostsResult,
    activityRatesResult,
  ] = await Promise.all([
    supabase
      .from("collaborators")
      .select("id, person_id, current_title, seniority, job_profile_id, employment_status"),
    supabase
      .from("candidates")
      .select(
        "id, person_id, current_title, seniority, job_profile_id, cost_model, expected_salary, last_salary, expected_daily_rate",
      ),
    supabase.from("persons").select("id, full_name, first_name, last_name, location"),
    supabase.from("job_profiles").select("id, title"),
    supabase
      .from("v_financial_model_collaborator_costs")
      .select(
        "collaborator_id, gross_annual, variable_pay, charges_rate, working_days_per_year, base_daily_cost, productive_daily_cost, legacy_cjm",
      ),
    supabase
      .from("v_financial_model_activity_rates")
      .select("collaborator_id, historical_activity_rate"),
  ])

  if (collaboratorsResult.error) {
    throw new Error(
      `Failed to read collaborators for financial modeling: ${collaboratorsResult.error.message}`,
    )
  }

  if (candidatesResult.error) {
    throw new Error(
      `Failed to read candidates for financial modeling: ${candidatesResult.error.message}`,
    )
  }

  if (personsResult.error) {
    throw new Error(
      `Failed to read persons for financial modeling: ${personsResult.error.message}`,
    )
  }

  if (jobProfilesResult.error) {
    throw new Error(
      `Failed to read job profiles for financial modeling: ${jobProfilesResult.error.message}`,
    )
  }

  if (collaboratorCostsResult.error) {
    throw new Error(
      `Failed to read collaborator cost view: ${collaboratorCostsResult.error.message}`,
    )
  }

  if (activityRatesResult.error) {
    throw new Error(
      `Failed to read collaborator activity rate view: ${activityRatesResult.error.message}`,
    )
  }

  const collaborators = collaboratorsResult.data ?? []
  const candidates = candidatesResult.data ?? []
  const persons = personsResult.data ?? []
  const jobProfiles = jobProfilesResult.data ?? []
  const collaboratorCosts = collaboratorCostsResult.data ?? []
  const activityRates = activityRatesResult.data ?? []

  const personById = new Map(persons.map((person) => [person.id, person]))
  const jobProfileById = new Map(jobProfiles.map((jobProfile) => [jobProfile.id, jobProfile]))
  const collaboratorCostById = new Map(
    collaboratorCosts.map((costRow) => [costRow.collaborator_id, costRow]),
  )
  const activityRateByCollaboratorId = new Map(
    activityRates.map((rateRow) => [rateRow.collaborator_id, rateRow]),
  )

  const collaboratorItems: FinancialResourceCatalogItem[] = collaborators.map(
    (collaborator) => {
      const person = personById.get(collaborator.person_id)
      const jobProfile = collaborator.job_profile_id
        ? jobProfileById.get(collaborator.job_profile_id)
        : undefined
      const costRow = collaboratorCostById.get(collaborator.id)
      const activityRateRow = activityRateByCollaboratorId.get(collaborator.id)
      const missingData: string[] = []

      if (!collaborator.job_profile_id) {
        missingData.push("job_profile_id")
      }

      if (!collaborator.employment_status) {
        missingData.push("employment_status")
      }

      if (!costRow) {
        missingData.push("compensation_snapshot")
      }

      if (activityRateRow?.historical_activity_rate == null) {
        missingData.push("historical_activity_rate")
      }

      return {
        id: collaborator.id,
        resourceType: "collaborator",
        personId: collaborator.person_id,
        label: getPersonLabel(person),
        currentTitle: collaborator.current_title,
        seniority: collaborator.seniority,
        location: person?.location ?? null,
        jobProfileId: collaborator.job_profile_id,
        jobProfileTitle: jobProfile?.title ?? null,
        employmentStatus: collaborator.employment_status,
        resourceCostModel: "salaried",
        loadedDailyCost: costRow?.base_daily_cost ?? null,
        productiveDailyCost: costRow?.productive_daily_cost ?? null,
        legacyCjm: costRow?.legacy_cjm ?? null,
        provenance: {
          annualGrossSalary: costRow ? "v_financial_model_collaborator_costs.gross_annual" : null,
          annualVariablePay: costRow ? "v_financial_model_collaborator_costs.variable_pay" : null,
          employerChargesRate: costRow ? "v_financial_model_collaborator_costs.charges_rate" : null,
          annualWorkingDays: costRow
            ? "v_financial_model_collaborator_costs.working_days_per_year"
            : null,
          purchaseDailyRate: null,
          historicalActivityRate:
            activityRateRow?.historical_activity_rate != null
              ? "v_financial_model_activity_rates.historical_activity_rate"
              : null,
          jobProfile: collaborator.job_profile_id ? "collaborators.job_profile_id" : null,
          employmentStatus: collaborator.employment_status
            ? "collaborators.employment_status"
            : null,
        },
        missingData,
        isEstimate: false,
        historicalActivityRate: activityRateRow?.historical_activity_rate ?? null,
        lot0InputMapping: {
          annualGrossSalary: costRow?.gross_annual ?? null,
          annualVariablePay: costRow?.variable_pay ?? null,
          employerChargesRate: costRow?.charges_rate ?? null,
          annualWorkingDays: costRow?.working_days_per_year ?? null,
          purchaseDailyRate: null,
          fixedExternalCost: null,
          resourceCostModel: "salaried",
        },
      }
    },
  )

  const candidateItems: FinancialResourceCatalogItem[] = candidates.map((candidate) => {
    const person = personById.get(candidate.person_id)
    const jobProfile = candidate.job_profile_id
      ? jobProfileById.get(candidate.job_profile_id)
      : undefined
    const resourceCostModel = asCostModel(candidate.cost_model)
    const missingData: string[] = []

    if (!candidate.job_profile_id) {
      missingData.push("job_profile_id")
    }

    if (!resourceCostModel) {
      missingData.push("cost_model")
    }

    let annualGrossSalary: number | null = null
    let annualGrossSalaryProvenance: string | null = null
    let purchaseDailyRate: number | null = null
    let purchaseDailyRateProvenance: string | null = null

    if (resourceCostModel === "salaried") {
      annualGrossSalary = candidate.expected_salary ?? candidate.last_salary ?? null
      annualGrossSalaryProvenance =
        candidate.expected_salary !== null
          ? "candidates.expected_salary"
          : candidate.last_salary !== null
            ? "candidates.last_salary"
            : null

      if (annualGrossSalary === null) {
        missingData.push("annual_gross_salary")
      }
    }

    if (resourceCostModel === "subcontractor_daily_rate") {
      purchaseDailyRate = candidate.expected_daily_rate ?? null
      purchaseDailyRateProvenance =
        candidate.expected_daily_rate !== null
          ? "candidates.expected_daily_rate"
          : null

      if (purchaseDailyRate === null) {
        missingData.push("purchase_daily_rate")
      }
    }

    return {
      id: candidate.id,
      resourceType: "candidate",
      personId: candidate.person_id,
      label: getPersonLabel(person),
      currentTitle: candidate.current_title,
      seniority: candidate.seniority,
      location: person?.location ?? null,
      jobProfileId: candidate.job_profile_id,
      jobProfileTitle: jobProfile?.title ?? null,
      employmentStatus: null,
      resourceCostModel,
      loadedDailyCost: null,
      productiveDailyCost: null,
      legacyCjm: null,
      provenance: {
        annualGrossSalary: annualGrossSalaryProvenance,
        annualVariablePay: null,
        employerChargesRate: null,
        annualWorkingDays: null,
        purchaseDailyRate: purchaseDailyRateProvenance,
        historicalActivityRate: null,
        jobProfile: candidate.job_profile_id ? "candidates.job_profile_id" : null,
        employmentStatus: null,
      },
      missingData,
      isEstimate: true,
      historicalActivityRate: null,
      lot0InputMapping: {
        annualGrossSalary,
        annualVariablePay: null,
        employerChargesRate: null,
        annualWorkingDays: null,
        purchaseDailyRate,
        fixedExternalCost: null,
        resourceCostModel,
      },
    }
  })

  return {
    collaborators: collaboratorItems,
    candidates: candidateItems,
    provenance: {
      collaborators: [
        "collaborators",
        "persons",
        "job_profiles",
        "v_financial_model_collaborator_costs",
      ],
      candidates: ["candidates", "persons", "job_profiles"],
    },
  }
}
