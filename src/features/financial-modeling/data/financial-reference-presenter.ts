export type FinancialReference = {
  modelId: string
  documentId: string | null
  title: string
  account: string | null
  opportunity: string | null
  resource: string
  profile: string | null
  startDate: string
  endDate: string | null
  productionDays: number
  saleDailyRate: number
  projectedRevenue: number
  grossMarginPct: number | null
  status: string
}

type FinancialReferenceModelRow = {
  id: string
  title: string
  resource_label: string
  profile_name_snapshot: string | null
  start_date: string
  end_date: string | null
  production_days: number
  sale_daily_rate: number
  revenue_total: number
  gross_margin_pct: number | null
  status: string
}

export function presentFinancialReference(
  model: FinancialReferenceModelRow,
  labels: { account: string | null; opportunity: string | null; documentId: string | null },
): FinancialReference {
  return {
    modelId: model.id,
    documentId: labels.documentId,
    title: model.title,
    account: labels.account,
    opportunity: labels.opportunity,
    resource: model.resource_label,
    profile: model.profile_name_snapshot,
    startDate: model.start_date,
    endDate: model.end_date,
    productionDays: model.production_days,
    saleDailyRate: model.sale_daily_rate,
    projectedRevenue: model.revenue_total,
    grossMarginPct: model.gross_margin_pct,
    status: model.status,
  }
}
