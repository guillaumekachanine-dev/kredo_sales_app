import type {
  WeeklyManagerPriorityItem,
  WeeklyManagerPriorityTier,
} from "@/app/(app)/reports/_data/reports-types"
import {
  getAgendaTimeboxDateRange,
  getAgendaTimeboxEndExclusiveAt,
  getAgendaTimeboxPrimaryAt,
  getLocalDateKey,
  getWeekStartDateKey,
  parseDateOnly,
  startOfLocalDay,
} from "@/lib/agenda/agenda-temporal"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import type { ScheduledEventItem } from "@/lib/agenda/agenda-types"
import {
  getNormalizedRequiredHeadcount,
  isCoveringPositioningStatus,
  isStaffingNeedOpportunity,
} from "@/lib/needs-staffing/coverage"
import { WEEKLY_SCORING_VERSION } from "@/lib/reports/weekly-manager/scoring"
import { getIsoWeekLabel } from "@/lib/reports/weekly-manager/iso-week"
import { isOpenOpportunityStage } from "@/lib/opportunities/stages"
import type {
  CockpitMeetingItem,
  CockpitOpportunityCoverageStatus,
  CockpitOpportunityItem,
  CockpitPriorityItem,
  CockpitSignalItem,
  CockpitTodayEvent,
} from "./cockpit-mobile-snapshot-types"

export const COCKPIT_MOBILE_SIGNAL_LIMIT = 3
export const COCKPIT_MOBILE_OPPORTUNITY_LIMIT = 6
export const COCKPIT_STRONG_SIGNAL_THRESHOLD = 0.7

const COMMERCIAL_MEETING_EVENT_TYPES = new Set([
  "rdv_prospection",
  "rdv_client_suivi",
  "soutenance",
  "atelier_client",
])

const PRIORITY_TIER_ORDER: Record<WeeklyManagerPriorityTier, number> = {
  critical: 0,
  high: 1,
  normal: 2,
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const { year, month, day } = parseDateOnly(dateKey)
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`
}

function timestamp(value: string) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function compareTimestampValues(left: number, right: number) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export interface CockpitMobileWeekRange {
  todayDateKey: string
  startDate: string
  endDate: string
  weekIso: string
  from: string
  to: string
}

export function getCockpitMobileWeekRange(
  now: string | Date,
  timezone = AGENDA_V1_TIMEZONE,
): CockpitMobileWeekRange {
  const todayDateKey = getLocalDateKey(now, timezone)
  const startDate = getWeekStartDateKey(todayDateKey)
  const endDate = addDaysToDateKey(startDate, 6)
  const nextWeekStart = addDaysToDateKey(startDate, 7)

  return {
    todayDateKey,
    startDate,
    endDate,
    weekIso: getIsoWeekLabel(startDate),
    from: startOfLocalDay(startDate, timezone).toISOString(),
    to: startOfLocalDay(nextWeekStart, timezone).toISOString(),
  }
}

export function getCockpitPriorityKey(
  priority: Pick<WeeklyManagerPriorityItem, "sourceType" | "sourceId">,
) {
  return `${priority.sourceType}:${priority.sourceId}`
}

export function selectCockpitPriorities(
  priorities: WeeklyManagerPriorityItem[],
  dismissedKeys: ReadonlySet<string> = new Set(),
): CockpitPriorityItem[] {
  const seen = new Set<string>()

  return [...priorities]
    .filter((priority) => priority.scoringVersion === WEEKLY_SCORING_VERSION)
    .sort((left, right) => {
      const tierDelta = PRIORITY_TIER_ORDER[left.tier] - PRIORITY_TIER_ORDER[right.tier]
      if (tierDelta !== 0) return tierDelta
      if (left.rank !== right.rank) return left.rank - right.rank
      return getCockpitPriorityKey(left).localeCompare(getCockpitPriorityKey(right))
    })
    .filter((priority) => {
      const key = getCockpitPriorityKey(priority)
      if (dismissedKeys.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function selectCockpitUrgencies(priorities: CockpitPriorityItem[]) {
  return priorities.filter((priority) => priority.tier === "critical").slice(0, 3)
}

export function selectCockpitModulePriorities(priorities: CockpitPriorityItem[]) {
  return selectCockpitPriorities(priorities).slice(0, 5)
}

export function isCommercialMeetingEventType(eventType: string) {
  return COMMERCIAL_MEETING_EVENT_TYPES.has(eventType)
}

function isVisibleCalendarEvent(event: ScheduledEventItem) {
  return event.businessStatus !== "cancelled"
}

function mapBaseCalendarEvent(event: ScheduledEventItem): CockpitTodayEvent {
  return {
    id: event.sourceId,
    title: event.title,
    eventType: event.eventType,
    startsAt: getAgendaTimeboxPrimaryAt(event.timebox),
    endsAt: getAgendaTimeboxEndExclusiveAt(event.timebox),
    allDay: event.timebox.allDay,
    companyId: event.companyId ?? null,
    companyName: event.companyLabel ?? null,
    href: event.primaryLink.href,
  }
}

export function selectTodayEvents(
  events: ScheduledEventItem[],
  todayDateKey: string,
  timezone = AGENDA_V1_TIMEZONE,
): CockpitTodayEvent[] {
  return events
    .filter(isVisibleCalendarEvent)
    .filter((event) => {
      const range = getAgendaTimeboxDateRange(event.timebox, timezone)
      return todayDateKey >= range.startDate && todayDateKey <= range.endDate
    })
    .sort((left, right) => (
      compareTimestampValues(
        timestamp(getAgendaTimeboxPrimaryAt(left.timebox)),
        timestamp(getAgendaTimeboxPrimaryAt(right.timebox)),
      )
      || left.sourceId.localeCompare(right.sourceId)
    ))
    .map(mapBaseCalendarEvent)
}

export function selectCommercialMeetings(events: ScheduledEventItem[]): CockpitMeetingItem[] {
  return events
    .filter(isVisibleCalendarEvent)
    .filter((event) => isCommercialMeetingEventType(event.eventType))
    .sort((left, right) => (
      compareTimestampValues(
        timestamp(getAgendaTimeboxPrimaryAt(left.timebox)),
        timestamp(getAgendaTimeboxPrimaryAt(right.timebox)),
      )
      || left.sourceId.localeCompare(right.sourceId)
    ))
    .map((event) => ({
      ...mapBaseCalendarEvent(event),
      location: event.location ?? null,
      meetingUrl: event.meetingUrl ?? null,
      contactId: event.contactId ?? null,
      contactName: event.contactName ?? null,
      opportunityId: event.opportunityId ?? null,
      opportunityTitle: event.opportunityTitle ?? null,
    }))
}

export function groupCockpitMeetingsByDay(meetings: CockpitMeetingItem[]) {
  const groups = new Map<string, CockpitMeetingItem[]>()
  for (const meeting of meetings) {
    const dateKey = getLocalDateKey(meeting.startsAt, AGENDA_V1_TIMEZONE)
    const items = groups.get(dateKey) ?? []
    items.push(meeting)
    groups.set(dateKey, items)
  }
  return Array.from(groups, ([date, items]) => ({ date, items }))
}

export function getNextMeetingLabel(
  meetings: CockpitMeetingItem[],
  now: string,
  timezone = AGENDA_V1_TIMEZONE,
): string | null {
  const nowTimestamp = timestamp(now)
  const next = meetings.find((meeting) => timestamp(meeting.startsAt) >= nowTimestamp)
  if (!next) return null

  const meetingDateKey = getLocalDateKey(next.startsAt, timezone)
  const todayDateKey = getLocalDateKey(now, timezone)
  const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1)
  const time = next.allDay
    ? "Toute la journée"
    : new Intl.DateTimeFormat("fr-FR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(next.startsAt))

  if (meetingDateKey === todayDateKey) return `Aujourd’hui · ${time}`
  if (meetingDateKey === tomorrowDateKey) return `Demain · ${time}`

  const weekday = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date(next.startsAt)).replace(".", "")

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${time}`
}

