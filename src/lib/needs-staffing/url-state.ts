export type NeedsStaffingScope = "needs" | "staffing"
export type NeedsStaffingView = "list" | "kanban" | "planning"
export type NeedsStaffingSortField = "acv" | null
export type NeedsStaffingDirection = "asc" | "desc" | null

export interface NeedsStaffingUrlState {
  scope: NeedsStaffingScope
  view: NeedsStaffingView
  stage: string | null
  priority: string | null
  practice: string | null
  sort: NeedsStaffingSortField
  direction: NeedsStaffingDirection
}

type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

export const DEFAULT_NEEDS_STAFFING_STATE: NeedsStaffingUrlState = {
  scope: "needs",
  view: "list",
  stage: null,
  priority: null,
  practice: null,
  sort: null,
  direction: null,
}

function firstValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function readParam(params: RawSearchParams, key: string) {
  if (params instanceof URLSearchParams) {
    return params.get(key)
  }

  return firstValue(params[key])
}

function normalizeOptionalValue(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseNeedsStaffingUrlState(params: RawSearchParams): NeedsStaffingUrlState {
  const scope = readParam(params, "scope")
  const view = readParam(params, "view")
  const sort = readParam(params, "sort")
  const direction = readParam(params, "direction")

  return {
    scope: scope === "staffing" ? "staffing" : "needs",
    view: view === "kanban" || view === "planning" ? view : "list",
    stage: normalizeOptionalValue(readParam(params, "stage")),
    priority: normalizeOptionalValue(readParam(params, "priority")),
    practice: normalizeOptionalValue(readParam(params, "practice")),
    sort: sort === "acv" ? "acv" : null,
    direction: direction === "asc" || direction === "desc" ? direction : null,
  }
}

export function writeNeedsStaffingUrlState(state: NeedsStaffingUrlState) {
  const params = new URLSearchParams()

  params.set("scope", state.scope)

  if (state.view !== DEFAULT_NEEDS_STAFFING_STATE.view) {
    params.set("view", state.view)
  }

  if (state.stage) params.set("stage", state.stage)
  if (state.priority) params.set("priority", state.priority)
  if (state.practice) params.set("practice", state.practice)
  if (state.sort) params.set("sort", state.sort)
  if (state.direction) params.set("direction", state.direction)

  return params
}

export function buildNeedsStaffingUrl(pathname: string, state: NeedsStaffingUrlState) {
  const params = writeNeedsStaffingUrlState(state)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function resolveLegacyStaffingRedirect(params: RawSearchParams) {
  const state = parseNeedsStaffingUrlState(params)
  return buildNeedsStaffingUrl("/missions/opps", {
    ...state,
    scope: "staffing",
  })
}
