import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { WeeklyManagerContent } from "@/app/(app)/reports/_data/reports-types"
import { loadAgendaSnapshot } from "@/lib/agenda/aggregate-agenda-snapshot"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type { ScheduledEventItem } from "@/lib/agenda/agenda-types"
import { getWorkspaceDiagnostic } from "@/lib/intelligence/diagnostic/get-workspace-diagnostic"
import { OPPORTUNITY_ACTIVE_STAGES } from "@/lib/opportunities/stages"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId, resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import type { Database } from "@/types/database"
import {
  COCKPIT_MOBILE_OPPORTUNITY_LIMIT,
  COCKPIT_MOBILE_SIGNAL_LIMIT,
  COCKPIT_STRONG_SIGNAL_THRESHOLD,
  getCockpitMobileWeekRange,
  getCockpitPriorityKey,
  getNextMeetingLabel,
  selectCockpitOpportunities,
  selectCockpitPriorities,
  selectCockpitSignals,
  selectCockpitUrgencies,
  selectCommercialMeetings,
  selectTodayEvents,
  sortCockpitOpportunitySources,
  type CockpitOpportunitySource,
  type CockpitSignalSource,
} from "./cockpit-mobile-selectors"
import type {
  CockpitMobileSnapshot,
  CockpitOpportunityItem,
  CockpitSignalItem,
} from "./cockpit-mobile-snapshot-types"

type ServerSupabaseClient = SupabaseClient<Database>

type WeeklyDocumentRow = {
  id: string
  created_at: string
  current_content_json: unknown
}

type OpportunityRow = {
  id: string
  title: string
  stage: string
  company_id: string | null
  next_action_label: string | null
  next_action_at: string | null
  target_close_date: string | null
  required_headcount: number
  requires_staffing: boolean
  updated_at: string
  company: { id: string; name: string } | Array<{ id: string; name: string }> | null
}

type PositioningRow = {
  opportunity_id: string
  status: string
}

type AccountSignalRow = {
  id: string
  title: string
  signal_category: string
  summary: string | null
  global_score: number
  score_justification: string | null
  last_evidence_at: string
  expires_at: string | null
  status: string
  recommended_action: string | null
  company_id: string
  suggested_contact_id: string | null
  company: { id: string; name: string } | Array<{ id: string; name: string }> | null
  suggested_contact: {
    id: string
    person: { full_name: string | null } | Array<{ full_name: string | null }> | null
  } | Array<{
    id: string
    person: { full_name: string | null } | Array<{ full_name: string | null }> | null
  }> | null
}

type VeilleArticleRow = {
  id: string
  titre_fr: string
  categorie: string
  resume: string
  action_commerciale: string
  published_at: string | null
  created_at: string
  selection_rank: number
  url: string
}

type OpportunitiesBundle = {
  items: CockpitOpportunityItem[]
  overdueNextStepCount: number
  dueThisWeekCount: number
}

type SignalsBundle = {
  items: CockpitSignalItem[]
  strongCount: number
  totalAvailableCount: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isWeeklyManagerContent(value: unknown): value is WeeklyManagerContent {
  const content = asRecord(value)
  const facts = asRecord(content?.facts)
  const narrative = asRecord(content?.narrative)

  if (!content || !facts || !narrative) return false
  if (!Array.isArray(facts.priorities)) return false
  if (!Array.isArray(content.sourceRefs) || !Array.isArray(content.qaFlags)) return false
  if (typeof narrative.executiveSummary !== "string") return false

  return facts.priorities.every((priority) => {
    const item = asRecord(priority)
    return Boolean(
      item
      && typeof item.sourceType === "string"
      && typeof item.sourceId === "string"
      && typeof item.title === "string"
      && typeof item.rank === "number"
      && typeof item.tier === "string"
      && typeof item.scoringVersion === "string",
    )
  })
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

async function loadLatestWeeklyBrief(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  ownerId: string,
): Promise<WeeklyManagerContent | null> {
  const { data, error } = await supabase
    .from("intelligence_documents")
    .select("id,created_at,current_content_json")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId)
    .eq("document_type", "weekly_manager")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[cockpit-mobile] weekly brief query failed", error.message)
    return null
  }
  if (!data) return null

  const row = data as WeeklyDocumentRow
  if (!isWeeklyManagerContent(row.current_content_json)) {
    console.error("[cockpit-mobile] latest weekly brief has invalid content", {
      documentId: row.id,
    })
    return null
  }

  return row.current_content_json
}