export interface CockpitOpportunityPositioningSource {
  status: string | null
}

export interface CockpitOpportunitySource {
  id: string
  title: string
  stage: string
  companyId: string | null
  companyName: string | null
  nextActionLabel: string | null
  nextActionAt: string | null
  targetCloseDate: string | null
  requiredHeadcount: number | null
  requiresStaffing: boolean | null
  updatedAt: string
  positionings: CockpitOpportunityPositioningSource[]
}

function opportunityBucket(
  opportunity: CockpitOpportunitySource,
  now: string,
  weekEndExclusive: string,
) {
  const nextActionAt = opportunity.nextActionAt
    ? timestamp(opportunity.nextActionAt)
    : Number.POSITIVE_INFINITY
  const nowTimestamp = timestamp(now)
  const weekEndTimestamp = timestamp(weekEndExclusive)

  if (opportunity.nextActionAt && nextActionAt < nowTimestamp) return 0
  if (
    opportunity.nextActionAt
    && nextActionAt >= nowTimestamp
    && nextActionAt < weekEndTimestamp
  ) return 1
  if (opportunity.targetCloseDate) return 2
  return 3
}

function nullableDateSortValue(value: string | null) {
  return value ? timestamp(value) : Number.POSITIVE_INFINITY
}

export function sortCockpitOpportunitySources(
  opportunities: CockpitOpportunitySource[],
  now: string,
  weekEndExclusive: string,
) {
  return [...opportunities].sort((left, right) => {
    const bucketDelta = opportunityBucket(left, now, weekEndExclusive)
      - opportunityBucket(right, now, weekEndExclusive)
    if (bucketDelta !== 0) return bucketDelta

    const nextActionDelta = compareTimestampValues(
      nullableDateSortValue(left.nextActionAt),
      nullableDateSortValue(right.nextActionAt),
    )
    if (nextActionDelta !== 0) return nextActionDelta

    const closeDelta = compareTimestampValues(
      nullableDateSortValue(left.targetCloseDate),
      nullableDateSortValue(right.targetCloseDate),
    )
    if (closeDelta !== 0) return closeDelta

    const updatedDelta = right.updatedAt.localeCompare(left.updatedAt)
    if (updatedDelta !== 0) return updatedDelta
    return left.id.localeCompare(right.id)
  })
}

