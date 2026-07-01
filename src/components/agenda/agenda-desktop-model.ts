import { AGENDA_V1_THRESHOLDS } from "@/lib/agenda/agenda-thresholds"
import {
  buildDisplayGroups,
} from "@/lib/agenda/agenda-selectors"
import {
  compareAgendaItems,
  compareDateKeys,
  getAgendaTimeboxDateRange,
  getAgendaTimeboxPrimaryAt,
  getLocalDateKey,
  getTodayDateKey,
  getWeekStartDateKey,
  getZonedParts,
  isAgendaActionable,
  isAgendaAllDayLaneItem,
  startOfLocalDay,
} from "@/lib/agenda/agenda-temporal"
import type {
  AgendaDeepLink,
  AgendaDesktopViewModel,
  AgendaDomain,
  AgendaGroupedItem,
  AgendaItem,
  AgendaItemType,
  AgendaPriority,
  AgendaSnapshot,
} from "@/lib/agenda/agenda-types"

export type AgendaDesktopView = "day" | "week"

export type AgendaDesktopRouteState = {
  view: AgendaDesktopView
  date: string
  filters: {
    domains: AgendaDomain[]
    types: AgendaItemType[]
    priorities: AgendaPriority[]
    ownerId: string | null
    companyId: string | null
    actionable: boolean
  }
}

export type AgendaDesktopVisibleDay = {
  date: string
  shortLabel: string
  dayNumber: string
  fullLabel: string
  isToday: boolean
}

export type AgendaAllDayPlacement = {
  id: string
  item: AgendaItem
  startColumn: number
  endColumn: number
  row: number
  hidden: boolean
}

export type AgendaScheduledPlacement = {
  id: string
  item: Extract<AgendaItem, { type: "scheduled_event" }>
  topPct: number
  heightPct: number
  columnIndex: number
  columnCount: number
  hasLinkedTask: boolean
  hasConflict: boolean
}

export type AgendaDesktopRailSectionKey =
  | "today"
  | "prepare"
  | "conflicts"
  | "deadlines"

export type AgendaDesktopRailSection = {
  key: AgendaDesktopRailSectionKey
  label: string
  count: number
  initialCount: number
  items: AgendaGroupedItem[]
}

export type AgendaDesktopInteraction =
  | {
      kind: "global_event_drawer"
      eventId: string
    }
  | {
      kind: "agenda_item_drawer"
      itemId: string
    }

export type AgendaItemDrawerAction = {
  key: "open-primary" | "open-related" | "hide-session"
  label: string
  href?: string
}

export type AgendaFilterChip = {
  key: string
  label: string
  clearHref: string
}

export type AgendaDesktopPresentation = {
  route: AgendaDesktopRouteState
  canonicalQueryString: string
  shouldRedirect: boolean
  periodLabel: string
  visibleDays: AgendaDesktopVisibleDay[]
  allDayPlacements: AgendaAllDayPlacement[]
  allDayOverflowByDay: Record<string, number>
  scheduledColumns: Array<{
    day: AgendaDesktopVisibleDay
    items: AgendaScheduledPlacement[]
  }>
  railSections: AgendaDesktopRailSection[]
  partialErrorSources: string[]
  activeFilterChips: AgendaFilterChip[]
  filterOptions: {
    domains: Array<{ value: string; label: string }>
    types: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    owners: Array<{ value: string; label: string }>
    companies: Array<{ value: string; label: string }>
  }
  summary: AgendaSnapshot["summary"]
  emptyState:
    | "empty"
    | "filtered"
    | "no-scheduled-events"
    | "ready"
  desktopViewModel: AgendaDesktopViewModel
}

type ScheduledSlotItem = Extract<AgendaItem, { type: "scheduled_event" }> & {
  timebox: Extract<Extract<AgendaItem, { type: "scheduled_event" }>["timebox"], { kind: "slot" }>
}

type SearchParamsRecord = Record<string, string | string[] | undefined>