async function loadDismissedPriorityKeys(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  ownerId: string,
  weekIso: string,
) {
  const { data, error } = await supabase
    .from("weekly_brief_dismissals")
    .select("item_source_type,item_source_id")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId)
    .eq("week_iso", weekIso)

  if (error) {
    console.error("[cockpit-mobile] weekly dismissals query failed", error.message)
    return new Set<string>()
  }

  return new Set((data ?? []).map((row) => getCockpitPriorityKey({
    sourceType: row.item_source_type,
    sourceId: row.item_source_id,
  })))
}

async function loadScheduledEvents(
  ownerId: string,
  now: string,
  from: string,
  to: string,
): Promise<ScheduledEventItem[]> {
  try {
    const snapshot = await loadAgendaSnapshot({
      from,
      to,
      now,
      timezone: AGENDA_V1_TIMEZONE,
      include: {
        scheduledEvents: true,
        tasks: false,
        missionBoundaries: false,
        opportunityDeadlines: false,
        recruitmentMilestones: false,
        absences: false,
        clientClosures: false,
        derivedAlerts: false,
      },
      filters: { ownerIds: [ownerId] },
    })

    return snapshot.items.filter((item): item is ScheduledEventItem => (
      item.type === "scheduled_event" && item.sourceType === "calendar_event"
    ))
  } catch (error) {
    console.error("[cockpit-mobile] agenda query failed", error)
    return []
  }
}

function mapOpportunityRow(row: OpportunityRow): CockpitOpportunitySource {
  const company = firstRelation(row.company)
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    companyId: row.company_id,
    companyName: company?.name ?? null,
    nextActionLabel: row.next_action_label,
    nextActionAt: row.next_action_at,
    targetCloseDate: row.target_close_date,
    requiredHeadcount: row.required_headcount,
    requiresStaffing: row.requires_staffing,
    updatedAt: row.updated_at,
    positionings: [],
  }
}

