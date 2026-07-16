import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  presentFinancialReference,
  type FinancialReference,
} from "./financial-reference-presenter"

type FinancialReferenceModelRow = {
  id: string
  title: string
  company_id: string | null
  opportunity_id: string | null
  resource_label: string
  profile_name_snapshot: string | null
  start_date: string
  end_date: string | null
  production_days: number
  sale_daily_rate: number
  revenue_total: number
  gross_margin_pct: number | null
  status: string
  promoted_at: string | null
}

async function getActiveFinancialReference(filters: {
  opportunityId?: string
  companyId?: string
}): Promise<FinancialReference | null> {
  const supabase = await createClient()
  let query = supabase
    .from("financial_models")
    .select("id, title, company_id, opportunity_id, resource_label, profile_name_snapshot, start_date, end_date, production_days, sale_daily_rate, revenue_total, gross_margin_pct, status, promoted_at")
    .eq("status", "reference")
    .order("promoted_at", { ascending: false, nullsFirst: false })
    .limit(1)

  if (filters.opportunityId) query = query.eq("opportunity_id", filters.opportunityId)
  if (filters.companyId) query = query.eq("company_id", filters.companyId)

  const { data: model, error: modelError } = await query.maybeSingle()
  if (modelError) throw new Error(`Impossible de charger la référence financière : ${modelError.message}`)
  if (!model) return null

  const typedModel = model as FinancialReferenceModelRow
  const [documentResult, companyResult, opportunityResult] = await Promise.all([
    supabase
      .from("intelligence_documents")
      .select("id")
      .eq("source_financial_model_id", typedModel.id)
      .eq("document_type", "financial_reference")
      .neq("status", "archived")
      .maybeSingle(),
    typedModel.company_id
      ? supabase.from("companies").select("name").eq("id", typedModel.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    typedModel.opportunity_id
      ? supabase.from("opportunities").select("title").eq("id", typedModel.opportunity_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (documentResult.error || companyResult.error || opportunityResult.error) {
    throw new Error("Impossible de compléter la référence financière.")
  }

  return presentFinancialReference(typedModel, {
    documentId: documentResult.data?.id ?? null,
    account: companyResult.data?.name ?? null,
    opportunity: opportunityResult.data?.title ?? null,
  })
}

export function getActiveFinancialReferenceByOpportunityId(opportunityId: string) {
  return getActiveFinancialReference({ opportunityId })
}

export async function getActiveFinancialReferenceByMissionId(missionId: string) {
  const supabase = await createClient()
  const { data: mission, error } = await supabase
    .from("missions")
    .select("opportunity_id")
    .eq("id", missionId)
    .maybeSingle()

  if (error) throw new Error(`Impossible de charger la mission : ${error.message}`)
  if (!mission?.opportunity_id) return null
  return getActiveFinancialReference({ opportunityId: mission.opportunity_id })
}

export function getActiveFinancialReferenceByCompanyId(companyId: string) {
  return getActiveFinancialReference({ companyId })
}