const VALID_VIEWS = new Set<AgendaDesktopView>(["day", "week"])
const VALID_DOMAINS = new Set<AgendaDomain>([
  "agenda",
  "missions",
  "commerce",
  "recruitment",
  "staffing",
  "consultants",
])
const VALID_TYPES = new Set<AgendaItemType>([
  "scheduled_event",
  "task",
  "deadline",
  "alert",
  "availability_block",
])
const VALID_PRIORITIES = new Set<AgendaPriority>(["low", "normal", "high", "urgent"])

const DOMAIN_LABELS: Record<AgendaDomain, string> = {
  agenda: "Agenda",
  missions: "Missions",
  commerce: "Commerce",
  recruitment: "Recrutement",
  staffing: "Staffing",
  consultants: "Consultants",
}

const TYPE_LABELS: Record<AgendaItemType, string> = {
  scheduled_event: "Événement",
  task: "Tâche",
  deadline: "Échéance",
  alert: "Alerte",
  availability_block: "Disponibilité",
}

const PRIORITY_LABELS: Record<AgendaPriority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
}

const SOURCE_LABELS: Record<string, string> = {
  calendar_event: "Événements planifiés",
  task: "Tâches",
  mission: "Missions",
  opportunity: "Opportunités",
  candidate_hiring_milestone: "Recrutement",
  collaborator_absence: "Absences",
  client_closure: "Fermetures client",
  derived: "Alertes dérivées",
}

const DAY_START_HOUR = 8
const DAY_END_HOUR = 19
const MAX_ALL_DAY_ROWS = 3
const MAX_RAIL_ITEMS = 4

function toArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value
  if (typeof value === "string") return [value]
  return []
}