async function loadOpportunities(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  ownerId: string,
  now: string,
  weekEndExclusive: string,
): Promise<OpportunitiesBundle> {
  const openStages = OPPORTUNITY_ACTIVE_STAGES.map((stage) => stage.value)
  const columns = `
    id,
    title,
    stage,
    company_id,
    next_action_label,
    next_action_at,
    target_close_date,
    required_headcount,
    requires_staffing,
    updated_at,
    company:companies!opportunities_company_id_fkey(id,name)
  `

  const baseRowsQuery = () => supabase
    .from("opportunities")
    .select(columns)
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId)
    .in("stage", openStages)

  const baseCountQuery = () => supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId)
    .in("stage", openStages)

  const [overdue, dueThisWeek, closingSoon, recent, overdueCount, dueThisWeekCount] = await Promise.all([
    baseRowsQuery()
      .lt("next_action_at", now)
      .order("next_action_at", { ascending: true })
      .limit(COCKPIT_MOBILE_OPPORTUNITY_LIMIT),
    baseRowsQuery()
      .gte("next_action_at", now)
      .lt("next_action_at", weekEndExclusive)
      .order("next_action_at", { ascending: true })
      .limit(COCKPIT_MOBILE_OPPORTUNITY_LIMIT),
    baseRowsQuery()
      .not("target_close_date", "is", null)
      .order("target_close_date", { ascending: true })
      .limit(COCKPIT_MOBILE_OPPORTUNITY_LIMIT),
    baseRowsQuery()
      .order("updated_at", { ascending: false })
      .limit(COCKPIT_MOBILE_OPPORTUNITY_LIMIT),
    baseCountQuery().lt("next_action_at", now),
    baseCountQuery()
      .gte("next_action_at", now)
      .lt("next_action_at", weekEndExclusive),
  ])

  const rowResults = [
    ["overdue opportunities", overdue] as const,
    ["due opportunities", dueThisWeek] as const,
    ["closing opportunities", closingSoon] as const,
    ["recent opportunities", recent] as const,
  ]
  const rowsById = new Map<string, CockpitOpportunitySource>()

  for (const [label, result] of rowResults) {
    if (result.error) {
      console.error(`[cockpit-mobile] ${label} query failed`, result.error.message)
      continue
    }
    for (const row of (result.data ?? []) as unknown as OpportunityRow[]) {
      rowsById.set(row.id, mapOpportunityRow(row))
    }
  }

  if (overdueCount.error) {
    console.error("[cockpit-mobile] overdue opportunity count failed", overdueCount.error.message)
  }
  if (dueThisWeekCount.error) {
    console.error("[cockpit-mobile] due opportunity count failed", dueThisWeekCount.error.message)
  }

  const selectedSources = sortCockpitOpportunitySources(
    Array.from(rowsById.values()),
    now,
    weekEndExclusive,
  ).slice(0, COCKPIT_MOBILE_OPPORTUNITY_LIMIT)

  if (selectedSources.length > 0) {
    const { data, error } = await supabase
      .from("opportunity_candidates")
      .select("opportunity_id,status")
      .eq("workspace_id", workspaceId)
      .in("opportunity_id", selectedSources.map((opportunity) => opportunity.id))

    if (error) {
      console.error("[cockpit-mobile] positioning coverage query failed", error.message)
    } else {
      const positioningsByOpportunity = new Map<string, Array<{ status: string | null }>>()
      for (const positioning of (data ?? []) as PositioningRow[]) {
        const current = positioningsByOpportunity.get(positioning.opportunity_id) ?? []
        current.push({ status: positioning.status })
        positioningsByOpportunity.set(positioning.opportunity_id, current)
      }
      for (const opportunity of selectedSources) {
        opportunity.positionings = positioningsByOpportunity.get(opportunity.id) ?? []
      }
    }
  }

  return {
    items: selectCockpitOpportunities(selectedSources, now, weekEndExclusive),
    overdueNextStepCount: overdueCount.count ?? 0,
    dueThisWeekCount: dueThisWeekCount.count ?? 0,
  }
}

