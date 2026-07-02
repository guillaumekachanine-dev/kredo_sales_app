"use server"

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import { getDocumentDetail } from "./get-document-detail"
import type {
  DocumentDetailResult,
  DocumentMutationResult,
  ReportLinkInput,
  ReportPrimaryEntityInput,
  SaveAsDocumentInput,
  UpdateDocumentInput,
} from "./reports-types"

type DocumentInsert = Database["public"]["Tables"]["intelligence_documents"]["Insert"]
type DocumentUpdate = Database["public"]["Tables"]["intelligence_documents"]["Update"]
type VersionInsert = Database["public"]["Tables"]["intelligence_document_versions"]["Insert"]
type LinkInsert = Database["public"]["Tables"]["intelligence_document_links"]["Insert"]
type DocumentStatus = Database["public"]["Enums"]["intelligence_document_status"]
type DocumentOrigin = Database["public"]["Enums"]["intelligence_document_version_origin"]
type EntityType = Database["public"]["Enums"]["intelligence_entity_type"]

type ExistingDocumentRow = {
  id: string
  version_number: number
  status: DocumentStatus
  is_favorite: boolean
  title: string
  tags: string[]
  primary_entity_type: EntityType | null
  primary_entity_id: string | null
}

type ExistingLinkRow = {
  entity_type: EntityType
  entity_id: string
}

type LatestVersionRow = {
  id: string
  brief_json: Json | null
  change_note: string | null
  content_json: Json
  content_text: string | null
  qa_flags: Json
  source_refs: Json
}

export type DuplicateDocumentInput = { documentId: string }

const REPORTS_REVALIDATE_PATH = "/reports"

function normalizeTitle(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeTags(tags: string[] | undefined): string[] {
  const unique = new Set<string>()
  for (const tag of tags ?? []) {
    const trimmed = tag.trim()
    if (trimmed) unique.add(trimmed)
  }
  return Array.from(unique)
}

function asJson(value: unknown): Json {
  return (value ?? {}) as Json
}

function asNullableJson(value: unknown | null | undefined): Json | null {
  return value == null ? null : (value as Json)
}

function asJsonArray(value: unknown[] | undefined): Json {
  return (Array.isArray(value) ? value : []) as Json
}

function linkKey(link: { entityType: string; entityId: string }) {
  return `${link.entityType}:${link.entityId}`
}

function normalizeLinks(
  links: ReportLinkInput[] | undefined,
  primaryEntity: ReportPrimaryEntityInput | null | undefined
): {
  links: ReportLinkInput[]
  primaryEntity: ReportPrimaryEntityInput | null
} {
  const ordered: ReportLinkInput[] = []
  const seen = new Set<string>()

  const addLink = (link: ReportLinkInput | null | undefined) => {
    if (!link?.entityId) return
    const key = linkKey(link)
    if (seen.has(key)) return
    seen.add(key)
    ordered.push(link)
  }

  if (primaryEntity) addLink(primaryEntity)
  for (const link of links ?? []) addLink(link)

  return {
    links: ordered,
    primaryEntity: ordered[0] ?? null,
  }
}

function revalidateReports() {
  revalidatePath(REPORTS_REVALIDATE_PATH)
}

function buildStatusPatch(
  nextStatus: DocumentStatus,
  previousStatus: DocumentStatus
): Partial<DocumentUpdate> {
  const now = new Date().toISOString()
  const patch: Partial<DocumentUpdate> = { status: nextStatus }

  if (nextStatus === "used") {
    patch.last_used_at = now
  }

  if (nextStatus === "archived") {
    patch.archived_at = now
  } else if (previousStatus === "archived") {
    patch.archived_at = null
  }

  return patch
}

async function cleanupDocument(
  supabase: SupabaseClient<Database>,
  documentId: string
): Promise<void> {
  const { error } = await supabase.from("intelligence_documents").delete().eq("id", documentId)
  if (error) {
    console.error("[reports] cleanupDocument failed:", error)
  }
}

async function restoreLinks(
  supabase: SupabaseClient<Database>,
  documentId: string,
  links: ExistingLinkRow[]
) {
  const { error: deleteError } = await supabase
    .from("intelligence_document_links")
    .delete()
    .eq("document_id", documentId)

  if (deleteError) {
    console.error("[reports] restoreLinks delete failed:", deleteError)
    return
  }

  if (links.length === 0) return

  const payload: LinkInsert[] = links.map((link) => ({
    document_id: documentId,
    entity_type: link.entity_type,
    entity_id: link.entity_id,
  }))

  const { error: insertError } = await supabase
    .from("intelligence_document_links")
    .insert(payload)

  if (insertError) {
    console.error("[reports] restoreLinks insert failed:", insertError)
  }
}

async function deleteVersion(
  supabase: SupabaseClient<Database>,
  versionId: string
) {
  const { error } = await supabase
    .from("intelligence_document_versions")
    .delete()
    .eq("id", versionId)

  if (error) {
    console.error("[reports] deleteVersion rollback failed:", error)
  }
}

async function requireAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { error: "Non authentifié" as const }
  return { supabase, userId: user.id }
}

