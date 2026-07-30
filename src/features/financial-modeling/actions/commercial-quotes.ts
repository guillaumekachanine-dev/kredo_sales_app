"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import {
  commercialQuoteContent,
  commercialQuoteText,
  createCommercialQuoteDraft,
  isSameCommercialQuoteContent,
  type CommercialQuote,
} from "../data/commercial-quote"
import type { FinancialReference } from "../data/financial-reference-presenter"

type FinancialModelRow = {
  id: string
  workspace_id: string
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
  title: string
}

function referenceFromModel(model: FinancialModelRow, source: Record<string, unknown> | null): FinancialReference {
  return {
    modelId: model.id,
    documentId: null,
    title: model.title,
    account: typeof source?.company_name === "string" ? source.company_name : null,
    opportunity: typeof source?.opportunity_name === "string" ? source.opportunity_name : null,
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

function quoteLinks(model: FinancialModelRow) {
  return [
    model.company_id ? { entity_type: "company" as const, entity_id: model.company_id } : null,
    model.opportunity_id ? { entity_type: "opportunity" as const, entity_id: model.opportunity_id } : null,
  ].filter((link): link is { entity_type: "company" | "opportunity"; entity_id: string } => link !== null)
}

export async function getOrCreateCommercialQuoteAction(modelId: string) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: "Non authentifié" as const }

  const { data: modelData, error: modelError } = await supabase
    .from("financial_models")
    .select("id, workspace_id, company_id, opportunity_id, resource_label, profile_name_snapshot, start_date, end_date, production_days, sale_daily_rate, revenue_total, gross_margin_pct, status, title")
    .eq("id", modelId)
    .eq("status", "reference")
    .maybeSingle()
  if (modelError || !modelData) return { error: modelError?.message ?? "Référence financière introuvable" }
  const model = modelData as FinancialModelRow

  const { data: existing, error: existingError } = await supabase
    .from("intelligence_documents")
    .select("id, title, current_content_json")
    .eq("source_financial_model_id", modelId)
    .eq("document_type", "commercial_quote")
    .neq("status", "archived")
    .maybeSingle()
  if (existingError) return { error: existingError.message }
  if (existing) return { success: true as const, created: false, quote: { ...(existing.current_content_json as CommercialQuote), documentId: existing.id, title: existing.title } }

  const { data: sourceDocument } = await supabase
    .from("intelligence_documents")
    .select("current_content_json")
    .eq("source_financial_model_id", modelId)
    .eq("document_type", "financial_reference")
    .maybeSingle()
  const source = sourceDocument?.current_content_json && typeof sourceDocument.current_content_json === "object" && !Array.isArray(sourceDocument.current_content_json)
    ? sourceDocument.current_content_json as Record<string, unknown>
    : null
  const draft = createCommercialQuoteDraft(referenceFromModel(model, source))
  const content = commercialQuoteContent(draft) as Json
  const text = commercialQuoteText(draft)
  const links = quoteLinks(model)
  const { data: document, error: documentError } = await supabase
    .from("intelligence_documents")
    .insert({ workspace_id: model.workspace_id, owner_id: auth.user.id, title: draft.title, document_type: "commercial_quote", status: "draft", current_content_json: content, current_content_text: text, source_financial_model_id: modelId, primary_entity_type: model.opportunity_id ? "opportunity" : model.company_id ? "company" : null, primary_entity_id: model.opportunity_id ?? model.company_id })
    .select("id")
    .single()
  if (documentError || !document) return { error: documentError?.message ?? "Impossible de créer le devis" }

  const { error: versionError } = await supabase.from("intelligence_document_versions").insert({ workspace_id: model.workspace_id, document_id: document.id, version_number: 1, origin: "manual_edit", content_json: content, content_text: text, source_refs: [], qa_flags: [], created_by: auth.user.id })
  if (versionError) return { error: versionError.message }
  if (links.length > 0) {
    const { error: linksError } = await supabase.from("intelligence_document_links").insert(links.map((link) => ({ ...link, workspace_id: model.workspace_id, document_id: document.id })))
    if (linksError) return { error: linksError.message }
  }
  revalidatePath("/reports")
  return { success: true as const, created: true, quote: { ...draft, documentId: document.id } }
}

export async function saveCommercialQuoteAction(quote: CommercialQuote) {
  if (!quote.documentId || !quote.title.trim()) return { error: "Le titre du devis est obligatoire" }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: "Non authentifié" as const }
  const { data: document, error } = await supabase
    .from("intelligence_documents")
    .select("id, workspace_id, version_number, current_content_json")
    .eq("id", quote.documentId)
    .eq("document_type", "commercial_quote")
    .maybeSingle()
  if (error || !document) return { error: error?.message ?? "Devis introuvable" }
  const content = commercialQuoteContent(quote) as Json
  const text = commercialQuoteText(quote)
  const contentChanged = !isSameCommercialQuoteContent(document.current_content_json, quote)
  if (contentChanged) {
    const nextVersion = document.version_number + 1
    const { error: versionError } = await supabase.from("intelligence_document_versions").insert({ workspace_id: document.workspace_id, document_id: document.id, version_number: nextVersion, origin: "manual_edit", content_json: content, content_text: text, source_refs: [], qa_flags: [], created_by: auth.user.id })
    if (versionError) return { error: versionError.message }
    const { error: updateError } = await supabase.from("intelligence_documents").update({ title: quote.title.trim(), current_content_json: content, current_content_text: text, version_number: nextVersion }).eq("id", quote.documentId)
    if (updateError) return { error: updateError.message }
  } else {
    const { error: updateError } = await supabase.from("intelligence_documents").update({ title: quote.title.trim() }).eq("id", quote.documentId)
    if (updateError) return { error: updateError.message }
  }
  revalidatePath("/reports")
  return { success: true as const, contentChanged }
}
