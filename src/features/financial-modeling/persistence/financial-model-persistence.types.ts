import type { Database } from "@/types/database"
import type { FinancialModelInput, FinancialModelStatus } from "../domain"

export type FinancialModelRow = Database["public"]["Tables"]["financial_models"]["Row"]
export type FinancialModelInsert = Database["public"]["Tables"]["financial_models"]["Insert"]
export type FinancialModelUpdate = Database["public"]["Tables"]["financial_models"]["Update"]

export type FinancialModelExpenseRow = Database["public"]["Tables"]["financial_model_expenses"]["Row"]
export type FinancialModelExpenseInsert = Database["public"]["Tables"]["financial_model_expenses"]["Insert"]

export interface FinancialModelFormState {
  id?: string
  title: string
  status: FinancialModelStatus
  updated_at?: string
  expected_updated_at?: string
  
  // Resource details
  collaboratorId?: string | null
  candidateId?: string | null
  resourceLabel: string
  
  // Profile snapshots
  jobProfileId?: string | null
  profileNameSnapshot?: string | null
  senioritySnapshot?: string | null
  employmentStatusSnapshot?: string | null
  locationSnapshot?: string | null
  
  // Business links
  companyId?: string | null
  opportunityId?: string | null
  pricingAgreementId?: string | null
  precedentMissionId?: string | null
  precedentOpportunityId?: string | null
  
  // Core financial modeling input
  input: FinancialModelInput
}