export async function createReportsServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Variables Supabase service-role manquantes")
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

export async function saveAsDocumentWithClient(
  supabase: SupabaseClient<Database>,
  actorUserId: string,
  input: SaveAsDocumentInput,
  options?: { workspaceId?: string }
): Promise<DocumentMutationResult> {
  const title = normalizeTitle(input.title)
  if (!title) return { error: "Le titre du document est obligatoire" }

  const normalized = normalizeLinks(input.links, input.primaryEntity)
  const tags = normalizeTags(input.tags)

  const documentPayload: DocumentInsert = {
    owner_id: actorUserId,
    title,
    document_type: input.documentType,
    status: "draft",
    current_content_text: normalizeText(input.contentText),
    current_content_json: asJson(input.contentJson),
    tags,
    is_favorite: input.isFavorite ?? false,
    source_result_id: input.sourceResultId ?? null,
    primary_entity_type: normalized.primaryEntity?.entityType ?? null,
    primary_entity_id: normalized.primaryEntity?.entityId ?? null,
    ...(options?.workspaceId ? { workspace_id: options.workspaceId } : {}),
  }

  const { data: documentRow, error: documentError } = await supabase
    .from("intelligence_documents")
    .insert(documentPayload)
    .select("id")
    .single()

  if (documentError || !documentRow) {
    return { error: documentError?.message ?? "Impossible de créer le document" }
  }

  const versionPayload: VersionInsert = {
    document_id: documentRow.id,
    version_number: 1,
    origin: input.origin,
    source_result_id: input.sourceResultId ?? null,
    content_text: normalizeText(input.contentText),
    content_json: asJson(input.contentJson),
    brief_json: asNullableJson(input.briefJson),
    source_refs: asJsonArray(input.sourceRefs),
    qa_flags: asJsonArray(input.qaFlags),
    change_note: normalizeText(input.changeNote),
    created_by: actorUserId,
    ...(options?.workspaceId ? { workspace_id: options.workspaceId } : {}),
  }

  const { error: versionError } = await supabase
    .from("intelligence_document_versions")
    .insert(versionPayload)

  if (versionError) {
    await cleanupDocument(supabase, documentRow.id)
    return { error: versionError.message }
  }

  if (normalized.links.length > 0) {
    const linkPayload: LinkInsert[] = normalized.links.map((link) => ({
      document_id: documentRow.id,
      entity_type: link.entityType,
      entity_id: link.entityId,
      ...(options?.workspaceId ? { workspace_id: options.workspaceId } : {}),
    }))

    const { error: linkError } = await supabase
      .from("intelligence_document_links")
      .insert(linkPayload)

    if (linkError) {
      await cleanupDocument(supabase, documentRow.id)
      return { error: linkError.message }
    }
  }

  return { success: true, documentId: documentRow.id }
}