function addDays(date: string, offset: number) {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part ?? "", 10))
  const next = new Date(Date.UTC(year, month - 1, day + offset))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`
}

function parseCsv<T extends string>(raw: string | string[] | undefined, valid: Set<T>) {
  const values = toArray(raw)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry): entry is T => valid.has(entry as T))

  return [...new Set(values)]
}

function isValidIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function buildCanonicalQueryString(state: AgendaDesktopRouteState) {
  const params = new URLSearchParams()
  params.set("view", state.view)
  params.set("date", state.date)

  if (state.filters.domains.length > 0) params.set("domains", state.filters.domains.join(","))
  if (state.filters.types.length > 0) params.set("types", state.filters.types.join(","))
  if (state.filters.priorities.length > 0) params.set("priorities", state.filters.priorities.join(","))
  if (state.filters.ownerId) params.set("owner", state.filters.ownerId)
  if (state.filters.companyId) params.set("company", state.filters.companyId)
  if (state.filters.actionable) params.set("actionable", "true")

  return params.toString()
}

function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string) {
  return compareDateKeys(startA, endB) <= 0 && compareDateKeys(endA, startB) >= 0
}

function urgencyWeight(item: AgendaItem) {
  const temporal = {
    overdue: 0,
    ongoing: 1,
    today: 2,
    upcoming: 3,
    past: 4,
  }[item.temporalState]

  const priority = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  }[item.priority]

  return temporal * 10 + priority
}

function sortGroups(groups: AgendaGroupedItem[]) {
  return [...groups].sort((left, right) => {
    const urgency = urgencyWeight(left.primaryItem) - urgencyWeight(right.primaryItem)
    if (urgency !== 0) return urgency
    return getAgendaTimeboxPrimaryAt(left.primaryItem.timebox).localeCompare(
      getAgendaTimeboxPrimaryAt(right.primaryItem.timebox),
    )
  })
}

function formatDayLabel(
  date: string,
  timezone: string,
  today: string,
): AgendaDesktopVisibleDay {
  const dateObject = startOfLocalDay(date, timezone)

  return {
    date,
    shortLabel: dateObject.toLocaleDateString("fr-FR", {
      weekday: "short",
      timeZone: timezone,
    }),
    dayNumber: dateObject.toLocaleDateString("fr-FR", {
      day: "numeric",
      timeZone: timezone,
    }),
    fullLabel: dateObject.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }),
    isToday: date === today,
  }
}

function buildPeriodLabel(
  route: AgendaDesktopRouteState,
  visibleDays: AgendaDesktopVisibleDay[],
  timezone: string,
) {
  if (route.view === "day") {
    return startOfLocalDay(route.date, timezone).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    })
  }

  const first = startOfLocalDay(visibleDays[0].date, timezone)
  const last = startOfLocalDay(visibleDays[visibleDays.length - 1].date, timezone)

  return `${first.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  })} au ${last.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  })}`
}

function filterItemsForVisibleWindow(items: AgendaItem[], visibleDays: string[], timezone: string) {
  const startDate = visibleDays[0]
  const endDate = visibleDays[visibleDays.length - 1]

  return items.filter((item) => {
    const range = getAgendaTimeboxDateRange(item.timebox, timezone)
    return isDateRangeOverlapping(range.startDate, range.endDate, startDate, endDate)
  })
}

function computeScheduledPlacement(
  item: ScheduledSlotItem,
  timezone: string,
  columnIndex: number,
  columnCount: number,
  hasLinkedTask: boolean,
  hasConflict: boolean,
): AgendaScheduledPlacement {
  const start = getZonedParts(item.timebox.startAt, timezone)
  const end = getZonedParts(item.timebox.endAt, timezone)

  const startMinutes = start.hour * 60 + start.minute
  const endMinutes = end.hour * 60 + end.minute
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60
  const clampedStart = Math.max(DAY_START_HOUR * 60, startMinutes)
  const clampedEnd = Math.min(DAY_END_HOUR * 60, Math.max(endMinutes, clampedStart + 30))
  const topPct = ((clampedStart - DAY_START_HOUR * 60) / totalMinutes) * 100
  const heightPct = Math.max(((clampedEnd - clampedStart) / totalMinutes) * 100, 5)

  return {
    id: item.id,
    item,
    topPct,
    heightPct,
    columnIndex,
    columnCount,
    hasLinkedTask,
    hasConflict,
  }
}

function buildScheduledColumns(
  items: AgendaItem[],
  visibleDays: AgendaDesktopVisibleDay[],
  relationGroups: AgendaGroupedItem[],
  timezone: string,
) {
  const linkedEventIds = new Set(
    relationGroups
      .filter((group) => group.kind === "event_task_pair")
      .flatMap((group) =>
        group.items
          .filter((item) => item.type === "scheduled_event")
          .map((item) => item.id),
      ),
  )
  const conflictEventIds = new Set(
    items
      .filter(
        (item): item is Extract<AgendaItem, { type: "alert" }> =>
          item.type === "alert" && item.alertKind === "schedule_conflict",
      )
      .flatMap((item) => item.relatedItemIds),
  )

  return visibleDays.map((day) => {
    const dayEvents = items
      .filter(
        (item): item is ScheduledSlotItem =>
          item.type === "scheduled_event" &&
          item.timebox.kind === "slot" &&
          !isAgendaAllDayLaneItem(item, timezone) &&
          getLocalDateKey(item.timebox.startAt, timezone) === day.date,
      )
      .sort(compareAgendaItems)

    const columns: Array<Array<ScheduledSlotItem>> = []

    for (const event of dayEvents) {
      let targetColumn = 0
      while (targetColumn < columns.length) {
        const hasOverlap = columns[targetColumn].some((existing) => {
          const existingStart = new Date(getAgendaTimeboxPrimaryAt(existing.timebox)).getTime()
          const existingEnd = new Date(existing.timebox.endAt).getTime()
          const eventStart = new Date(getAgendaTimeboxPrimaryAt(event.timebox)).getTime()
          const eventEnd = new Date(event.timebox.endAt).getTime()
          return eventStart < existingEnd && eventEnd > existingStart
        })
        if (!hasOverlap) break
        targetColumn += 1
      }

      if (!columns[targetColumn]) columns[targetColumn] = []
      columns[targetColumn].push(event)
    }

    const placements = dayEvents.map((event) => {
      const columnIndex = columns.findIndex((column) => column.includes(event))
      const overlappingColumnCount = Math.max(
        1,
        columns.filter((column) =>
          column.some((existing) => {
            const existingStart = new Date(getAgendaTimeboxPrimaryAt(existing.timebox)).getTime()
            const existingEnd = new Date(existing.timebox.endAt).getTime()
            const eventStart = new Date(getAgendaTimeboxPrimaryAt(event.timebox)).getTime()
            const eventEnd = new Date(event.timebox.endAt).getTime()
            return eventStart < existingEnd && eventEnd > existingStart
          }),
        ).length,
      )

      return computeScheduledPlacement(
        event,
        timezone,
        Math.max(columnIndex, 0),
        overlappingColumnCount,
        linkedEventIds.has(event.id),
        conflictEventIds.has(event.id),
      )
    })

    return {
      day,
      items: placements,
    }
  })
}

function buildAllDayPlacements(
  items: AgendaItem[],
  visibleDays: AgendaDesktopVisibleDay[],
  timezone: string,
) {
  const allDayItems = items
    .filter(
      (item) =>
        item.type === "availability_block" ||
        (item.type === "scheduled_event" && isAgendaAllDayLaneItem(item, timezone)),
    )
    .sort(compareAgendaItems)

  const placements: AgendaAllDayPlacement[] = []
  const rows: Array<Array<{ startColumn: number; endColumn: number }>> = []

  for (const item of allDayItems) {
    const range = getAgendaTimeboxDateRange(item.timebox, timezone)
    const coveredDays = visibleDays
      .map((day, index) => ({ day, index }))
      .filter(({ day }) => isDateRangeOverlapping(range.startDate, range.endDate, day.date, day.date))

    if (coveredDays.length === 0) continue

    const startColumn = coveredDays[0].index
    const endColumn = coveredDays[coveredDays.length - 1].index
    let rowIndex = 0

    while (rowIndex < rows.length) {
      const hasOverlap = rows[rowIndex].some((rowPlacement) => (
        startColumn <= rowPlacement.endColumn && endColumn >= rowPlacement.startColumn
      ))
      if (!hasOverlap) break
      rowIndex += 1
    }

    if (!rows[rowIndex]) rows[rowIndex] = []
    rows[rowIndex].push({ startColumn, endColumn })

    placements.push({
      id: item.id,
      item,
      startColumn,
      endColumn,
      row: rowIndex,
      hidden: rowIndex >= MAX_ALL_DAY_ROWS,
    })
  }

  const overflowByDay = Object.fromEntries(visibleDays.map((day) => [day.date, 0]))
  for (const placement of placements) {
    if (!placement.hidden) continue
    for (const day of visibleDays.slice(placement.startColumn, placement.endColumn + 1)) {
      overflowByDay[day.date] += 1
    }
  }

  return {
    placements,
    overflowByDay,
  }
}

function buildRailSections(
  visibleGroups: AgendaGroupedItem[],
  now: string,
  timezone: string,
) {
  const today = getTodayDateKey(now, timezone)
  const assigned = new Set<string>()

  const conflicts = sortGroups(
    visibleGroups.filter(
      (group) =>
        group.primaryItem.type === "alert" &&
        group.primaryItem.alertKind === "schedule_conflict",
    ),
  )
  conflicts.forEach((group) => assigned.add(group.id))

  const todayGroups = sortGroups(
    visibleGroups.filter((group) => {
      if (assigned.has(group.id)) return false
      return group.items.some(
        (item) =>
          item.temporalState === "today" ||
          item.temporalState === "ongoing",
      )
    }),
  )
  todayGroups.forEach((group) => assigned.add(group.id))

  const prepareGroups = sortGroups(
    visibleGroups.filter((group) => {
      if (assigned.has(group.id)) return false
      const hasLinkedPrep = group.kind === "event_task_pair"
      const hasUpcomingTask = group.items.some(
        (item) =>
          item.type === "task" &&
          item.temporalState === "upcoming" &&
          getLocalDateKey(getAgendaTimeboxPrimaryAt(item.timebox), timezone) >= today,
      )
      return hasLinkedPrep || hasUpcomingTask
    }),
  )
  prepareGroups.forEach((group) => assigned.add(group.id))

  const deadlineGroups = sortGroups(
    visibleGroups.filter((group) => {
      if (assigned.has(group.id)) return false
      return group.items.some((item) => {
        if (item.type === "alert") {
          return item.alertKind === "week_tension" || item.alertKind === "deadline_at_risk"
        }
        return isAgendaActionable(item)
      })
    }),
  )

  return [
    {
      key: "today",
      label: "Aujourd’hui",
      count: todayGroups.length,
      initialCount: MAX_RAIL_ITEMS,
      items: todayGroups,
    },
    {
      key: "prepare",
      label: "À préparer",
      count: prepareGroups.length,
      initialCount: MAX_RAIL_ITEMS,
      items: prepareGroups,
    },
    {
      key: "conflicts",
      label: "Conflits",
      count: conflicts.length,
      initialCount: MAX_RAIL_ITEMS,
      items: conflicts,
    },
    {
      key: "deadlines",
      label: "Échéances",
      count: deadlineGroups.length,
      initialCount: MAX_RAIL_ITEMS,
      items: deadlineGroups,
    },
  ] satisfies AgendaDesktopRailSection[]
}

function uniqueOptionValues(items: AgendaItem[]) {
  const owners = new Map<string, string>()
  const companies = new Map<string, string>()

  for (const item of items) {
    if (item.ownerId && item.ownerLabel) owners.set(item.ownerId, item.ownerLabel)
    if (item.companyId && item.companyLabel) companies.set(item.companyId, item.companyLabel)
  }

  return {
    owners: [...owners.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    companies: [...companies.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}

function removeFilterFromRoute(route: AgendaDesktopRouteState, key: string) {
  switch (key) {
    case "owner":
      return { ...route, filters: { ...route.filters, ownerId: null } }
    case "company":
      return { ...route, filters: { ...route.filters, companyId: null } }
    case "actionable":
      return { ...route, filters: { ...route.filters, actionable: false } }
    default:
      if (key.startsWith("domain:")) {
        const domain = key.split(":")[1] as AgendaDomain
        return {
          ...route,
          filters: {
            ...route.filters,
            domains: route.filters.domains.filter((item) => item !== domain),
          },
        }
      }
      if (key.startsWith("type:")) {
        const type = key.split(":")[1] as AgendaItemType
        return {
          ...route,
          filters: {
            ...route.filters,
            types: route.filters.types.filter((item) => item !== type),
          },
        }
      }
      if (key.startsWith("priority:")) {
        const priority = key.split(":")[1] as AgendaPriority
        return {
          ...route,
          filters: {
            ...route.filters,
            priorities: route.filters.priorities.filter((item) => item !== priority),
          },
        }
      }
      return route
  }
}

function buildActiveFilterChips(
  route: AgendaDesktopRouteState,
  options: AgendaDesktopPresentation["filterOptions"],
) {
  const chips: AgendaFilterChip[] = []

  for (const domain of route.filters.domains) {
    chips.push({ key: `domain:${domain}`, label: `Domaine · ${DOMAIN_LABELS[domain]}`, clearHref: "" })
  }
  for (const type of route.filters.types) {
    chips.push({ key: `type:${type}`, label: `Nature · ${TYPE_LABELS[type]}`, clearHref: "" })
  }
  for (const priority of route.filters.priorities) {
    chips.push({
      key: `priority:${priority}`,
      label: `Priorité · ${PRIORITY_LABELS[priority]}`,
      clearHref: "",
    })
  }
  if (route.filters.ownerId) {
    const label = options.owners.find((owner) => owner.value === route.filters.ownerId)?.label ?? "Propriétaire"
    chips.push({ key: "owner", label: `Propriétaire · ${label}`, clearHref: "" })
  }
  if (route.filters.companyId) {
    const label = options.companies.find((company) => company.value === route.filters.companyId)?.label ?? "Compte"
    chips.push({ key: "company", label: `Compte · ${label}`, clearHref: "" })
  }
  if (route.filters.actionable) {
    chips.push({ key: "actionable", label: "Uniquement actionnable", clearHref: "" })
  }

  return chips
}

function buildPartialErrorSources(snapshot: AgendaSnapshot) {
  return snapshot.sourceResults
    .filter((result) => !result.ok)
    .map((result) => result.source)
}

export function getAgendaDomainLabel(domain: AgendaDomain) {
  return DOMAIN_LABELS[domain]
}

export function getAgendaItemTypeLabel(type: AgendaItemType) {
  return TYPE_LABELS[type]
}

export function getAgendaPriorityLabel(priority: AgendaPriority) {
  return PRIORITY_LABELS[priority]
}

export function getAgendaSourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source
}

export function getAgendaTemporalStateLabel(item: AgendaItem) {
  switch (item.temporalState) {
    case "overdue":
      return "En retard"
    case "ongoing":
      return "En cours"
    case "today":
      return "Aujourd’hui"
    case "upcoming":
      return "À venir"
    case "past":
      return "Passé"
  }
}

export function getAgendaBusinessStatusLabel(item: AgendaItem) {
  switch (item.businessStatus) {
    case "pending":
      return "Prévu"
    case "in_progress":
      return "En cours"
    case "completed":
      return "Terminé"
    case "cancelled":
      return "Annulé"
    case "unknown":
      return "Statut inconnu"
  }
}

export function formatAgendaTimeLabel(item: AgendaItem, timezone: string) {
  switch (item.timebox.kind) {
    case "slot": {
      const start = new Date(item.timebox.startAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      })
      const end = new Date(item.timebox.endAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      })
      return `${start} → ${end}`
    }
    case "deadline":
      return "Date limite"
    case "milestone":
      return "Jalon"
    case "all_day":
      return "Toute la journée"
    case "all_day_range":
      return `${item.timebox.startDate} → ${item.timebox.endDate}`
  }
}

export function formatAgendaDateLabel(item: AgendaItem, timezone: string) {
  const { startDate, endDate } = getAgendaTimeboxDateRange(item.timebox, timezone)

  if (startDate === endDate) {
    return startOfLocalDay(startDate, timezone).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    })
  }

  const start = startOfLocalDay(startDate, timezone).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  })
  const end = startOfLocalDay(endDate, timezone).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  })

  return `${start} → ${end}`
}

export function formatAgendaRangeShortLabel(route: AgendaDesktopRouteState) {
  return route.view === "day" ? "Jour" : "Semaine"
}

export function buildAgendaItemDrawerActions(item: AgendaItem) {
  const actions: AgendaItemDrawerAction[] = [
    {
      key: "open-primary",
      label: "Ouvrir la source",
      href: item.primaryLink.href,
    },
  ]

  for (const link of item.relatedLinks) {
    if (actions.some((action) => action.href === link.href)) continue
    actions.push({
      key: "open-related",
      label: link.label,
      href: link.href,
    })
  }

  if (item.type === "alert") {
    actions.push({
      key: "hide-session",
      label: "Masquer pour la session",
    })
  }

  return actions
}

export function resolveAgendaDesktopInteraction(item: AgendaItem): AgendaDesktopInteraction {
  if (item.type === "scheduled_event") {
    return {
      kind: "global_event_drawer",
      eventId: item.sourceId,
    }
  }

  return {
    kind: "agenda_item_drawer",
    itemId: item.id,
  }
}

export function buildAgendaToolbarHref(
  route: AgendaDesktopRouteState,
  next: Partial<AgendaDesktopRouteState["filters"] & Pick<AgendaDesktopRouteState, "view" | "date">>,
) {
  const updatedRoute: AgendaDesktopRouteState = {
    view: next.view ?? route.view,
    date: next.date ?? route.date,
    filters: {
      domains: next.domains ?? route.filters.domains,
      types: next.types ?? route.filters.types,
      priorities: next.priorities ?? route.filters.priorities,
      ownerId: next.ownerId ?? route.filters.ownerId,
      companyId: next.companyId ?? route.filters.companyId,
      actionable: next.actionable ?? route.filters.actionable,
    },
  }

  return `/agenda?${buildCanonicalQueryString(updatedRoute)}`
}

export function parseAgendaDesktopRouteState(
  searchParams: SearchParamsRecord,
  now: string,
  timezone: string,
) {
  const today = getTodayDateKey(now, timezone)
  const rawView = toArray(searchParams.view)[0]
  const rawDate = toArray(searchParams.date)[0]

  const view: AgendaDesktopView = VALID_VIEWS.has(rawView as AgendaDesktopView)
    ? (rawView as AgendaDesktopView)
    : "week"
  const date = isValidIsoDate(rawDate) ? rawDate : today

  const route: AgendaDesktopRouteState = {
    view,
    date,
    filters: {
      domains: parseCsv(searchParams.domains, VALID_DOMAINS),
      types: parseCsv(searchParams.types, VALID_TYPES),
      priorities: parseCsv(searchParams.priorities, VALID_PRIORITIES),
      ownerId: toArray(searchParams.owner)[0] ?? null,
      companyId: toArray(searchParams.company)[0] ?? null,
      actionable: toArray(searchParams.actionable)[0] === "true",
    },
  }

  const canonicalQueryString = buildCanonicalQueryString(route)
  const incoming = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    for (const entry of toArray(value)) {
      incoming.append(key, entry)
    }
  }

  return {
    route,
    canonicalQueryString,
    shouldRedirect: incoming.toString() !== canonicalQueryString,
  }
}

export function buildAgendaDesktopRange(route: AgendaDesktopRouteState, timezone: string) {
  const startDate = route.view === "week"
    ? getWeekStartDateKey(route.date)
    : route.date
  const visibleDayCount = route.view === "week" ? 5 : 1
  const visibleDays = Array.from(
    { length: visibleDayCount },
    (_, index) => addDays(startDate, index),
  )
  const from = startOfLocalDay(startDate, timezone).toISOString()
  const to = startOfLocalDay(addDays(startDate, visibleDayCount), timezone).toISOString()

  return {
    from,
    to,
    visibleDays,
  }
}

export function buildAgendaQueryFiltersFromRoute(
  route: AgendaDesktopRouteState,
): AgendaSnapshot["query"]["filters"] {
  return {
    domains: route.filters.domains.length > 0 ? route.filters.domains : undefined,
    itemTypes: route.filters.types.length > 0 ? route.filters.types : undefined,
    priorities: route.filters.priorities.length > 0 ? route.filters.priorities : undefined,
    ownerIds: route.filters.ownerId ? [route.filters.ownerId] : undefined,
    companyIds: route.filters.companyId ? [route.filters.companyId] : undefined,
    onlyActionable: route.filters.actionable || undefined,
  }
}

export function buildAgendaDesktopPresentation(
  snapshot: AgendaSnapshot,
  route: AgendaDesktopRouteState,
): AgendaDesktopPresentation {
  const { visibleDays: dayKeys } = buildAgendaDesktopRange(route, snapshot.query.timezone)
  const today = getTodayDateKey(snapshot.query.now, snapshot.query.timezone)
  const visibleDays = dayKeys.map((day) => formatDayLabel(day, snapshot.query.timezone, today))
  const filteredItems = filterItemsForVisibleWindow(snapshot.items, dayKeys, snapshot.query.timezone)
  const displayGroups = buildDisplayGroups(filteredItems, snapshot.relationGroups)
  const scheduledColumns = buildScheduledColumns(
    filteredItems,
    visibleDays,
    displayGroups,
    snapshot.query.timezone,
  )
  const { placements, overflowByDay } = buildAllDayPlacements(
    filteredItems,
    visibleDays,
    snapshot.query.timezone,
  )
  const railSections = buildRailSections(displayGroups, snapshot.query.now, snapshot.query.timezone)
  const options = uniqueOptionValues(snapshot.items)
  const activeFilterChips = buildActiveFilterChips(route, {
    domains: Object.entries(DOMAIN_LABELS).map(([value, label]) => ({ value, label })),
    types: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
    priorities: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
    owners: options.owners,
    companies: options.companies,
  }).map((chip) => ({
    ...chip,
    clearHref: `/agenda?${buildCanonicalQueryString(removeFilterFromRoute(route, chip.key))}`,
  }))

  const desktopViewModel: AgendaDesktopViewModel = {
    timezone: snapshot.query.timezone,
    generatedAt: snapshot.generatedAt,
    itemsById: Object.fromEntries(filteredItems.map((item) => [item.id, item])),
    days: visibleDays.map((day) => ({
      date: day.date,
      allDayItems: placements
        .filter(
          (placement) =>
            !placement.hidden &&
            dayKeys
              .slice(placement.startColumn, placement.endColumn + 1)
              .includes(day.date),
        )
        .map((placement) => placement.item),
      timedItems:
        scheduledColumns
          .find((column) => column.day.date === day.date)
          ?.items.map((placement) => placement.item) ?? [],
      attentionItems: filteredItems.filter((item) => {
        const range = getAgendaTimeboxDateRange(item.timebox, snapshot.query.timezone)
        return (
          day.date >= range.startDate &&
          day.date <= range.endDate &&
          (item.temporalState === "overdue" || item.type === "alert")
        )
      }),
      groupedItems: displayGroups.filter((group) =>
        group.items.some((item) => {
          const range = getAgendaTimeboxDateRange(item.timebox, snapshot.query.timezone)
          return day.date >= range.startDate && day.date <= range.endDate
        }),
      ),
      isDense:
        (scheduledColumns.find((column) => column.day.date === day.date)?.items.length ?? 0) >=
        AGENDA_V1_THRESHOLDS.denseDayVisibleItems,
      conflicts: filteredItems.filter(
        (item): item is Extract<AgendaItem, { type: "alert" }> =>
          item.type === "alert" &&
          item.alertKind === "schedule_conflict" &&
          item.relatedItemIds.some((relatedId) =>
            displayGroups.some((group) =>
              group.items.some((groupItem) => {
                if (groupItem.id !== relatedId) return false
                const range = getAgendaTimeboxDateRange(groupItem.timebox, snapshot.query.timezone)
                return day.date >= range.startDate && day.date <= range.endDate
              }),
            ),
          ),
      ),
    })),
    relationGroups: displayGroups,
    partial: snapshot.partial,
    errors: snapshot.errors,
    summary: snapshot.summary,
  }

  const hasScheduled = scheduledColumns.some((column) => column.items.length > 0)
  const hasAllDay = placements.some((placement) => !placement.hidden)
  const hasActionRail = railSections.some((section) => section.count > 0)
  const emptyState = filteredItems.length === 0
    ? (snapshot.items.length === 0 ? "empty" : "filtered")
    : !hasScheduled && (hasAllDay || hasActionRail)
      ? "no-scheduled-events"
      : "ready"

  return {
    route,
    canonicalQueryString: buildCanonicalQueryString(route),
    shouldRedirect: false,
    periodLabel: buildPeriodLabel(route, visibleDays, snapshot.query.timezone),
    visibleDays,
    allDayPlacements: placements,
    allDayOverflowByDay: overflowByDay,
    scheduledColumns,
    railSections,
    partialErrorSources: buildPartialErrorSources(snapshot),
    activeFilterChips,
    filterOptions: {
      domains: Object.entries(DOMAIN_LABELS).map(([value, label]) => ({ value, label })),
      types: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
      priorities: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
      owners: options.owners,
      companies: options.companies,
    },
    summary: snapshot.summary,
    emptyState,
    desktopViewModel,
  }
}

export function isAgendaDesktopCurrentTimeVisible(
  dayDate: string,
  now: string,
  timezone: string,
) {
  if (dayDate !== getTodayDateKey(now, timezone)) return false
  const { hour } = getZonedParts(now, timezone)
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR
}

export function getAgendaDesktopCurrentTimeTopPct(now: string, timezone: string) {
  const { hour, minute } = getZonedParts(now, timezone)
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60
  const minutesSinceStart = (hour - DAY_START_HOUR) * 60 + minute
  return (minutesSinceStart / totalMinutes) * 100
}

export function getAgendaDesktopDayHours() {
  return {
    startHour: DAY_START_HOUR,
    endHour: DAY_END_HOUR,
    hours: Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index),
  }
}

export function isAgendaGroupHidden(group: AgendaGroupedItem, hiddenItemIds: Set<string>) {
  return group.items.every((item) => hiddenItemIds.has(item.id))
}

export function getAgendaPrimaryDeepLinks(item: AgendaItem) {
  const links: AgendaDeepLink[] = [item.primaryLink]

  for (const link of item.relatedLinks) {
    if (!links.some((existing) => existing.href === link.href)) {
      links.push(link)
    }
  }

  return links
}
