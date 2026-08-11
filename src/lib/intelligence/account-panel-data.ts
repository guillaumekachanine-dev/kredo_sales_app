import "server-only"

import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import {
  normalizeContactRelationshipRole,
  type ContactRelationshipRole,
} from "@/lib/accounts-contacts/contact-constants"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import type {
  AccountIntelligencePanelData,
  AccountIntelligencePanelDataResult,
  PanelActivityItem,
  PanelContact,
  PanelEvent,
  PanelOpportunity,
  PanelResourceCounter,
  PanelResourceCounts,
  PanelRunSummary,
} from "./account-panel-types"
import {
  classifyIntelligenceResultType,
  isLegacyPhase4RoadmapFallback,
  type IntelligenceResourceCategory,
} from "./intelligence-resource-types"

export const KEY_CONTACT_RELATIONSHIP_ROLES = [
  "dsi",
  "decideur",
  "direction_metier",
] as const

type SupabaseError = { message: string }
type QueryResult<T> = { data: T[] | null; error: SupabaseError | null }
type SingleResult<T> = { data: T | null; error: SupabaseError | null }

type ReadQuery<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): ReadQuery<T>
  neq(column: string, value: string | number | boolean): ReadQuery<T>
  gte(column: string, value: string): ReadQuery<T>
  in(column: string, values: readonly string[]): ReadQuery<T>
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ReadQuery<T>
  limit(count: number): ReadQuery<T>
  maybeSingle(): PromiseLike<SingleResult<T>>
}

type ReadTable = {
  select<T>(columns: string): ReadQuery<T>
}

type LooseSupabaseClient = {
  from(table: string): ReadTable
}

type CompanyRow = {
  id: string
  name: string
  sector: string | null
  sector_id: string | null
  segment_id: string | null
  segment: string | null
  priority: string
  lifecycle_status: string
  legacy_folio_score: number | string | null
  website: string | null
  metadata: Json
}

export type PanelResultRow = {
  id: string
  result_type: string
  status: string
  needs_review: boolean
  phase: number
  created_at: string
  completed_at: string | null
}

// Fiche sectorielle EFFECTIVE : celle dont le playbook est réellement servi.
// Lot 0 — elle est dérivée de `v_sector_knowledge_resolved` : le segment quand
// il porte un playbook, son macro parent sinon. Lire le statut ou le slug du
// segment brut éteindrait le drapeau et casserait le lien
// `/ressources/playbook/[slug]` pour les 36 segments issus du seed.
type SectorRow = {
  id: string
  name: string
  slug: string
  status: string
  playbook: Json
}

type SectorKnowledgeResolvedRow = {
  segment_id: string
  segment_name: string
  segment_slug: string
  segment_status: string
  macro_id: string | null
  macro_name: string | null
  macro_slug: string | null
  macro_status: string | null
  playbook: Json
  playbook_level: string
  has_segment_knowledge: boolean
}

export type PanelContactRow = {
  id: string
  person_id: string
  job_title: string | null
  relationship_role: string | null
  is_priority: boolean | null
  persons:
    | {
        full_name: string | null
        first_name: string | null
        last_name: string | null
        primary_email: string | null
      }
    | Array<{
        full_name: string | null
        first_name: string | null
        last_name: string | null
        primary_email: string | null
      }>
    | null
}

export type PanelOpportunityRow = {
  id: string
  title: string
  stage: string
  priority: string
  next_action_label: string | null
  next_action_at: string | null
  target_close_date: string | null
  created_at: string
}

export type PanelEventRow = {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  contact_id: string | null
  opportunity_id: string | null
}

type RunRow = {
  id: string
  run_type: string
  status: string
  needs_review: boolean
  current_phase: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  error_message: string | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isNonEmptyJson(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "string") return value.trim().length > 0
  if (!value || typeof value !== "object") return false
  return Object.keys(value).length > 0
}

function hasMetadataValue(metadata: JsonRecord, key: string): boolean {
  return isNonEmptyJson(metadata[key])
}

function createEmptyResourceCounter(): PanelResourceCounter {
  return {
    engine: {
      succeeded: 0,
      needsReview: 0,
      failed: 0,
      available: 0,
      latestResultAt: null,
      resultTypes: [],
    },
    legacy: {
      available: false,
      count: 0,
      source: null,
      note: null,
    },
  }
}

function markLatest(counter: PanelResourceCounter, row: PanelResultRow) {
  const timestamp = row.completed_at ?? row.created_at
  if (!counter.engine.latestResultAt || timestamp > counter.engine.latestResultAt) {
    counter.engine.latestResultAt = timestamp
  }
  if (!counter.engine.resultTypes.includes(row.result_type)) {
    counter.engine.resultTypes.push(row.result_type)
  }
}