function getCoverageStatus(
  requiredHeadcount: number,
  requiresStaffing: boolean | null,
  coveringPositioningCount: number,
): CockpitOpportunityCoverageStatus {
  if (!isStaffingNeedOpportunity({ requiredHeadcount, requiresStaffing })) {
    return "not_required"
  }
  if (coveringPositioningCount === 0) return "uncovered"
  if (coveringPositioningCount >= requiredHeadcount) return "covered"
  return "partial"
}

export function selectCockpitOpportunities(
  opportunities: CockpitOpportunitySource[],
  now: string,
  weekEndExclusive: string,
  limit = COCKPIT_MOBILE_OPPORTUNITY_LIMIT,
): CockpitOpportunityItem[] {
  return sortCockpitOpportunitySources(
    opportunities.filter((opportunity) => isOpenOpportunityStage(opportunity.stage)),
    now,
    weekEndExclusive,
  )
    .slice(0, limit)
    .map((opportunity) => {
      const requiredHeadcount = getNormalizedRequiredHeadcount(opportunity.requiredHeadcount)
      const coveringPositioningCount = opportunity.positionings.filter((positioning) => (
        isCoveringPositioningStatus(positioning.status)
      )).length

      return {
        id: opportunity.id,
        title: opportunity.title,
        stage: opportunity.stage,
        companyId: opportunity.companyId,
        companyName: opportunity.companyName,
        nextActionLabel: opportunity.nextActionLabel,
        nextActionAt: opportunity.nextActionAt,
        targetCloseDate: opportunity.targetCloseDate,
        requiredHeadcount,
        positioningCount: opportunity.positionings.length,
        coveringPositioningCount,
        coverageStatus: getCoverageStatus(
          requiredHeadcount,
          opportunity.requiresStaffing,
          coveringPositioningCount,
        ),
        href: `/missions/opps/${opportunity.id}/modifier`,
      }
    })
}

export interface CockpitSignalSource {
  id: string
  source: "account_signal" | "veille_article"
  title: string
  category: string
  summary: string | null
  globalScore: number | null
  scoreJustification: string | null
  lastEvidenceAt: string
  expiresAt: string | null
  status: string
  recommendedAction: string | null
  companyId: string | null
  companyName: string | null
  suggestedContactId: string | null
  suggestedContactName: string | null
  sourceUrl: string | null
  selectionRank?: number
}

function isUsableSignal(signal: CockpitSignalSource, now: string) {
  if (signal.source === "veille_article") return true
  if (signal.status !== "new") return false
  if (!signal.companyId || !signal.companyName) return false
  return !signal.expiresAt || timestamp(signal.expiresAt) > timestamp(now)
}

export function selectCockpitSignals(
  signals: CockpitSignalSource[],
  now: string,
  limit = COCKPIT_MOBILE_SIGNAL_LIMIT,
): CockpitSignalItem[] {
  return signals
    .filter((signal) => isUsableSignal(signal, now))
    .sort((left, right) => {
      if (left.source !== right.source) return left.source === "account_signal" ? -1 : 1
      if (left.source === "veille_article" && right.source === "veille_article") {
        const rankDelta = (left.selectionRank ?? Number.MAX_SAFE_INTEGER)
          - (right.selectionRank ?? Number.MAX_SAFE_INTEGER)
        if (rankDelta !== 0) return rankDelta
      }
      const scoreDelta = (right.globalScore ?? -1) - (left.globalScore ?? -1)
      if (scoreDelta !== 0) return scoreDelta
      const evidenceDelta = compareTimestampValues(
        timestamp(right.lastEvidenceAt),
        timestamp(left.lastEvidenceAt),
      )
      if (evidenceDelta !== 0) return evidenceDelta
      return left.id.localeCompare(right.id)
    })
    .slice(0, limit)
    .map((signal) => ({
      id: signal.id,
      source: signal.source,
      title: signal.title,
      category: signal.category,
      summary: signal.summary,
      globalScore: signal.globalScore,
      scoreJustification: signal.scoreJustification,
      lastEvidenceAt: signal.lastEvidenceAt,
      expiresAt: signal.expiresAt,
      isStrong: signal.source === "account_signal"
        && (signal.globalScore ?? 0) >= COCKPIT_STRONG_SIGNAL_THRESHOLD,
      recommendedAction: signal.recommendedAction,
      companyId: signal.companyId,
      companyName: signal.companyName,
      suggestedContactId: signal.suggestedContactId,
      suggestedContactName: signal.suggestedContactName,
      href: signal.companyId
        ? `/prospection/accounts/${signal.companyId}`
        : signal.sourceUrl ?? "/veille",
      sourceUrl: signal.sourceUrl,
    }))
}
