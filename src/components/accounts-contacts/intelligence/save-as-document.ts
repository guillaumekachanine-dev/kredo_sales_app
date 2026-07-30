 "use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { type SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import {
  createReportsServiceClient,
  saveAsDocumentWithClient,
} from "@/app/(app)/reports/_data/reports-actions"
import {
  buildCommunicationDocumentTitle,
  buildDocumentEntities,
  buildDocumentScopeJson,
  buildFallbackDocumentTitle,
  buildResultContentText,
  buildResultPresentationFromSnapshot,
  mapResultTypeToDocumentType,
} from "@/lib/communication/communication-result-documents"

type DocumentMutationResult =
  | { success: true; documentId: string; alreadyExists?: boolean; error?: never }
  | { success?: never; documentId?: never; alreadyExists?: never; error: string }

type ResultRow = Pick<
  Database["public"]["Tables"]["ai_intelligence_results"]["Row"],
  | "id"
  | "company_id"
  | "content_json"
  | "content_text"
  | "owner_id"
  | "qa_flags"
  | "result_type"
  | "run_id"
  | "source_refs"
  | "status"
  | "title"
  | "workspace_id"
>

type RunRow = Pick<
  Database["public"]["Tables"]["ai_intelligence_runs"]["Row"],
  | "company_id"
  | "id"
  | "input_snapshot"
  | "owner_id"
  | "primary_entity_id"
  | "primary_entity_type"
  | "workspace_id"
>

type ExistingDocumentRow = {
  id: string
}

type DocumentType = Database["public"]["Enums"]["intelligence_document_type"]

// Rapports périodiques REPORT-001 (Lot 2+) : facts.period.{startDate,endDate}
// est calculé en base (RPC get_activity_*_facts) — jamais par le LLM. Les
// rapports non périodiques (ex. client_summary) n'ont pas ce champ.
function getContentPeriod(contentJson: Json): { start: string | null; end: string | null } {
  if (!contentJson || typeof contentJson !== "object" || Array.isArray(contentJson)) {
    return { start: null, end: null }
  }
  const facts = (contentJson as Record<string, unknown>).facts
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return { start: null, end: null }
  }
  const period = (facts as Record<string, unknown>).period
  if (!period || typeof period !== "object" || Array.isArray(period)) {
    return { start: null, end: null }
  }
  const { startDate, endDate } = period as Record<string, unknown>
  return {
    start: typeof startDate === "string" ? startDate : null,
    end: typeof endDate === "string" ? endDate : null,
  }
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getContentDataCutoffAt(contentJson: Json): string | null {
  if (!contentJson || typeof contentJson !== "object" || Array.isArray(contentJson)) {
    return null
  }

  const facts = (contentJson as Record<string, unknown>).facts
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return null
  }

  const dataCutoffAt = (facts as Record<string, unknown>).dataCutoffAt
  return typeof dataCutoffAt === "string" && dataCutoffAt.trim() ? dataCutoffAt : null
}

function buildFallbackTitle(documentType: DocumentType) {
  return buildFallbackDocumentTitle(documentType)
}

function revalidateReportsSafely() {
  try {
    revalidatePath("/reports")
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[reports] revalidatePath skipped outside request context:", error)
    }
  }
}

function buildDocumentTitle(result: ResultRow, documentType: DocumentType, inputSnapshot: Json) {
  return buildCommunicationDocumentTitle({
    documentType,
    resultTitle: normalizeText(result.title) ?? buildFallbackTitle(documentType),
    contentJson: result.content_json,
    inputSnapshot,
  })
}

function asArray(value: Json): unknown[] {
  return Array.isArray(value) ? value : []
}