export function buildPanelResourceCounts(
  rows: PanelResultRow[],
  companyMetadata: unknown,
): PanelResourceCounts {
  const counts: PanelResourceCounts = {
    analyses: createEmptyResourceCounter(),
    communications: createEmptyResourceCounter(),
    reports: createEmptyResourceCounter(),
    roadmaps: createEmptyResourceCounter(),
  }
  const seenIds = new Set<string>()

  for (const row of rows) {
    if (seenIds.has(row.id)) continue
    seenIds.add(row.id)

    const category = classifyIntelligenceResultType(row.result_type)
    if (category) {
      const counter = counts[category]
      markLatest(counter, row)
      if (row.status === "failed") counter.engine.failed += 1
      else if (row.status === "succeeded" && row.needs_review) counter.engine.needsReview += 1
      else if (row.status === "succeeded") counter.engine.succeeded += 1
      counter.engine.available = counter.engine.succeeded + counter.engine.needsReview
    }

    if (isLegacyPhase4RoadmapFallback(row)) {
      counts.roadmaps.legacy = {
        available: true,
        count: 1,
        source: "phase4_legacy",
        note: "Fallback transitoire: ancienne presence roadmap par phase 4, non durable.",
      }
    }
  }

  const metadata = asRecord(companyMetadata)
  if (hasMetadataValue(metadata, "analysis_data")) {
    counts.analyses.legacy = {
      available: true,
      count: 1,
      source: "folio_metadata",
      note: "Analyse client legacy FOLIO stockee dans companies.metadata.analysis_data.",
    }
  }
  if (Array.isArray(metadata.pitches) && metadata.pitches.length > 0) {
    counts.communications.legacy = {
      available: true,
      count: metadata.pitches.length,
      source: "folio_metadata",
      note: "Pitchs/mails legacy FOLIO stockes dans companies.metadata.pitches.",
    }
  }
  if (hasMetadataValue(metadata, "roadmap")) {
    counts.roadmaps.legacy = {
      available: true,
      count: 1,
      source: "folio_metadata",
      note: "Fallback roadmap legacy FOLIO. La cible durable reste result_type='roadmap'.",
    }
  }

  return counts
}

/**
 * Réduit une ligne de `v_sector_knowledge_resolved` à la fiche dont le playbook
 * est effectivement servi, statut et slug compris.
 */
export function toEffectiveSectorRow(row: SectorKnowledgeResolvedRow | null): SectorRow | null {
  if (!row) return null
  const fromSegment = row.playbook_level === "segment"
  return {
    id: fromSegment ? row.segment_id : row.macro_id ?? row.segment_id,
    name: fromSegment ? row.segment_name : row.macro_name ?? row.segment_name,
    slug: fromSegment ? row.segment_slug : row.macro_slug ?? row.segment_slug,
    status: fromSegment ? row.segment_status : row.macro_status ?? row.segment_status,
    playbook: row.playbook,
  }
}

