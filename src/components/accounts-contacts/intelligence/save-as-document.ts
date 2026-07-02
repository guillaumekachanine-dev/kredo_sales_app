 "use server"

import { revalidatePath } from "next/cache"
import { type SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import {
  createReportsServiceClient,
  saveAsDocumentWithClient,
} from "@/app/(app)/reports/_data/reports-actions"

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
  "id" | "input_snapshot" | "owner_id" | "workspace_id"
>

type ExistingDocumentRow = {
  id: string
}

type DocumentType = Database["public"]["Enums"]["intelligence_document_type"]

function mapResultTypeToDocumentType(resultType: string): DocumentType | null {
  switch (resultType) {
    case "communication":
      return "communication"
    case "client_summary":
      return "client_summary"
    case "commercial_pitch":
    case "pitch":
    case "pitch_mail":
      return "commercial_pitch"
    case "campaign":
      return "campaign"
    default:
      return null
  }
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getBodyText(contentJson: Json): string | null {
  if (!contentJson || typeof contentJson !== "object" || Array.isArray(contentJson)) {
    return null
  }

  const body = (contentJson as Record<string, unknown>).body
  return typeof body === "string" && body.trim() ? body.trim() : null
}

function getFirstSubject(contentJson: Json): string | null {
  if (!contentJson || typeof contentJson !== "object" || Array.isArray(contentJson)) {
    return null
  }

  const subjects = (contentJson as Record<string, unknown>).subjects
  if (!Array.isArray(subjects)) return null

  const first = subjects.find(
    (subject): subject is string => typeof subject === "string" && subject.trim().length > 0
  )

  return first?.trim() ?? null
}

function buildFallbackTitle(documentType: DocumentType) {
  switch (documentType) {
    case "communication":
      return "Communication IA"
    case "client_summary":
      return "Synthèse client IA"
    case "commercial_pitch":
      return "Pitch commercial IA"
    case "campaign":
      return "Campagne IA"
    case "internal_note":
      return "Note IA"
  }
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

function buildDocumentTitle(result: ResultRow, documentType: DocumentType) {
  return (
    normalizeText(result.title) ??
    getFirstSubject(result.content_json) ??
    buildFallbackTitle(documentType)
  )
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
    .select("id, input_snapshot, owner_id, workspace_id")
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
  const contentText = normalizeText(result.content_text) ?? getBodyText(result.content_json)

  const creation = await saveAsDocumentWithClient(
    supabase,
    documentOwnerId,
    {
      title: buildDocumentTitle(result, documentType),
      documentType,
      origin: "generated",
      contentText,
      contentJson: result.content_json,
      briefJson: run.input_snapshot,
      sourceRefs: asArray(result.source_refs),
      qaFlags: asArray(result.qa_flags),
      sourceResultId: result.id,
      links: result.company_id
        ? [{ entityType: "company", entityId: result.company_id }]
        : [],
      primaryEntity: result.company_id
        ? { entityType: "company", entityId: result.company_id }
        : null,
    },
    { workspaceId: result.workspace_id ?? run.workspace_id }
  )

  if (!creation.success) {
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
