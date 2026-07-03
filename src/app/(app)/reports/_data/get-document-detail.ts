import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type {
  DocumentDetail,
  DocumentDetailResult,
  DocumentLink,
  DocumentListItem,
  DocumentVersion,
} from "./reports-types"

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null; count: number | null }
type SingleResult<T> = { data: T | null; error: SupabaseError | null }
type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): ReadQuery<T>
  in(column: string, values: readonly string[]): ReadQuery<T>
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ReadQuery<T>
  maybeSingle(): PromiseLike<SingleResult<T>>
}
type ReadTable = {
  select<T>(
    columns: string,
    options?: { count?: "exact"; head?: boolean }
  ): ReadQuery<T>
}
type LooseSupabaseClient = { from(table: string): ReadTable }

type OwnerRelation =
  | { full_name: string | null; email: string | null }
  | Array<{ full_name: string | null; email: string | null }>
  | null
type PersonRelation =
  | { full_name: string | null; first_name: string | null; last_name: string | null }
  | Array<{ full_name: string | null; first_name: string | null; last_name: string | null }>
  | null

type DocumentRow = {
  id: string
  title: string
  document_type: Database["public"]["Enums"]["intelligence_document_type"]
  status: Database["public"]["Enums"]["intelligence_document_status"]
  version_number: number
  is_favorite: boolean
  tags: string[]
  primary_entity_type: Database["public"]["Enums"]["intelligence_entity_type"] | null
  primary_entity_id: string | null
  current_content_text: string | null
  current_content_json: unknown
  created_at: string
  updated_at: string
  owner: OwnerRelation
}

type VersionRow = {
  id: string
  version_number: number
  origin: Database["public"]["Enums"]["intelligence_document_version_origin"]
  content_text: string | null
  content_json: unknown
  brief_json: unknown | null
  source_refs: unknown
  qa_flags: unknown
  change_note: string | null
  created_at: string
  creator: OwnerRelation
}

type LinkRow = {
  entity_type: Database["public"]["Enums"]["intelligence_entity_type"]
  entity_id: string
}

type EntityReference = {
  entityType: Database["public"]["Enums"]["intelligence_entity_type"]
  entityId: string
}

type CompanyLabelRow = { id: string; name: string | null }
type GenericTitleRow = { id: string; title: string | null }
type SectorLabelRow = { id: string; name: string | null }
type ContactLabelRow = { id: string; person: PersonRelation }
type CollaboratorLabelRow = { id: string; current_title: string | null; person: PersonRelation }
type CandidateLabelRow = { id: string; current_title: string | null; person: PersonRelation }

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function normalizePersonLabel(person: PersonRelation, fallback: string): string {
  const resolved = pickOne(person)
  if (!resolved) return fallback
  return (
    resolved.full_name?.trim() ||
    `${resolved.first_name ?? ""} ${resolved.last_name ?? ""}`.trim() ||
    fallback
  )
}