export async function saveResultAsDocumentWithSupabaseClient(
  supabase: SupabaseClient<Database>,
  resultId: string,
  actorUserId?: string,
): Promise<DocumentMutationResult> {
  const [existingDocumentResult, resultRecordResult] = await Promise.all([
    supabase
      .from("intelligence_documents")
      .select("id")
      .eq("source_result_id", resultId)
      .maybeSingle(),
    supabase
      .from("ai_intelligence_results")
      .select(
        "id, company_id, content_json, content_text, owner_id, qa_flags, result_type, run_id, source_refs, status, title, workspace_id"
      )
      .eq("id", resultId)
      .maybeSingle(),
  ])

  if (existingDocumentResult.error) {
    return { error: existingDocumentResult.error.message }
  }

  if (existingDocumentResult.data) {
    revalidateReportsSafely()
    return {
      success: true,
      documentId: (existingDocumentResult.data as ExistingDocumentRow).id,
      alreadyExists: true,
    }
  }

  if (resultRecordResult.error) {
    return { error: resultRecordResult.error.message }
  }

  if (!resultRecordResult.data) {
    return { error: "Résultat IA introuvable" }
  }

  const result = resultRecordResult.data as ResultRow
  if (result.status !== "succeeded") {
    return { error: "Seuls les résultats réussis peuvent être enregistrés" }
  }

  const documentType = mapResultTypeToDocumentType(result.result_type)
  if (!documentType) {
    return { error: "Type de résultat non éligible à la bibliothèque" }
  }

  const { data: runRecord, error: runError } = await supabase
    .from("ai_intelligence_runs")
    .select("company_id, id, input_snapshot, owner_id, primary_entity_id, primary_entity_type, workspace_id")
    .eq("id", result.run_id)
    .maybeSingle()

  if (runError) {
    return { error: runError.message }
  }

  if (!runRecord) {
    return { error: "Run IA introuvable" }
  }

  const run = runRecord as RunRow
  const documentOwnerId = actorUserId ?? result.owner_id ?? run.owner_id
  const presentation = buildResultPresentationFromSnapshot(run.input_snapshot)
  const contentText = buildResultContentText(result.content_json, result.content_text, presentation)
  const isClientSummary = documentType === "client_summary"
  const contentPeriod = getContentPeriod(result.content_json)
  const documentEntities = buildDocumentEntities({
    inputSnapshot: run.input_snapshot,
    companyId: result.company_id ?? run.company_id,
    runPrimaryEntityType: run.primary_entity_type,
    runPrimaryEntityId: run.primary_entity_id,
  })

  const creation = await saveAsDocumentWithClient(
    supabase,
    documentOwnerId,
    {
      title: buildDocumentTitle(result, documentType, run.input_snapshot),
      documentType,
      origin: "generated",
      contentText,
      contentJson: result.content_json,
      scopeJson: buildDocumentScopeJson(run.input_snapshot),
      dataCutoffAt: getContentDataCutoffAt(result.content_json),
      periodStart: isClientSummary ? null : contentPeriod.start,
      periodEnd: isClientSummary ? null : contentPeriod.end,
      briefJson: run.input_snapshot,
      sourceRefs: asArray(result.source_refs),
      qaFlags: asArray(result.qa_flags),
      sourceResultId: result.id,
      links: documentEntities.links,
      primaryEntity: documentEntities.primaryEntity,
    },
    { workspaceId: result.workspace_id ?? run.workspace_id }
  )

  if (!creation.success) {
    // Deux callbacks identiques peuvent franchir le premier contrôle d'existence
    // en même temps. L'index unique sur source_result_id désigne alors le gagnant ;
    // le perdant relit ce document pour rester idempotent au lieu de répondre 500.
    const { data: concurrentDocument, error: concurrentDocumentError } = await supabase
      .from("intelligence_documents")
      .select("id")
      .eq("source_result_id", result.id)
      .maybeSingle()

    if (!concurrentDocumentError && concurrentDocument) {
      revalidateReportsSafely()
      return {
        success: true,
        documentId: (concurrentDocument as ExistingDocumentRow).id,
        alreadyExists: true,
      }
    }
    return creation
  }

  revalidateReportsSafely()
  return { success: true, documentId: creation.documentId }
}

export async function saveResultAsDocument({
  resultId,
}: {
  resultId: string
}): Promise<DocumentMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: "Non authentifié" }
  }

  return saveResultAsDocumentWithSupabaseClient(supabase, resultId, user.id)
}

export async function saveResultAsDocumentWithServiceRole({
  resultId,
}: {
  resultId: string
}): Promise<DocumentMutationResult> {
  const supabase = await createReportsServiceClient()
  return saveResultAsDocumentWithSupabaseClient(supabase, resultId)
}
