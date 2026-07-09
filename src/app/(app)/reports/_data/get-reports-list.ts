import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import { SCENARIO_REGISTRY } from "@/lib/communication/communication-scenario-registry"
import type {
  DocumentListItem,
  ReportsFilterState,
  ReportsKpis,
  ReportsListResult,
} from "./reports-types"
import { REPORTS_DEFAULT_PAGE_SIZE } from "./reports-types"

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null; count: number | null }
type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): ReadQuery<T>
  in(column: string, values: readonly string[]): ReadQuery<T>
  gte(column: string, value: string): ReadQuery<T>
  lte(column: string, value: string): ReadQuery<T>
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ReadQuery<T>
  range(from: number, to: number): ReadQuery<T>
  textSearch(
    column: string,
    query: string,
    options?: { config?: string; type?: "plain" | "phrase" | "websearch" }
  ): ReadQuery<T>
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
  created_at: string
  updated_at: string
  owner: OwnerRelation
}

type LatestVersionRow = {
  document_id: string
  version_number: number
  qa_flags: unknown
  brief_json: unknown
}

type LinkRow = {
  document_id: string
}

type EntityReference = {
  entityType: Database["public"]["Enums"]["intelligence_entity_type"]
  entityId: string
}

type CompanyLabelRow = { id: string; name: string | null }
type GenericTitleRow = { id: string; title: string | null }
type SectorLabelRow = { id: string; name: string | null }
type PersonRelation =
  | { full_name: string | null; first_name: string | null; last_name: string | null }
  | Array<{ full_name: string | null; first_name: string | null; last_name: string | null }>
  | null
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

function cleanSearch(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toStartOfDay(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.includes("T")) return trimmed
  return new Date(`${trimmed}T00:00:00`).toISOString()
}

function toEndOfDay(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.includes("T")) return trimmed
  return new Date(`${trimmed}T23:59:59.999`).toISOString()
}

function sanitizePage(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1
}

function sanitizePageSize(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value <= 0) return REPORTS_DEFAULT_PAGE_SIZE
  return Math.min(Math.floor(value), 100)
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

function getOwnerName(owner: OwnerRelation): string {
  const resolved = pickOne(owner)
  return resolved?.full_name?.trim() || resolved?.email?.trim() || "Utilisateur inconnu"
}

function applyDocumentFilters<T>(
  query: ReadQuery<T>,
  filters: ReportsFilterState,
  linkedDocumentIds: string[] | null,
  options?: { includeStatus?: boolean }
) {
  let next = query

  if (linkedDocumentIds !== null) {
    if (linkedDocumentIds.length === 0) {
      next = next.in("id", ["00000000-0000-0000-0000-000000000000"])
    } else {
      next = next.in("id", linkedDocumentIds)
    }
  }

  const search = cleanSearch(filters.search)
  if (search) {
    next = next.textSearch("search_vector", search, {
      config: "french",
      type: "websearch",
    })
  }

  if (filters.documentType) next = next.eq("document_type", filters.documentType)
  if (options?.includeStatus !== false && filters.status) next = next.eq("status", filters.status)
  if (filters.ownerId) next = next.eq("owner_id", filters.ownerId)
  if (filters.favoritesOnly) next = next.eq("is_favorite", true)

  const periodFrom = toStartOfDay(filters.periodFrom)
  if (periodFrom) next = next.gte("updated_at", periodFrom)

  const periodTo = toEndOfDay(filters.periodTo)
  if (periodTo) next = next.lte("updated_at", periodTo)

  return next
}