export function hasStructuredSectorPlaybook(sector: SectorRow | null): boolean {
  return Boolean(
    sector &&
      sector.status === "active" &&
      isNonEmptyJson(sector.playbook),
  )
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function isKeyContactRole(value: string | null): value is KeyContactRelationshipRole {
  return KEY_CONTACT_RELATIONSHIP_ROLES.includes(value as KeyContactRelationshipRole)
}

type KeyContactRelationshipRole = (typeof KEY_CONTACT_RELATIONSHIP_ROLES)[number]

const CONTACT_ROLE_ORDER: Record<ContactRelationshipRole, number> = {
  decideur: 0,
  prescripteur: 1,
  sponsor: 2,
  acheteur: 3,
  operationnel: 4,
}

export function buildPanelContacts(rows: PanelContactRow[], limit = 6): PanelContact[] {
  const byPerson = new Map<string, { contact: PanelContact; sourceRank: number }>()

  for (const row of rows) {
    if (!isKeyContactRole(row.relationship_role)) continue
    const relationshipRole = normalizeContactRelationshipRole(row.relationship_role)
    if (!relationshipRole) continue
    const sourceRank = KEY_CONTACT_RELATIONSHIP_ROLES.indexOf(row.relationship_role)
    const person = firstRelation(row.persons)
    const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
    const fullName = person?.full_name?.trim() || fallbackName || "Contact sans nom"
    const contact: PanelContact = {
      id: row.id,
      personId: row.person_id,
      fullName,
      initials: getInitials(fullName),
      jobTitle: row.job_title,
      relationshipRole,
      isPriority: Boolean(row.is_priority),
      email: person?.primary_email ?? null,
    }
    const existing = byPerson.get(row.person_id)
    if (
      !existing ||
      comparePanelContacts(contact, existing.contact) < 0 ||
      (comparePanelContacts(contact, existing.contact) === 0 && sourceRank < existing.sourceRank)
    ) {
      byPerson.set(row.person_id, { contact, sourceRank })
    }
  }

  return Array.from(byPerson.values()).map((entry) => entry.contact).sort(comparePanelContacts).slice(0, limit)
}

function comparePanelContacts(a: PanelContact, b: PanelContact): number {
  if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1
  const roleDelta = CONTACT_ROLE_ORDER[a.relationshipRole] - CONTACT_ROLE_ORDER[b.relationshipRole]
  if (roleDelta !== 0) return roleDelta
  return a.fullName.localeCompare(b.fullName, "fr", { sensitivity: "base" })
}

const OPPORTUNITY_PRIORITY_ORDER: Record<string, number> = {
  haute: 0,
  normale: 1,
  basse: 2,
}

export function getOpportunityPriorityRank(priority: string | null | undefined): number {
  return OPPORTUNITY_PRIORITY_ORDER[priority ?? ""] ?? 9
}

function comparableDate(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
}

export function buildPanelOpportunities(rows: PanelOpportunityRow[], limit = 5): PanelOpportunity[] {
  return rows
    .filter((row) => !isTerminalOpportunityStage(row.stage))
    .sort((a, b) => {
      const nextActionDelta = comparableDate(a.next_action_at) - comparableDate(b.next_action_at)
      if (nextActionDelta !== 0) return nextActionDelta
      const closeDelta = comparableDate(a.target_close_date) - comparableDate(b.target_close_date)
      if (closeDelta !== 0) return closeDelta
      const priorityDelta = getOpportunityPriorityRank(a.priority) - getOpportunityPriorityRank(b.priority)
      if (priorityDelta !== 0) return priorityDelta
      return comparableDate(a.created_at) - comparableDate(b.created_at)
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      stageLabel: getOpportunityStageLabel(row.stage),
      priority: row.priority,
      nextActionLabel: row.next_action_label,
      nextActionAt: row.next_action_at,
      targetCloseDate: row.target_close_date,
      createdAt: row.created_at,
    }))
}

export function buildPanelEvents(
  rows: PanelEventRow[],
  nowIso = new Date().toISOString(),
  limit = 5,
): PanelEvent[] {
  return rows
    .filter((row) => row.starts_at >= nowIso && row.status !== "cancelled")
    .sort((a, b) => comparableDate(a.starts_at) - comparableDate(b.starts_at))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      eventType: row.event_type,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      contactId: row.contact_id,
      opportunityId: row.opportunity_id,
    }))
}

export function buildPanelActivity(
  opportunities: PanelOpportunity[],
  events: PanelEvent[],
  limit = 8,
): PanelActivityItem[] {
  const opportunityItems: PanelActivityItem[] = opportunities.map((opportunity) => ({
    type: "opportunity",
    id: opportunity.id,
    sortAt: opportunity.nextActionAt ?? opportunity.targetCloseDate,
    priorityRank: getOpportunityPriorityRank(opportunity.priority),
    opportunity,
  }))
  const eventItems: PanelActivityItem[] = events.map((event) => ({
    type: "event",
    id: event.id,
    sortAt: event.startsAt,
    priorityRank: 1,
    event,
  }))

  return [...opportunityItems, ...eventItems]
    .sort((a, b) => {
      const dateDelta = comparableDate(a.sortAt) - comparableDate(b.sortAt)
      if (dateDelta !== 0) return dateDelta
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
      return a.id.localeCompare(b.id)
    })
    .slice(0, limit)
}

function buildRunSummaries(rows: RunRow[]): PanelRunSummary[] {
  return rows.map((row) => ({
    id: row.id,
    runType: row.run_type,
    status: row.status,
    needsReview: row.needs_review,
    currentPhase: row.current_phase,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    errorMessage: row.error_message,
  }))
}

function getErrorMessage(results: Array<{ error: SupabaseError | null }>) {
  return results.find((result) => result.error)?.error?.message ?? null
}

