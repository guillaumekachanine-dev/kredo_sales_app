"use server"

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database"
import type { CommunicationBrief } from "@/lib/n8n/types"
import { buildDefaultBrief } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import { getDocumentDetail } from "./get-document-detail"
import type {
  CommunicationReuseMode,
  CommunicationReusePreparationResult,
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

type CompanyContextRow = {
  id: string
  name: string
  lifecycle_status: string
}

type ContactPersonRelation =
  | { full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }
  | Array<{ full_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }>
  | null

type ContactContextRow = {
  id: string
  job_title: string | null
  relationship_role: string | null
  person: ContactPersonRelation
}

type DuplicateSourceDocumentRow = {
  id: string
  title: string
  document_type: Database["public"]["Enums"]["intelligence_document_type"]
  tags: string[]
  current_content_text: string | null
  current_content_json: Json
  data_cutoff_at: string | null
  period_end: string | null
  period_start: string | null
  primary_entity_type: EntityType | null
  primary_entity_id: string | null
  scope_json: Json | null
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

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatPersonName(person: ContactPersonRelation): string {
  const resolved = pickOne(person)
  if (!resolved) return "Contact"
  return (
    resolved.full_name?.trim() ||
    `${resolved.first_name ?? ""} ${resolved.last_name ?? ""}`.trim() ||
    "Contact"
  )
}

function isCommunicationBrief(value: unknown): value is CommunicationBrief {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Partial<CommunicationBrief>
  return Boolean(record.what?.scenario && record.who?.recipient && record.how?.language && record.context)
}

function appendInstruction(brief: CommunicationBrief, instruction: string): CommunicationBrief {
  const existing = brief.context.mustInclude?.trim()
  return {
    ...brief,
    context: {
      ...brief.context,
      mustInclude: [instruction, existing].filter(Boolean).join("\n\n"),
    },
  }
}

function prepareReuseBrief(
  baseBrief: CommunicationBrief,
  mode: CommunicationReuseMode,
  opts: {
    documentId: string
    sourceRunId: string | null
    previousMessage: string
  }
): CommunicationBrief {
  const commonContext = {
    sourceDocumentId: opts.documentId,
    sourceRunId: opts.sourceRunId ?? undefined,
    previousMessage: opts.previousMessage,
    reuseMode: mode,
  } satisfies Partial<CommunicationBrief["context"]>

  if (mode === "variant") {
    return appendInstruction({
      ...baseBrief,
      context: {
        ...baseBrief.context,
        ...commonContext,
      },
    }, "Créer une variante du message précédent: conserver l'intention et les faits utiles, mais modifier l'angle, l'accroche et la formulation. Ne pas recopier le texte source.")
  }

  if (mode === "adapt_contact") {
    return appendInstruction({
      ...baseBrief,
      who: {
        ...baseBrief.who,
        recipient: {
          ...baseBrief.who.recipient,
          contactId: undefined,
          displayName: undefined,
          persona: "other",
        },
      },
      context: {
        ...baseBrief.context,
        ...commonContext,
      },
    }, "Adapter ce message à un autre contact du même compte: recalibrer persona, relation et angle avant de rédiger. Le texte précédent sert de comparaison, pas de modèle à recopier.")
  }

  if (mode === "reuse_account") {
    return appendInstruction({
      ...baseBrief,
      who: {
        ...baseBrief.who,
        recipient: {
          ...baseBrief.who.recipient,
          contactId: undefined,
          displayName: undefined,
        },
      },
      context: {
        ...baseBrief.context,
        ...commonContext,
      },
    }, "Réutiliser l'intention pour ce compte: repartir du brief d'origine et du contexte compte actuel. Comparer avec le texte précédent sans le recopier.")
  }

  return appendInstruction({
    ...baseBrief,
    what: {
      ...baseBrief.what,
      scenario: "follow_up_no_reply",
      channel: "email",
      length: baseBrief.what.length === "ultra_short" ? "concise" : baseBrief.what.length,
    },
    who: {
      ...baseBrief.who,
      objective: "get_reply",
    },
    context: {
      ...baseBrief.context,
      ...commonContext,
    },
  }, "Rédiger une relance à partir du message précédent: rappeler le contexte avec sobriété, proposer une prochaine étape claire et éviter de recopier le message source.")
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
    status: input.status ?? "draft",
    current_content_text: normalizeText(input.contentText),
    current_content_json: asJson(input.contentJson),
    data_cutoff_at: input.dataCutoffAt ?? null,
    period_end: input.periodEnd ?? null,
    period_start: input.periodStart ?? null,
    scope_json: asNullableJson(input.scopeJson),
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

export async function prepareCommunicationReuse(
  documentId: string,
  mode: CommunicationReuseMode
): Promise<CommunicationReusePreparationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const detailResult = await getDocumentDetail(documentId)
  if ("error" in detailResult) return { error: detailResult.error ?? "Document introuvable" }

  const document = detailResult.data
  if (!["communication", "commercial_pitch", "campaign", "internal_note"].includes(document.documentType)) {
    return { error: "Cette action est disponible uniquement sur les communications enregistrées" }
  }

  const latestVersion = document.versions[0] ?? null
  const sourceBrief = isCommunicationBrief(latestVersion?.sourceRunInputSnapshot)
    ? latestVersion.sourceRunInputSnapshot
    : isCommunicationBrief(latestVersion?.briefJson)
      ? latestVersion.briefJson
      : null

  let companyId =
    document.primaryEntity?.type === "company"
      ? document.primaryEntity.id
      : document.links.find((link) => link.entityType === "company")?.entityId ?? null

  if (!companyId) {
    const contactId =
      document.primaryEntity?.type === "contact"
        ? document.primaryEntity.id
        : document.links.find((link) => link.entityType === "contact")?.entityId ?? null

    if (contactId) {
      const { data: contactRow, error: contactError } = await auth.supabase
        .from("contacts")
        .select("company_id")
        .eq("id", contactId)
        .maybeSingle()

      if (contactError) return { error: contactError.message }
      companyId = contactRow?.company_id ?? null
    }
  }

  if (!companyId) {
    return { error: "Aucun compte lié ne permet de contextualiser cette reprise" }
  }

  const [{ data: companyRow, error: companyError }, { data: contactsRows, error: contactsError }, { data: profileRow }] =
    await Promise.all([
      auth.supabase
        .from("companies")
        .select("id, name, lifecycle_status")
        .eq("id", companyId)
        .maybeSingle(),
      auth.supabase
        .from("contacts")
        .select("id, job_title, relationship_role, person:persons(full_name, first_name, last_name, primary_email)")
        .eq("company_id", companyId)
        .order("is_priority", { ascending: false, nullsFirst: false }),
      auth.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.userId)
        .maybeSingle(),
    ])

  if (companyError) return { error: companyError.message }
  if (contactsError) return { error: contactsError.message }
  if (!companyRow) return { error: "Compte introuvable" }

  const company = companyRow as CompanyContextRow
  const baseBrief = sourceBrief ?? buildDefaultBrief(
    { company: { lifecycleStatus: company.lifecycle_status, name: company.name } },
    typeof profileRow?.full_name === "string" ? profileRow.full_name : ""
  )

  const previousMessage =
    normalizeText(document.currentContentText) ??
    normalizeText(latestVersion?.contentText) ??
    ""

  const initialBrief = prepareReuseBrief(baseBrief, mode, {
    documentId: document.id,
    sourceRunId: latestVersion?.sourceRunId ?? null,
    previousMessage,
  })

  const labels: Record<CommunicationReuseMode, { title: string; description: string }> = {
    variant: {
      title: "Créer une variante",
      description: "Le brief d'origine est repris; le texte précédent sert de comparaison.",
    },
    adapt_contact: {
      title: "Adapter à un autre contact",
      description: "Choisissez le nouveau destinataire avant de générer.",
    },
    reuse_account: {
      title: "Réutiliser pour ce compte",
      description: "Le contexte compte est conservé, le message est reconstruit.",
    },
    follow_up: {
      title: "Relancer à partir de ce message",
      description: "La relance repart du brief source sans recopier le message initial.",
    },
  }

  return {
    data: {
      data: {
        company: {
          id: company.id,
          name: company.name,
          lifecycleStatus: company.lifecycle_status,
        },
        contacts: ((contactsRows ?? []) as ContactContextRow[]).map((contact) => {
          const person = pickOne(contact.person)
          return {
            id: contact.id,
            fullName: formatPersonName(contact.person),
            jobTitle: contact.job_title,
            relationshipRole: contact.relationship_role,
            email: person?.primary_email ?? null,
          }
        }),
      },
      initialBrief,
      ...labels[mode],
    },
  }
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

export async function deleteDocument(
  documentId: string
): Promise<DocumentMutationResult> {
  const auth = await requireAuthenticatedClient()
  if ("error" in auth) return { error: auth.error ?? "Non authentifié" }

  const { data: current, error: currentError } = await auth.supabase
    .from("intelligence_documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle()

  if (currentError) return { error: currentError.message }
  if (!current) return { error: "Document introuvable" }

  const { error } = await auth.supabase
    .from("intelligence_documents")
    .delete()
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
        "id, title, document_type, tags, current_content_text, current_content_json, data_cutoff_at, period_end, period_start, primary_entity_type, primary_entity_id, scope_json"
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

  const document = documentResult.data as DuplicateSourceDocumentRow
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
    scopeJson: document.scope_json,
    dataCutoffAt: document.data_cutoff_at,
    periodStart: document.period_start,
    periodEnd: document.period_end,
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
