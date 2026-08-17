import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import {
  deriveCollectionMode,
  EMPTY_SOURCE_MANAGEMENT_SNAPSHOT,
  isKredoSourceCategory,
  type CorpusAutomationFit,
  type CorpusPackType,
  type CorpusQualityVerdict,
  type SourceCatalogEntry,
  type SourceCorpusItemView,
  type SourceCorpusView,
  type SourceManagementSnapshot,
} from "../domain/source-management-contracts"

type SourceCatalogRow = Database["public"]["Tables"]["source_catalog"]["Row"]
type SourceCorporaRow = Database["public"]["Tables"]["source_corpora"]["Row"]
type SourceCorpusItemRow = Database["public"]["Tables"]["source_corpus_items"]["Row"]

function mapSource(row: SourceCatalogRow): SourceCatalogEntry {
  return {
    id: row.id,
    sourceKey: row.source_key,
    name: row.name,
    publisher: row.publisher,
    domain: row.domain,
    searchDomain: row.search_domain,
    collectionUrl: row.collection_url,
    collectionMode: deriveCollectionMode(row.collection_url),
    homepageUrl: row.homepage_url,
    family: row.family,
    kredoCategory: isKredoSourceCategory(row.kredo_category) ? row.kredo_category : null,
    origin: row.origin,
    contentTemporality: row.content_temporality,
    usageScopes: row.usage_scopes ?? [],
    validationStatus: (row.validation_status as SourceCatalogEntry["validationStatus"]) ?? "pending",
    isActive: row.is_active,
    isLocked: row.is_locked,
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
  }
}

async function resolveWorkspace(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.workspace_id) return null
  return { workspaceId: profile.workspace_id, isAdmin: profile.role === "owner" || profile.role === "admin" }
}

export async function getSourceManagementSnapshot(): Promise<SourceManagementSnapshot> {
  const supabase = await createClient()
  const workspace = await resolveWorkspace(supabase)
  if (!workspace) return EMPTY_SOURCE_MANAGEMENT_SNAPSHOT

  const [sourcesResult, corporaResult] = await Promise.all([
    supabase.from("source_catalog").select("*").order("name", { ascending: true }),
    supabase
      .from("source_corpora")
      .select("*")
      .in("scope_kind", ["sector", "system"])
      .eq("is_current", true)
      .order("snapshot_date", { ascending: false }),
  ])

  if (sourcesResult.error) {
    console.error("[source-management] chargement source_catalog:", sourcesResult.error.message)
  }
  if (corporaResult.error) {
    console.error("[source-management] chargement source_corpora:", corporaResult.error.message)
  }

  const sourceRows = sourcesResult.data ?? []
  const corpusRows: SourceCorporaRow[] = corporaResult.data ?? []
  const sourcesById = new Map(sourceRows.map((row) => [row.id, mapSource(row)]))

  const corpusIds = corpusRows.map((row) => row.id)
  const sectorIds = Array.from(new Set(corpusRows.map((row) => row.sector_id).filter((id): id is string => Boolean(id))))

  const [itemsResult, sectorsResult, accountsFedResult] = await Promise.all([
    corpusIds.length > 0
      ? supabase.from("source_corpus_items").select("*").in("corpus_id", corpusIds)
      : Promise.resolve({ data: [] as SourceCorpusItemRow[], error: null }),
    sectorIds.length > 0
      ? supabase.from("sector_intelligence").select("id, name").in("id", sectorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
    // Réutilise la vue effective plutôt que de reconstruire l'héritage segment→macro côté UI.
    corpusIds.length > 0
      ? supabase
          .from("v_effective_watch_sources")
          .select("corpus_id, company_id")
          .eq("usage_scope", "account_watch")
          .in("corpus_id", corpusIds)
      : Promise.resolve({ data: [] as Array<{ corpus_id: string | null; company_id: string | null }>, error: null }),
  ])

  const itemRows: SourceCorpusItemRow[] = itemsResult.data ?? []
  const sectorNameById = new Map((sectorsResult.data ?? []).map((row) => [row.id, row.name]))

  const accountsFedByCorpus = new Map<string, Set<string>>()
  for (const row of accountsFedResult.data ?? []) {
    if (!row.corpus_id || !row.company_id) continue
    const set = accountsFedByCorpus.get(row.corpus_id) ?? new Set<string>()
    set.add(row.company_id)
    accountsFedByCorpus.set(row.corpus_id, set)
  }

  const itemsByCorpus = new Map<string, SourceCorpusItemRow[]>()
  for (const item of itemRows) {
    const bucket = itemsByCorpus.get(item.corpus_id) ?? []
    bucket.push(item)
    itemsByCorpus.set(item.corpus_id, bucket)
  }

  const sectorCorpora: SourceCorpusView[] = corpusRows.map((corpus) => {
    const rawItems = itemsByCorpus.get(corpus.id) ?? []
    const items: SourceCorpusItemView[] = rawItems.map((item) => {
      const source = sourcesById.get(item.source_id) ?? null
      return {
        id: item.id,
        sourceId: item.source_id,
        source,
        externalSrcId: item.external_src_id,
        pack: item.pack as CorpusPackType,
        tier: item.tier,
        utilityScore: item.utility_score,
        automationFit: item.automation_fit as CorpusAutomationFit | null,
        newsEligible: item.news_eligible,
        accountWatchEligible: item.account_watch_eligible,
        isEnabled: item.is_enabled,
        exclusionReason: item.exclusion_reason,
        isCollectable: source ? source.contentTemporality !== "static" : false,
      }
    })

    return {
      id: corpus.id,
      slug: corpus.slug,
      version: corpus.version,
      snapshotDate: corpus.snapshot_date,
      sectorId: corpus.sector_id,
      sectorName: corpus.sector_id ? sectorNameById.get(corpus.sector_id) ?? null : null,
      qualityVerdict: corpus.quality_verdict as CorpusQualityVerdict,
      activationState: corpus.activation_state,
      enabledForNews: corpus.enabled_for_news,
      enabledForAccountWatch: corpus.enabled_for_account_watch,
      totalSources: items.length,
      collectableSources: items.filter((item) => item.isCollectable).length,
      activeSources: items.filter((item) => item.isEnabled).length,
      accountsFed: accountsFedByCorpus.get(corpus.id)?.size ?? 0,
      items,
    }
  })

  const systemSources = sourceRows.filter((row) => row.origin === "system").map(mapSource)
  const manualSources = sourceRows.filter((row) => row.origin === "manual").map(mapSource)
  const activeNewsSourceCount = sourceRows.filter(
    (row) => row.is_active && (row.usage_scopes ?? []).includes("news"),
  ).length

  return {
    systemSources,
    manualSources,
    sectorCorpora,
    activeNewsSourceCount,
    canManage: workspace.isAdmin,
  }
}