export async function updateDocumentWithClient(
  supabase: SupabaseClient<Database>,
  actorUserId: string,
  input: UpdateDocumentInput,
  options?: { workspaceId?: string }
): Promise<DocumentMutationResult> {
  const title = normalizeTitle(input.title)
  if (!title) return { error: "Le titre du document est obligatoire" }

  const shouldTouchLinks =
    input.links !== undefined || input.primaryEntity !== undefined

  const [documentResult, linkResult] = await Promise.all([
    supabase
      .from("intelligence_documents")
      .select(
        "id, version_number, status, is_favorite, title, tags, primary_entity_type, primary_entity_id"
      )
      .eq("id", input.documentId)
      .maybeSingle(),
    shouldTouchLinks
      ? supabase
          .from("intelligence_document_links")
          .select("entity_type, entity_id")
          .eq("document_id", input.documentId)
      : Promise.resolve({ data: null as ExistingLinkRow[] | null, error: null }),
  ])

  if (documentResult.error) return { error: documentResult.error.message }
  if (!documentResult.data) return { error: "Document introuvable" }
  if (linkResult.error) return { error: linkResult.error.message }

  const existingDocument = documentResult.data as ExistingDocumentRow
  const existingLinks = (linkResult.data ?? []) as ExistingLinkRow[]
  const nextStatus = input.status ?? existingDocument.status
  const normalizedLinks = shouldTouchLinks
    ? normalizeLinks(
        input.links ??
          existingLinks.map((link) => ({
            entityType: link.entity_type,
            entityId: link.entity_id,
          })),
        input.primaryEntity ??
          (existingDocument.primary_entity_type && existingDocument.primary_entity_id
            ? {
                entityType: existingDocument.primary_entity_type,
                entityId: existingDocument.primary_entity_id,
              }
            : null)
      )
    : {
        links: [] as ReportLinkInput[],
        primaryEntity:
          existingDocument.primary_entity_type && existingDocument.primary_entity_id
            ? {
                entityType: existingDocument.primary_entity_type,
                entityId: existingDocument.primary_entity_id,
              }
            : null,
      }

  const nextVersionNumber = existingDocument.version_number + 1
  const versionPayload: VersionInsert = {
    document_id: input.documentId,
    version_number: nextVersionNumber,
    origin: "manual_edit" as DocumentOrigin,
    content_text: normalizeText(input.contentText),
    content_json: asJson(input.contentJson),
    brief_json: asNullableJson(input.briefJson),
    source_refs: asJsonArray(input.sourceRefs),
    qa_flags: asJsonArray(input.qaFlags),
    change_note: normalizeText(input.changeNote),
    created_by: actorUserId,
    ...(options?.workspaceId ? { workspace_id: options.workspaceId } : {}),
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("intelligence_document_versions")
    .insert(versionPayload)
    .select("id")
    .single()

  if (versionError || !versionRow) {
    return { error: versionError?.message ?? "Impossible de créer la nouvelle version" }
  }

  let linksReplaced = false

  try {
    if (shouldTouchLinks) {
      const { error: deleteLinksError } = await supabase
        .from("intelligence_document_links")
        .delete()
        .eq("document_id", input.documentId)

      if (deleteLinksError) throw new Error(deleteLinksError.message)
      linksReplaced = true

      if (normalizedLinks.links.length > 0) {
        const linkPayload: LinkInsert[] = normalizedLinks.links.map((link) => ({
          document_id: input.documentId,
          entity_type: link.entityType,
          entity_id: link.entityId,
          ...(options?.workspaceId ? { workspace_id: options.workspaceId } : {}),
        }))

        const { error: insertLinksError } = await supabase
          .from("intelligence_document_links")
          .insert(linkPayload)

        if (insertLinksError) throw new Error(insertLinksError.message)
      }
    }

    const patch: DocumentUpdate = {
      title,
      current_content_text: normalizeText(input.contentText),
      current_content_json: asJson(input.contentJson),
      tags: normalizeTags(input.tags),
      is_favorite: input.isFavorite ?? existingDocument.is_favorite,
      version_number: nextVersionNumber,
      primary_entity_type: normalizedLinks.primaryEntity?.entityType ?? null,
      primary_entity_id: normalizedLinks.primaryEntity?.entityId ?? null,
      ...buildStatusPatch(nextStatus, existingDocument.status),
    }

    const { error: updateError } = await supabase
      .from("intelligence_documents")
      .update(patch)
      .eq("id", input.documentId)

    if (updateError) throw new Error(updateError.message)

    return { success: true, documentId: input.documentId }
  } catch (error) {
    if (linksReplaced) {
      await restoreLinks(supabase, input.documentId, existingLinks)
    }
    await deleteVersion(supabase, versionRow.id)
    return {
      error:
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le document",
    }
  }
}

export async function saveAsDocument(
  input: SaveAsDocumentInput
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const result = await saveAsDocumentWithClient(auth.supabase, auth.userId, input)
  if (result.success) revalidateReports()
  return result
}

export async function updateDocument(
  input: UpdateDocumentInput
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const result = await updateDocumentWithClient(auth.supabase, auth.userId, input)
  if (result.success) revalidateReports()
  return result
}

export async function fetchDocumentDetail(
  documentId: string
): Promise<DocumentDetailResult> {
  return getDocumentDetail(documentId)
}

export async function setDocumentFavorite(
  documentId: string,
  isFavorite: boolean
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const { error } = await auth.supabase
    .from("intelligence_documents")
    .update({ is_favorite: isFavorite })
    .eq("id", documentId)

  if (error) return { error: error.message }
  revalidateReports()
  return { success: true, documentId }
}

export async function duplicateDocument(
  input: DuplicateDocumentInput
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const [documentResult, versionResult, linksResult] = await Promise.all([
    auth.supabase
      .from("intelligence_documents")
      .select(
        "id, title, document_type, tags, current_content_text, current_content_json, primary_entity_type, primary_entity_id"
      )
      .eq("id", input.documentId)
      .maybeSingle(),
    auth.supabase
      .from("intelligence_document_versions")
      .select("id, brief_json, change_note, content_json, content_text, qa_flags, source_refs")
      .eq("document_id", input.documentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    auth.supabase
      .from("intelligence_document_links")
      .select("entity_type, entity_id")
      .eq("document_id", input.documentId),
  ])

  if (documentResult.error) return { error: documentResult.error.message }
  if (!documentResult.data) return { error: "Document introuvable" }
  if (versionResult.error) return { error: versionResult.error.message }
  if (!versionResult.data) return { error: "Version source introuvable" }
  if (linksResult.error) return { error: linksResult.error.message }

  const document = documentResult.data
  const latestVersion = versionResult.data as LatestVersionRow
  const links = (linksResult.data ?? []).map((link) => ({
    entityType: link.entity_type,
    entityId: link.entity_id,
  }))

  const result = await saveAsDocumentWithClient(auth.supabase, auth.userId, {
    title: `Copie de ${document.title}`,
    documentType: document.document_type,
    origin: "duplicated",
    contentText: document.current_content_text,
    contentJson: document.current_content_json,
    briefJson: latestVersion.brief_json,
    sourceRefs: Array.isArray(latestVersion.source_refs) ? latestVersion.source_refs : [],
    qaFlags: Array.isArray(latestVersion.qa_flags) ? latestVersion.qa_flags : [],
    changeNote: latestVersion.change_note,
    tags: document.tags ?? [],
    isFavorite: false,
    sourceResultId: null,
    links,
    primaryEntity:
      document.primary_entity_type && document.primary_entity_id
        ? {
            entityType: document.primary_entity_type,
            entityId: document.primary_entity_id,
          }
        : null,
  })

  if (result.success) revalidateReports()
  return result
}

export async function setDocumentStatus(
  documentId: string,
  status: DocumentStatus
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const { data: current, error: currentError } = await auth.supabase
    .from("intelligence_documents")
    .select("id, status")
    .eq("id", documentId)
    .maybeSingle()

  if (currentError) return { error: currentError.message }
  if (!current) return { error: "Document introuvable" }

  const { error } = await auth.supabase
    .from("intelligence_documents")
    .update(buildStatusPatch(status, current.status))
    .eq("id", documentId)

  if (error) return { error: error.message }
  revalidateReports()
  return { success: true, documentId }
}