async function loadFallbackSignals(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  now: string,
): Promise<SignalsBundle> {
  const { data, error, count } = await supabase
    .from("veille_articles")
    .select(
      "id,titre_fr,categorie,resume,action_commerciale,published_at,created_at,selection_rank,url",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .is("superseded_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("selection_rank", { ascending: true })
    .limit(COCKPIT_MOBILE_SIGNAL_LIMIT)

  if (error) {
    console.error("[cockpit-mobile] veille fallback query failed", error.message)
    return { items: [], strongCount: 0, totalAvailableCount: 0 }
  }

  const sources: CockpitSignalSource[] = ((data ?? []) as VeilleArticleRow[]).map((article) => ({
    id: article.id,
    source: "veille_article",
    title: article.titre_fr,
    category: article.categorie,
    summary: article.resume,
    globalScore: null,
    scoreJustification: null,
    lastEvidenceAt: article.published_at ?? article.created_at,
    expiresAt: null,
    status: "new",
    recommendedAction: article.action_commerciale,
    companyId: null,
    companyName: null,
    suggestedContactId: null,
    suggestedContactName: null,
    sourceUrl: article.url,
    selectionRank: article.selection_rank,
  }))

  return {
    items: selectCockpitSignals(sources, now),
    strongCount: 0,
    totalAvailableCount: count ?? sources.length,
  }
}

async function loadSignals(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  now: string,
): Promise<SignalsBundle> {
  const activeFilter = `expires_at.is.null,expires_at.gt.${now}`

  const [signalsResult, strongCountResult] = await Promise.all([
    supabase
      .from("account_signals")
      .select(`
        id,
        title,
        signal_category,
        summary,
        global_score,
        score_justification,
        last_evidence_at,
        expires_at,
        status,
        recommended_action,
        company_id,
        suggested_contact_id,
        company:companies!inner(id,name),
        suggested_contact:contacts!account_signals_suggested_contact_id_fkey(
          id,
          person:persons(full_name)
        )
      `, { count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("status", "new")
      .or(activeFilter)
      .order("global_score", { ascending: false })
      .order("last_evidence_at", { ascending: false })
      .limit(COCKPIT_MOBILE_SIGNAL_LIMIT),
    supabase
      .from("account_signals")
      .select("id,company:companies!inner(id)", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "new")
      .or(activeFilter)
      .gte("global_score", COCKPIT_STRONG_SIGNAL_THRESHOLD),
  ])

  if (signalsResult.error) {
    console.error("[cockpit-mobile] account signals query failed", signalsResult.error.message)
    return { items: [], strongCount: 0, totalAvailableCount: 0 }
  }
  if (strongCountResult.error) {
    console.error("[cockpit-mobile] strong signals count failed", strongCountResult.error.message)
  }

  const sources: CockpitSignalSource[] = (
    (signalsResult.data ?? []) as unknown as AccountSignalRow[]
  ).map((signal) => {
    const company = firstRelation(signal.company)
    const suggestedContact = firstRelation(signal.suggested_contact)
    const suggestedContactPerson = firstRelation(suggestedContact?.person ?? null)
    return {
      id: signal.id,
      source: "account_signal",
      title: signal.title,
      category: signal.signal_category,
      summary: signal.summary,
      globalScore: signal.global_score,
      scoreJustification: signal.score_justification,
      lastEvidenceAt: signal.last_evidence_at,
      expiresAt: signal.expires_at,
      status: signal.status,
      recommendedAction: signal.recommended_action,
      companyId: company?.id ?? signal.company_id,
      companyName: company?.name ?? null,
      suggestedContactId: suggestedContact?.id ?? signal.suggested_contact_id,
      suggestedContactName: suggestedContactPerson?.full_name ?? null,
      sourceUrl: null,
    }
  })

  const items = selectCockpitSignals(sources, now)
  if (items.length === 0) {
    return loadFallbackSignals(supabase, workspaceId, now)
  }

  return {
    items,
    strongCount: strongCountResult.count ?? 0,
    totalAvailableCount: signalsResult.count ?? items.length,
  }
}

export async function getCockpitMobileSnapshot(): Promise<CockpitMobileSnapshot | null> {
  const workspaceId = await resolveCurrentWorkspaceId()
  const userId = await getCurrentUserId()
  if (!workspaceId || !userId) return null

  const supabase = await createClient()

  const generatedAt = new Date().toISOString()
  const week = getCockpitMobileWeekRange(generatedAt)

  const [
    scheduledEvents,
    weeklyBrief,
    dismissedPriorityKeys,
    opportunities,
    signals,
    diagnostic,
  ] = await Promise.all([
    loadScheduledEvents(userId, generatedAt, week.from, week.to),
    loadLatestWeeklyBrief(supabase, workspaceId, userId),
    loadDismissedPriorityKeys(supabase, workspaceId, userId, week.weekIso),
    loadOpportunities(supabase, workspaceId, userId, generatedAt, week.to),
    loadSignals(supabase, workspaceId, generatedAt),
    getWorkspaceDiagnostic(),
  ])

  const priorities = selectCockpitPriorities(
    weeklyBrief?.facts.priorities ?? [],
    dismissedPriorityKeys,
  )
  const urgencies = selectCockpitUrgencies(priorities)
  const todayEvents = selectTodayEvents(scheduledEvents, week.todayDateKey)
  const meetings = selectCommercialMeetings(scheduledEvents)

  return {
    generatedAt,
    header: {
      todayEvents,
      urgencies,
      todayEventCount: todayEvents.length,
      urgencyCount: urgencies.length,
    },
    priorities: {
      items: priorities,
      criticalCount: priorities.filter((priority) => priority.tier === "critical").length,
      totalCount: priorities.length,
    },
    meetings: {
      items: meetings,
      weekCount: meetings.length,
      nextMeetingLabel: getNextMeetingLabel(meetings, generatedAt),
    },
    opportunities,
    weeklyBrief,
    diagnostic,
    signals,
  }
}
