import type { FinancialReference } from "./financial-reference-presenter"

export type CommercialQuote = {
  documentId: string
  modelId: string
  title: string
  subject: string
  account: string | null
  opportunity: string | null
  resource: string
  profile: string | null
  startDate: string
  endDate: string | null
  productionDays: number
  dailyRate: number
  totalExcludingTax: number
  currency: string
  conditions: string
  notes: string
}

export function createCommercialQuoteDraft(reference: FinancialReference, documentId = ""): CommercialQuote {
  return {
    documentId,
    modelId: reference.modelId,
    title: `Devis — ${reference.opportunity ?? reference.resource}`,
    subject: reference.profile ? `${reference.profile} · ${reference.resource}` : reference.resource,
    account: reference.account,
    opportunity: reference.opportunity,
    resource: reference.resource,
    profile: reference.profile,
    startDate: reference.startDate,
    endDate: reference.endDate,
    productionDays: reference.productionDays,
    dailyRate: reference.saleDailyRate,
    totalExcludingTax: reference.projectedRevenue,
    currency: "EUR",
    conditions: "",
    notes: "",
  }
}

export function commercialQuoteContent(quote: CommercialQuote) {
  return {
    quoteType: "commercial_quote",
    account: quote.account,
    opportunity: quote.opportunity,
    resource: quote.resource,
    profile: quote.profile,
    subject: quote.subject,
    startDate: quote.startDate,
    endDate: quote.endDate,
    productionDays: quote.productionDays,
    dailyRate: quote.dailyRate,
    totalExcludingTax: quote.totalExcludingTax,
    currency: quote.currency,
    conditions: quote.conditions,
    notes: quote.notes,
  }
}

export function commercialQuoteText(quote: CommercialQuote) {
  return [
    quote.subject,
    quote.account ? `Compte : ${quote.account}` : null,
    quote.opportunity ? `Opportunité : ${quote.opportunity}` : null,
    `Période : ${quote.startDate} — ${quote.endDate ?? "Sans fin"}`,
    `Prestation : ${quote.productionDays} jours à ${quote.dailyRate} ${quote.currency}`,
    `Montant total HT : ${quote.totalExcludingTax} ${quote.currency}`,
    quote.conditions ? `Conditions : ${quote.conditions}` : null,
    quote.notes ? `Notes : ${quote.notes}` : null,
  ].filter(Boolean).join("\n")
}

export function isSameCommercialQuoteContent(current: unknown, quote: CommercialQuote) {
  return JSON.stringify(current) === JSON.stringify(commercialQuoteContent(quote))
}
