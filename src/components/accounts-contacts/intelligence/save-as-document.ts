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
    case "activity_commercial":
      return "activity_commercial"
    case "activity_recruitment":
      return "activity_recruitment"
    default:
      return null
  }
}

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

function getBriefScope(inputSnapshot: Json): Json | null {
  if (!inputSnapshot || typeof inputSnapshot !== "object" || Array.isArray(inputSnapshot)) {
    return null
  }

  const scope = (inputSnapshot as Record<string, unknown>).scope
  return scope && typeof scope === "object" && !Array.isArray(scope)
    ? (scope as Json)
    : null
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
    case "activity_commercial":
      return "Rapport d'activité commerciale"
    case "activity_recruitment":
      return "Rapport d'activité recrutement"
    default:
      // Types de rapports REPORT-001 (Lot 1+) — pas encore générés via ce
      // chemin (saveResultAsDocumentWithSupabaseClient sert INTEL-020/021/022).
      return "Rapport IA"
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
  const isClientSummary = documentType === "client_summary"
  const contentPeriod = getContentPeriod(result.content_json)

  const creation = await saveAsDocumentWithClient(
    supabase,
    documentOwnerId,
    {
      title: buildDocumentTitle(result, documentType),
      documentType,
      origin: "generated",
      contentText,
      contentJson: result.content_json,
      scopeJson: getBriefScope(run.input_snapshot),
      dataCutoffAt: getContentDataCutoffAt(result.content_json),
      periodStart: isClientSummary ? null : contentPeriod.start,
      periodEnd: isClientSummary ? null : contentPeriod.end,
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
