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
  const root = contentJson as Record<string, unknown>
  const facts = root.facts
  const period = facts && typeof facts === "object" && !Array.isArray(facts)
    ? (facts as Record<string, unknown>).period
    : root.period
  if (!period || typeof period !== "object" || Array.isArray(period)) {
    return { start: null, end: null }
  }
  const { startDate, endDate, start, end } = period as Record<string, unknown>
  return {
    start: typeof startDate === "string" ? startDate : typeof start === "string" ? start : null,
    end: typeof endDate === "string" ? endDate : typeof end === "string" ? end : null,
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

  const root = contentJson as Record<string, unknown>
  const facts = root.facts
  const dataCutoffAt = root.dataCutoffAt ?? (
    facts && typeof facts === "object" && !Array.isArray(facts)
      ? (facts as Record<string, unknown>).dataCutoffAt
      : null
  )
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

export async function isManualCustomWatchAnalysisSnapshot(inputSnapshot: unknown): Promise<boolean> {
  if (!inputSnapshot || typeof inputSnapshot !== "object" || Array.isArray(inputSnapshot)) {
    return false
  }
  const snapshot = inputSnapshot as Record<string, unknown>
  return snapshot.schemaVersion === 2 && snapshot.triggerMode === "manual_custom"
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

  if (documentType === "strategic_watch_analysis") {
    if (!(await isManualCustomWatchAnalysisSnapshot(run.input_snapshot))) {
      if (!contentPeriod.start || !contentPeriod.end) {
        return { error: "Période mensuelle absente du résultat d’analyse stratégique" }
      }
      const dataCutoffAt = getContentDataCutoffAt(result.content_json)
        ?? `${contentPeriod.end}T23:59:59.999Z`
      const { data: documentId, error: upsertError } = await supabase.rpc(
        "upsert_strategic_watch_document",
        {
          p_workspace_id: result.workspace_id ?? run.workspace_id,
          p_actor_user_id: documentOwnerId,
          p_source_result_id: result.id,
          p_title: buildDocumentTitle(result, documentType, run.input_snapshot),
          p_content_text: contentText ?? "",
          p_content_json: result.content_json,
          p_period_start: contentPeriod.start,
          p_period_end: contentPeriod.end,
          p_data_cutoff_at: dataCutoffAt,
          p_scope_json: {
            scope: "workspace",
            periodStart: contentPeriod.start,
            periodEnd: contentPeriod.end,
            source: "veille_digests_and_articles",
          },
          p_brief_json: run.input_snapshot,
          p_source_refs: result.source_refs,
          p_qa_flags: result.qa_flags,
        },
      )
      if (upsertError || !documentId) {
        return { error: upsertError?.message ?? "Impossible de versionner l’analyse stratégique" }
      }
      revalidateReportsSafely()
      try {
        revalidatePath("/veille")
      } catch {
        // Le callback peut être testé hors contexte de requête Next.
      }
      return { success: true, documentId }
    }

    const snapshotRecord = run.input_snapshot as Record<string, unknown>
    const snapshotStats = (snapshotRecord.resolutionStats ?? snapshotRecord.stats) as { sourceGroups?: number; resolvedRefs?: number } | undefined
    const scopeJson = {
      scope: "workspace",
      analysisKind: "manual_custom",
      triggerMode: "manual_custom",
      sourceGroups: typeof snapshotStats?.sourceGroups === "number" ? snapshotStats.sourceGroups : 0,
      resolvedRefs: typeof snapshotStats?.resolvedRefs === "number" ? snapshotStats.resolvedRefs : 0,
    }

    const creation = await saveAsDocumentWithClient(
      supabase,
      documentOwnerId,
      {
        title: buildDocumentTitle(result, documentType, run.input_snapshot),
        documentType,
        origin: "generated",
        contentText,
        contentJson: result.content_json,
        scopeJson,
        dataCutoffAt: getContentDataCutoffAt(result.content_json),
        periodStart: null,
        periodEnd: null,
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
      const { data: concurrentDocument, error: concurrentDocumentError } = await supabase
        .from("intelligence_documents")
        .select("id")
        .eq("source_result_id", result.id)
        .maybeSingle()

      if (!concurrentDocumentError && concurrentDocument) {
        revalidateReportsSafely()
        try {
          revalidatePath("/veille")
        } catch {}
        return {
          success: true,
          documentId: (concurrentDocument as ExistingDocumentRow).id,
          alreadyExists: true,
        }
      }
      return creation
    }

    revalidateReportsSafely()
    try {
      revalidatePath("/veille")
    } catch {}
    return { success: true, documentId: creation.documentId }
  }

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
