import { redirect } from "next/navigation"
import { loadAgendaSnapshot } from "@/lib/agenda/aggregate-agenda-snapshot"
import { AGENDA_V1_TIMEZONE } from "@/lib/agenda/agenda-thresholds"
import { parseAgendaMobileRouteState, buildAgendaMobileRange } from "./agenda-mobile-model"
import { AgendaMobileWorkspace } from "./AgendaMobileWorkspace"

interface AgendaMobilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function AgendaMobilePage({ searchParams }: AgendaMobilePageProps) {
  const now = new Date().toISOString()
  const resolvedSearchParams = await searchParams
  const parsedRoute = parseAgendaMobileRouteState(resolvedSearchParams, now, AGENDA_V1_TIMEZONE)

  if (parsedRoute.shouldRedirect) {
    redirect(`/agenda?${parsedRoute.canonicalQueryString}`)
  }

  const range = buildAgendaMobileRange(now, AGENDA_V1_TIMEZONE)
  const snapshot = await loadAgendaSnapshot({
    from: range.from,
    to: range.to,
    now,
    timezone: AGENDA_V1_TIMEZONE,
    filters: {},
  })

  return (
    <AgendaMobileWorkspace
      snapshot={snapshot}
      initialMode={parsedRoute.mode}
      initialDate={parsedRoute.date}
      initialFilters={parsedRoute.filters}
    />
  )
}
