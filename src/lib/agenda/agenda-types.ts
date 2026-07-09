import type { Json } from "@/types/database"

export interface AgendaEvent {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  description: string | null
  organizer_id: string | null
  company_id: string | null
  company?: { id: string; name: string } | null
  contact_id: string | null
  contact?: {
    id: string
    full_name: string
    job_title: string | null
    email: string | null
  } | null
  opportunity_id: string | null
  opportunity?: { id: string; title: string } | null
  candidate_id: string | null
  candidate?: { id: string; full_name: string } | null
  preparatory_task?: {
    id: string
    title: string
    due_date: string | null
    priority: string
    status: string
  } | null
  metadata?: Json | null
}

export interface AgendaSelectContact {
  id: string
  full_name: string
  job_title: string
  email: string | null
}

export interface AgendaSelectOpportunity {
  id: string
  title: string
}

export interface AgendaSelectCandidate {
  id: string
  full_name: string
  status: string
}

export interface AgendaContextOption {
  id: string
  label: string
  description?: string | null
}

export interface AgendaEventFormInput {
  id?: string
  title: string
  event_type: string
  starts_at: string
  ends_at: string
  description: string
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  candidate_id: string | null
  create_task: boolean
  task_title: string
  task_due_date: string
  task_priority: string
  metadata?: Json
}

export type AgendaItemType =
  | "scheduled_event"
  | "task"
  | "deadline"
  | "alert"
  | "availability_block"

export type AgendaSourceType =
  | "calendar_event"
  | "task"
  | "mission"
  | "opportunity"
  | "candidate_hiring_milestone"
  | "collaborator_absence"
  | "client_closure"

export type AgendaResolverSource = AgendaSourceType | "derived"

export type AgendaDomain =
  | "agenda"
  | "missions"
  | "commerce"
  | "recruitment"
  | "staffing"
  | "consultants"

export type AgendaPriority = "low" | "normal" | "high" | "urgent"

export type AgendaBusinessStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "unknown"

export type AgendaTemporalState =
  | "past"
  | "today"
  | "upcoming"
  | "overdue"
  | "ongoing"

export type AgendaTimebox =
  | {
      kind: "slot"
      startAt: string
      endAt: string
      timezone: string
      allDay: false
    }
  | {
      kind: "all_day"
      date: string
      timezone: string
      allDay: true
    }
  | {
      kind: "all_day_range"
      startDate: string
      endDate: string
      timezone: string
      allDay: true
    }
  | {
      kind: "deadline"
      at: string
      timezone: string
      allDay: false
    }
  | {
      kind: "milestone"
      at: string
      timezone: string
      allDay: false
    }

export interface AgendaDeepLink {
  module: AgendaDomain
  href: string
  label: string
  sourceType: AgendaSourceType
  sourceId: string
}

export interface AgendaUiCapabilities {
  canOpenPrimary: boolean
  canOpenSource: boolean
  canEditFromAgenda: boolean
  canCreateTask: boolean
  canReschedule: boolean
  canMarkDone: boolean
  canHideForSession: boolean
}

export interface AgendaBaseItem {
  id: string
  type: AgendaItemType
  sourceType: AgendaResolverSource
  sourceId: string
  workspaceId: string
  domain: AgendaDomain
  title: string
  subtitle?: string | null
  description?: string | null
  sourceStatus?: string | null
  businessStatus: AgendaBusinessStatus
  temporalState: AgendaTemporalState
  priority: AgendaPriority
  timebox: AgendaTimebox
  primaryLink: AgendaDeepLink
  relatedLinks: AgendaDeepLink[]
  uiCapabilities: AgendaUiCapabilities
  ownerId?: string | null
  ownerLabel?: string | null
  companyId?: string | null
  companyLabel?: string | null
  personId?: string | null
  personLabel?: string | null
  relatedCalendarEventId?: string | null
  relatedTaskId?: string | null
  relationGroupId?: string | null
  isDerived: boolean
  tags: string[]
  metadata?: Record<string, Json | undefined>
}

export interface ScheduledEventItem extends AgendaBaseItem {
  type: "scheduled_event"
  sourceType: "calendar_event"
  eventType: string
  location?: string | null
  meetingUrl?: string | null
}

export interface TaskItem extends AgendaBaseItem {
  type: "task"
  sourceType: "task"
  taskKind: "standalone" | "linked_to_event"
  taskEntityType?: string | null
  taskEntityId?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
}

export type AgendaDeadlineKind =
  | "mission_start"
  | "mission_end"
  | "opportunity_next_action"
  | "opportunity_target_close"
  | "recruitment_milestone"

export interface DeadlineItem extends AgendaBaseItem {
  type: "deadline"
  sourceType: "mission" | "opportunity" | "candidate_hiring_milestone"
  deadlineKind: AgendaDeadlineKind
}

export type AgendaAlertKind =
  | "overdue_task"
  | "deadline_at_risk"
  | "schedule_conflict"
  | "week_tension"

export interface AlertItem extends AgendaBaseItem {
  type: "alert"
  sourceType: "derived"
  alertKind: AgendaAlertKind
  relatedItemIds: string[]
}

export type AvailabilityBlockKind = "absence" | "client_closure"

export interface AvailabilityBlockItem extends AgendaBaseItem {
  type: "availability_block"
  sourceType: "collaborator_absence" | "client_closure"
  blockKind: AvailabilityBlockKind
}