export async function getAccountIntelligencePanelData(
  companyId: string,
): Promise<AccountIntelligencePanelDataResult> {
  const supabase = (await createClient()) as unknown as LooseSupabaseClient
  const nowIso = new Date().toISOString()

  const [companyResult, resultsResult, contactsResult, opportunitiesResult, eventsResult, runsResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select<CompanyRow>("id,name,sector,sector_id,segment_id,segment,priority,lifecycle_status,legacy_folio_score,website,metadata")
        .eq("id", companyId)
        .maybeSingle(),
      supabase
        .from("ai_intelligence_results")
        .select<PanelResultRow>("id,result_type,status,needs_review,phase,created_at,completed_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("contacts")
        .select<PanelContactRow>("id,person_id,job_title,relationship_role,is_priority,persons(full_name,first_name,last_name,primary_email)")
        .eq("company_id", companyId)
        .in("relationship_role", KEY_CONTACT_RELATIONSHIP_ROLES)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("opportunities")
        .select<PanelOpportunityRow>("id,title,stage,priority,next_action_label,next_action_at,target_close_date,created_at")
        .eq("company_id", companyId)
        .order("next_action_at", { ascending: true, nullsFirst: false })
        .order("target_close_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("calendar_events")
        .select<PanelEventRow>("id,title,event_type,status,starts_at,ends_at,contact_id,opportunity_id")
        .eq("company_id", companyId)
        .gte("starts_at", nowIso)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("ai_intelligence_runs")
        .select<RunRow>("id,run_type,status,needs_review,current_phase,created_at,started_at,completed_at,failed_at,error_message")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
    ])

  if (companyResult.error) return { data: null, error: companyResult.error.message }
  if (!companyResult.data) return { data: null, error: "Compte introuvable" }

  const secondaryError = getErrorMessage([
    resultsResult,
    contactsResult,
    opportunitiesResult,
    eventsResult,
    runsResult,
  ])
  if (secondaryError) return { data: null, error: secondaryError }

  const company = companyResult.data
  const metadata = asRecord(company.metadata)

  // Lot 0 — lecture par `segment_id` sur la vue de résolution, jamais par
  // `sector_id` sur la table brute : sinon le drapeau « playbook structuré »
  // resterait faux pour tout segment enrichi.
  let sectorResult: SingleResult<SectorKnowledgeResolvedRow> = { data: null, error: null }
  if (company.segment_id) {
    sectorResult = await supabase
      .from("v_sector_knowledge_resolved")
      .select<SectorKnowledgeResolvedRow>(
        "segment_id,segment_name,segment_slug,segment_status,macro_id,macro_name,macro_slug,macro_status,playbook,playbook_level,has_segment_knowledge",
      )
      .eq("segment_id", company.segment_id)
      .maybeSingle()
  }
  if (sectorResult.error) return { data: null, error: sectorResult.error.message }

  const resources = buildPanelResourceCounts(resultsResult.data ?? [], metadata)
  const resolvedSector = sectorResult.data
  const structuredSector = toEffectiveSectorRow(resolvedSector)
  const hasStructuredSector = hasStructuredSectorPlaybook(structuredSector)
  const hasLegacySectorAnalysis = hasMetadataValue(metadata, "sector_analysis")
  const opportunities = buildPanelOpportunities(opportunitiesResult.data ?? [])
  const events = buildPanelEvents(eventsResult.data ?? [], nowIso)
  const contacts = buildPanelContacts(contactsResult.data ?? [])
  const runs = buildRunSummaries(runsResult.data ?? [])

  const data: AccountIntelligencePanelData = {
    company: {
      id: company.id,
      name: company.name,
      sector: company.sector,
      sectorId: company.sector_id,
      segmentId: company.segment_id,
      segment: company.segment,
      priority: company.priority,
      lifecycleStatus: company.lifecycle_status,
      legacyFolioScore: toNumber(company.legacy_folio_score),
      website: company.website,
      logoPath: typeof metadata.logo_path === "string" ? metadata.logo_path : null,
    },
    resources,
    sector: {
      hasStructuredSector,
      structuredSectorId: hasStructuredSector ? structuredSector?.id ?? null : null,
      structuredSectorName: hasStructuredSector ? structuredSector?.name ?? null : null,
      structuredSectorSlug: hasStructuredSector ? structuredSector?.slug ?? null : null,
      structuredSectorStatus: structuredSector?.status ?? null,
      structuredSectorLevel: hasStructuredSector
        ? resolvedSector?.playbook_level === "segment" ? "segment" : "macro"
        : null,
      segmentName: resolvedSector?.segment_name ?? null,
      macroName: resolvedSector?.macro_name ?? null,
      hasLegacySectorAnalysis,
      source: hasStructuredSector ? "supabase" : hasLegacySectorAnalysis ? "legacy_folio" : "none",
    },
    opportunities,
    events,
    activity: buildPanelActivity(opportunities, events),
    contacts,
    runs,
    provenance: {
      loadedAt: nowIso,
      sources: {
        company: "supabase",
        resources: hasAnyLegacyResource(resources) ? "mixed" : "engine",
        sector: hasStructuredSector ? "supabase" : hasLegacySectorAnalysis ? "legacy_folio" : "none",
        opportunities: "supabase",
        events: "supabase",
        contacts: "supabase",
        runs: "supabase",
      },
    },
  }

  return { data, error: null }
}

function hasAnyLegacyResource(resources: PanelResourceCounts): boolean {
  return (Object.keys(resources) as IntelligenceResourceCategory[]).some(
    (category) => resources[category].legacy.available,
  )
}
