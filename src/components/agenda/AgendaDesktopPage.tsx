import { redirect } from "next/navigation"
import { loadAgendaSnapshot } from "@/lib/agenda/aggregate-agenda-snapshot"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { AgendaDesktopWorkspace } from "./AgendaDesktopWorkspace"
import {
  buildAgendaDesktopPresentation,
  buildAgendaDesktopRange,
  buildAgendaQueryFiltersFromRoute,
  parseAgendaDesktopRouteState,
} from "./agenda-desktop-model"

interface AgendaDesktopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function AgendaDesktopPage({ searchParams }: AgendaDesktopPageProps) {
  const now = new Date().toISOString()
  const resolvedSearchParams = await searchParams
  const parsedRoute = parseAgendaDesktopRouteState(resolvedSearchParams, now, AGENDA_V1_TIMEZONE)

  if (parsedRoute.shouldRedirect) {
    redirect(`/agenda?${parsedRoute.canonicalQueryString}`)
  }

  const range = buildAgendaDesktopRange(parsedRoute.route, AGENDA_V1_TIMEZONE)
  const snapshot = await loadAgendaSnapshot({
    from: range.from,
    to: range.to,
    now,
    timezone: AGENDA_V1_TIMEZONE,
    filters: buildAgendaQueryFiltersFromRoute(parsedRoute.route),
  })
  const presentation = buildAgendaDesktopPresentation(snapshot, parsedRoute.route)

  return (
    <AgendaDesktopWorkspace
      snapshot={snapshot}
      presentation={presentation}
    />
  )
}