export type AgendaItem =
  | ScheduledEventItem
  | TaskItem
  | DeadlineItem
  | AlertItem
  | AvailabilityBlockItem

export interface AgendaRelationGroup {
  id: string
  kind: "event_task_pair" | "source_cluster" | "alert_cluster"
  primaryItemId: string
  items: AgendaItem[]
}

export interface AgendaFilters {
  domains?: AgendaDomain[]
  itemTypes?: AgendaItemType[]
  sourceTypes?: AgendaSourceType[]
  priorities?: AgendaPriority[]
  businessStatuses?: AgendaBusinessStatus[]
  temporalStates?: AgendaTemporalState[]
  ownerIds?: string[]
  companyIds?: string[]
  personIds?: string[]
  onlyActionable?: boolean
  onlyOverdue?: boolean
  onlyToday?: boolean
  onlyWithRelationGroup?: boolean
  textSearch?: string
}

export interface AgendaQuery {
  workspaceId: string
  now: string
  timezone: string
  from: string
  to: string
  limits: {
    maxWindowDays: number
    maxRowsCalendarEvents: number
    maxRowsPerOtherSource: number
    maxOverdueTasks: number
    overdueTaskLookbackDays: number
    sourceTimeoutMs: number
    maxParallelQueries: number
  }
  include: {
    scheduledEvents: boolean
    tasks: boolean
    missionBoundaries: boolean
    opportunityDeadlines: boolean
    recruitmentMilestones: boolean
    absences: boolean
    clientClosures: boolean
    derivedAlerts: boolean
  }
  filters: AgendaFilters
}

export interface AgendaAggregationError {
  code:
    | "SOURCE_QUERY_FAILED"
    | "SOURCE_MAPPING_FAILED"
    | "SOURCE_TIMEOUT"
    | "INVALID_SOURCE_DATA"
    | "DERIVED_ALERT_FAILED"
  source: AgendaResolverSource
  message: string
  severity: "warning" | "error"
  recoverable: boolean
  details?: Record<string, Json | undefined>
}

export interface AgendaSourceResult {
  source: AgendaResolverSource
  ok: boolean
  items: AgendaItem[]
  errors: AgendaAggregationError[]
  meta: {
    fetchedAt: string
    rowCount: number
    truncated: boolean
    timedOut: boolean
    durationMs: number
  }
}

export interface AgendaSnapshot {
  query: AgendaQuery
  items: AgendaItem[]
  relationGroups: AgendaRelationGroup[]
  sourceResults: AgendaSourceResult[]
  summary: {
    totalItems: number
    totalActionable: number
    totalOverdue: number
    totalToday: number
    totalConflicts: number
    hasWeekTension: boolean
    allDayLaneCount: number
  }
  partial: boolean
  errors: AgendaAggregationError[]
  generatedAt: string
}

export interface AgendaGroupedItem {
  id: string
  kind: AgendaRelationGroup["kind"] | "single"
  primaryItem: AgendaItem
  items: AgendaItem[]
}

export interface AgendaDesktopDayViewModel {
  date: string
  allDayItems: AgendaItem[]
  timedItems: AgendaItem[]
  attentionItems: AgendaItem[]
  groupedItems: AgendaGroupedItem[]
  isDense: boolean
  conflicts: AlertItem[]
}

export interface AgendaDesktopViewModel {
  timezone: string
  generatedAt: string
  itemsById: Record<string, AgendaItem>
  days: AgendaDesktopDayViewModel[]
  relationGroups: AgendaGroupedItem[]
  partial: boolean
  errors: AgendaAggregationError[]
  summary: AgendaSnapshot["summary"]
}

export interface AgendaMobileDaySectionViewModel {
  date: string
  label: string
  allDayItems: AgendaItem[]
  primaryItems: AgendaItem[]
  groupedItems: AgendaGroupedItem[]
  isDense: boolean
  hasConflict: boolean
}

export interface AgendaMobileViewModel {
  timezone: string
  generatedAt: string
  itemsById: Record<string, AgendaItem>
  todayItems: AgendaItem[]
  overdueItems: AgendaItem[]
  attentionItems: AgendaItem[]
  daySections: AgendaMobileDaySectionViewModel[]
  relationGroups: AgendaGroupedItem[]
  partial: boolean
  errors: AgendaAggregationError[]
  summary: AgendaSnapshot["summary"]
}

export function createAgendaError(
  source: AgendaResolverSource,
  code: AgendaAggregationError["code"],
  message: string,
  details?: Record<string, Json | undefined>,
  severity: AgendaAggregationError["severity"] = "error",
  recoverable = true,
): AgendaAggregationError {
  return {
    source,
    code,
    message,
    severity,
    recoverable,
    details,
  }
}

export function createAgendaSourceResult(
  source: AgendaResolverSource,
  overrides?: Partial<AgendaSourceResult>,
): AgendaSourceResult {
  return {
    source,
    ok: overrides?.ok ?? true,
    items: overrides?.items ?? [],
    errors: overrides?.errors ?? [],
    meta: {
      fetchedAt: overrides?.meta?.fetchedAt ?? new Date().toISOString(),
      rowCount: overrides?.meta?.rowCount ?? 0,
      truncated: overrides?.meta?.truncated ?? false,
      timedOut: overrides?.meta?.timedOut ?? false,
      durationMs: overrides?.meta?.durationMs ?? 0,
    },
  }
}