function entityKey(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`
}

function fallbackEntityLabel(entityType: string): string {
  switch (entityType) {
    case "company":
      return "Compte introuvable"
    case "contact":
      return "Contact introuvable"
    case "opportunity":
      return "Opportunité introuvable"
    case "mission":
      return "Mission introuvable"
    case "project":
      return "Projet introuvable"
    case "collaborator":
      return "Collaborateur introuvable"
    case "candidate":
      return "Candidat introuvable"
    case "sector":
      return "Secteur introuvable"
    case "calendar_event":
      return "Événement introuvable"
    default:
      return "Élément introuvable"
  }
}

function getOwnerName(owner: OwnerRelation): string {
  const resolved = pickOne(owner)
  return resolved?.full_name?.trim() || resolved?.email?.trim() || "Utilisateur inconnu"
}

function computeQualityOk(qaFlags: unknown): boolean | null {
  if (!Array.isArray(qaFlags) || qaFlags.length === 0) return null
  const parsed = qaFlags
    .map((flag) => {
      if (!flag || typeof flag !== "object" || Array.isArray(flag)) return null
      const passed = (flag as { passed?: unknown }).passed
      return typeof passed === "boolean" ? passed : null
    })
    .filter((flag): flag is boolean => flag !== null)

  if (parsed.length === 0) return null
  return parsed.every(Boolean)
}

function normalizeUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

async function resolveEntityLabels(
  supabase: LooseSupabaseClient,
  refs: EntityReference[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  if (refs.length === 0) return labels

  const buckets = new Map<string, string[]>()
  for (const ref of refs) {
    const current = buckets.get(ref.entityType) ?? []
    if (!current.includes(ref.entityId)) current.push(ref.entityId)
    buckets.set(ref.entityType, current)
  }

  const tasks: Promise<void>[] = []

  const companyIds = buckets.get("company")
  if (companyIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("companies")
        .select<CompanyLabelRow>("id, name")
        .in("id", companyIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(entityKey("company", row.id), row.name?.trim() || fallbackEntityLabel("company"))
      }
    })())
  }

  const contactIds = buckets.get("contact")
  if (contactIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select<ContactLabelRow>("id, person:persons(full_name, first_name, last_name)")
        .in("id", contactIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(
          entityKey("contact", row.id),
          normalizePersonLabel(row.person, fallbackEntityLabel("contact"))
        )
      }
    })())
  }

  const opportunityIds = buckets.get("opportunity")
  if (opportunityIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select<GenericTitleRow>("id, title")
        .in("id", opportunityIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(entityKey("opportunity", row.id), row.title?.trim() || fallbackEntityLabel("opportunity"))
      }
    })())
  }

  const missionIds = buckets.get("mission")
  if (missionIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("missions")
        .select<GenericTitleRow>("id, title")
        .in("id", missionIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(entityKey("mission", row.id), row.title?.trim() || fallbackEntityLabel("mission"))
      }
    })())
  }

  const projectIds = buckets.get("project")
  if (projectIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("projects")
        .select<GenericTitleRow>("id, title")
        .in("id", projectIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(entityKey("project", row.id), row.title?.trim() || fallbackEntityLabel("project"))
      }
    })())
  }

  const collaboratorIds = buckets.get("collaborator")
  if (collaboratorIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select<CollaboratorLabelRow>(
          "id, current_title, person:persons(full_name, first_name, last_name)"
        )
        .in("id", collaboratorIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        const personLabel = normalizePersonLabel(row.person, "")
        labels.set(
          entityKey("collaborator", row.id),
          personLabel || row.current_title?.trim() || fallbackEntityLabel("collaborator")
        )
      }
    })())
  }

  const candidateIds = buckets.get("candidate")
  if (candidateIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select<CandidateLabelRow>(
          "id, current_title, person:persons(full_name, first_name, last_name)"
        )
        .in("id", candidateIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        const personLabel = normalizePersonLabel(row.person, "")
        labels.set(
          entityKey("candidate", row.id),
          personLabel || row.current_title?.trim() || fallbackEntityLabel("candidate")
        )
      }
    })())
  }

  const sectorIds = buckets.get("sector")
  if (sectorIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("sector_intelligence")
        .select<SectorLabelRow>("id, name")
        .in("id", sectorIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(entityKey("sector", row.id), row.name?.trim() || fallbackEntityLabel("sector"))
      }
    })())
  }

  const calendarEventIds = buckets.get("calendar_event")
  if (calendarEventIds?.length) {
    tasks.push((async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select<GenericTitleRow>("id, title")
        .in("id", calendarEventIds)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) {
        labels.set(
          entityKey("calendar_event", row.id),
          row.title?.trim() || fallbackEntityLabel("calendar_event")
        )
      }
    })())
  }

  await Promise.all(tasks)
  return labels
}

function buildDocumentListItem(
  row: DocumentRow,
  latestVersion: VersionRow | null,
  labelMap: Map<string, string>
): DocumentListItem {
  const primaryEntity =
    row.primary_entity_type && row.primary_entity_id
      ? {
          type: row.primary_entity_type,
          id: row.primary_entity_id,
          label:
            labelMap.get(entityKey(row.primary_entity_type, row.primary_entity_id)) ??
            fallbackEntityLabel(row.primary_entity_type),
        }
      : null

  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    status: row.status,
    versionNumber: row.version_number,
    isFavorite: row.is_favorite,
    tags: row.tags ?? [],
    primaryEntity,
    qualityOk: computeQualityOk(latestVersion?.qa_flags ?? null),
    ownerName: getOwnerName(row.owner),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildVersions(rows: VersionRow[]): DocumentVersion[] {
  return [...rows]
    .sort((a, b) => b.version_number - a.version_number)
    .map((row) => ({
      id: row.id,
      versionNumber: row.version_number,
      origin: row.origin,
      contentText: row.content_text,
      contentJson: row.content_json,
      briefJson: row.brief_json,
      sourceRefs: normalizeUnknownArray(row.source_refs),
      qaFlags: normalizeUnknownArray(row.qa_flags),
      changeNote: row.change_note,
      createdByName: getOwnerName(row.creator),
      createdAt: row.created_at,
    }))
}

function buildLinks(rows: LinkRow[], labelMap: Map<string, string>): DocumentLink[] {
  return rows.map((row) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    label: labelMap.get(entityKey(row.entity_type, row.entity_id)) ?? fallbackEntityLabel(row.entity_type),
  }))
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetailResult> {
  if (!documentId?.trim()) {
    return { error: "Identifiant de document manquant" }
  }

  try {
    const supabase = (await createClient()) as unknown as LooseSupabaseClient

    const documentResult = await supabase
      .from("intelligence_documents")
      .select<DocumentRow>(
        `
          id,
          title,
          document_type,
          status,
          version_number,
          is_favorite,
          tags,
          primary_entity_type,
          primary_entity_id,
          current_content_text,
          current_content_json,
          created_at,
          updated_at,
          owner:profiles!intelligence_documents_owner_id_fkey(full_name, email)
        `
      )
      .eq("id", documentId)
      .maybeSingle()

    if (documentResult.error) return { error: documentResult.error.message }
    if (!documentResult.data) return { error: "Document introuvable" }

    const [versionsResult, linksResult] = await Promise.all([
      supabase
        .from("intelligence_document_versions")
        .select<VersionRow>(
          `
            id,
            version_number,
            origin,
            content_text,
            content_json,
            brief_json,
            source_refs,
            qa_flags,
            change_note,
            created_at,
            creator:profiles!intelligence_document_versions_created_by_fkey(full_name, email)
          `
        )
        .eq("document_id", documentId)
        .order("version_number", { ascending: false }),
      supabase
        .from("intelligence_document_links")
        .select<LinkRow>("entity_type, entity_id")
        .eq("document_id", documentId),
    ])

    if (versionsResult.error) return { error: versionsResult.error.message }
    if (linksResult.error) return { error: linksResult.error.message }

    const versionRows = versionsResult.data ?? []
    const linkRows = linksResult.data ?? []
    const latestVersion = versionRows[0] ?? null

    const refs: EntityReference[] = [
      ...linkRows.map((row) => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
      })),
    ]

    if (documentResult.data.primary_entity_type && documentResult.data.primary_entity_id) {
      refs.push({
        entityType: documentResult.data.primary_entity_type,
        entityId: documentResult.data.primary_entity_id,
      })
    }

    const labelMap = await resolveEntityLabels(supabase, refs)
    const base = buildDocumentListItem(documentResult.data, latestVersion, labelMap)
    const detail: DocumentDetail = {
      ...base,
      currentContentText: documentResult.data.current_content_text,
      currentContentJson: documentResult.data.current_content_json,
      links: buildLinks(linkRows, labelMap),
      versions: buildVersions(versionRows),
    }

    return { data: detail }
  } catch (error) {
    console.error("[reports] getDocumentDetail failed:", error)
    return {
      error: error instanceof Error ? error.message : "Impossible de charger le détail du document",
    }
  }
}