async function getLinkedDocumentIds(
  supabase: LooseSupabaseClient,
  filters: ReportsFilterState
): Promise<string[] | null> {
  if (!filters.entityType && !filters.entityId) return null

  let query = supabase
    .from("intelligence_document_links")
    .select<LinkRow>("document_id")

  if (filters.entityType) query = query.eq("entity_type", filters.entityType)
  if (filters.entityId) query = query.eq("entity_id", filters.entityId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return Array.from(new Set((data ?? []).map((row) => row.document_id)))
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

function extractScenarioLabel(version: LatestVersionRow | undefined): string | null {
  if (!version) return null
  const raw = version.brief_json
  if (!raw || typeof raw !== "object") return null
  const brief = raw as Record<string, any>
  // CommunicationBrief shape: brief.what.scenario
  const scenario = brief.what?.scenario ?? brief.preset?.scenario ?? brief.scenario
  if (typeof scenario !== "string" || !scenario) return null
  return SCENARIO_REGISTRY.find((item) => item.value === scenario)?.label ?? null
}

function buildListItem(
  row: DocumentRow,
  labelMap: Map<string, string>,
  latestVersionByDocumentId: Map<string, LatestVersionRow>
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

  const latestVersion = latestVersionByDocumentId.get(row.id)

  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    status: row.status,
    versionNumber: row.version_number,
    isFavorite: row.is_favorite,
    tags: row.tags ?? [],
    primaryEntity,
    qualityOk: computeQualityOk(latestVersion?.qa_flags),
    ownerName: getOwnerName(row.owner),
    scenarioLabel: extractScenarioLabel(latestVersion),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getMonthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

async function getKpis(
  supabase: LooseSupabaseClient,
  filters: ReportsFilterState,
  linkedDocumentIds: string[] | null
): Promise<ReportsKpis> {
  const buildCountQuery = () =>
    applyDocumentFilters(
      supabase.from("intelligence_documents").select("id", {
        count: "exact",
        head: true,
      }),
      filters,
      linkedDocumentIds,
      { includeStatus: false }
    )

  const monthStart = getMonthStartIso()

  const [totalResult, draftsResult, readyResult, usedThisMonthResult] = await Promise.all([
    buildCountQuery(),
    buildCountQuery().eq("status", "draft"),
    buildCountQuery().eq("status", "ready"),
    buildCountQuery().eq("status", "used").gte("last_used_at", monthStart),
  ])

  if (totalResult.error) throw new Error(totalResult.error.message)
  if (draftsResult.error) throw new Error(draftsResult.error.message)
  if (readyResult.error) throw new Error(readyResult.error.message)
  if (usedThisMonthResult.error) throw new Error(usedThisMonthResult.error.message)

  return {
    total: totalResult.count ?? 0,
    drafts: draftsResult.count ?? 0,
    ready: readyResult.count ?? 0,
    usedThisMonth: usedThisMonthResult.count ?? 0,
  }
}

export async function getReportsList(input?: {
  filters?: ReportsFilterState
  page?: number
  pageSize?: number
}): Promise<ReportsListResult> {
  try {
    const supabase = (await createClient()) as unknown as LooseSupabaseClient
    const filters = input?.filters ?? {}
    const page = sanitizePage(input?.page)
    const pageSize = sanitizePageSize(input?.pageSize)
    const rangeFrom = (page - 1) * pageSize
    const rangeTo = rangeFrom + pageSize - 1

    const linkedDocumentIds = await getLinkedDocumentIds(supabase, filters)

    const documentsQuery = applyDocumentFilters(
      supabase
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
            created_at,
            updated_at,
            owner:profiles!intelligence_documents_owner_id_fkey(full_name, email)
          `,
          { count: "exact" }
        )
        .order("updated_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      filters,
      linkedDocumentIds
    )

    const [documentsResult, kpis] = await Promise.all([
      documentsQuery,
      getKpis(supabase, filters, linkedDocumentIds),
    ])

    if (documentsResult.error) {
      return { error: documentsResult.error.message }
    }

    const rows = documentsResult.data ?? []
    const documentIds = rows.map((row) => row.id)

    const [latestVersionsResult, labelMap] = await Promise.all([
      documentIds.length
        ? supabase
            .from("intelligence_document_versions")
            .select<LatestVersionRow>("document_id, version_number, qa_flags, brief_json")
            .in("document_id", documentIds)
            .order("version_number", { ascending: false })
        : Promise.resolve({
            data: [] as LatestVersionRow[],
            error: null,
            count: null,
          }),
      resolveEntityLabels(
        supabase,
        rows
          .filter(
            (row): row is DocumentRow & {
              primary_entity_type: Database["public"]["Enums"]["intelligence_entity_type"]
              primary_entity_id: string
            } => Boolean(row.primary_entity_type && row.primary_entity_id)
          )
          .map((row) => ({
            entityType: row.primary_entity_type,
            entityId: row.primary_entity_id,
          }))
      ),
    ])

    if (latestVersionsResult.error) {
      return { error: latestVersionsResult.error.message }
    }

    const latestVersionByDocumentId = new Map<string, LatestVersionRow>()
    for (const version of latestVersionsResult.data ?? []) {
      if (!latestVersionByDocumentId.has(version.document_id)) {
        latestVersionByDocumentId.set(version.document_id, version)
      }
    }

    return {
      data: {
        items: rows.map((row) => buildListItem(row, labelMap, latestVersionByDocumentId)),
        totalCount: documentsResult.count ?? 0,
        page,
        pageSize,
        kpis,
      },
    }
  } catch (error) {
    console.error("[reports] getReportsList failed:", error)
    return {
      error:
        error instanceof Error ? error.message : "Impossible de charger la liste des documents",
    }
  }
}
