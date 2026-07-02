import { createClient } from "@supabase/supabase-js"
import { aggregateAgendaSnapshot, buildAgendaQuery } from "./lib/agenda/aggregate-agenda-snapshot"
import { AGENDA_V1_TIMEZONE } from "./lib/agenda/agenda-thresholds"
import {
  buildAgendaDesktopPresentation,
  buildAgendaDesktopRange,
  buildAgendaQueryFiltersFromRoute,
  parseAgendaDesktopRouteState,
} from "./components/agenda/agenda-desktop-model"

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const userId = "61decd1c-97b2-4fc1-9570-80c52ce001d3"

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single()

  const workspaceId = profile?.workspace_id
  if (!workspaceId) throw new Error("No workspace id found")

  const now = "2026-07-03T12:00:00.000Z"
  const searchParams = {
    view: "week",
    date: "2026-07-03",
    priorities: "high",
  }

  const parsedRoute = parseAgendaDesktopRouteState(searchParams, now, AGENDA_V1_TIMEZONE)
  const range = buildAgendaDesktopRange(parsedRoute.route, AGENDA_V1_TIMEZONE)

  try {
    const query = buildAgendaQuery({
      from: range.from,
      to: range.to,
      now,
      timezone: AGENDA_V1_TIMEZONE,
      filters: buildAgendaQueryFiltersFromRoute(parsedRoute.route),
      workspaceId,
    })

    console.log("Loading snapshot with aggregateAgendaSnapshot...")
    const snapshot = await aggregateAgendaSnapshot(query, { supabase })
    console.log("Snapshot loaded. Item count:", snapshot.items.length)

    console.log("Building presentation with empty items list...")
    const emptySnapshot = { ...snapshot, items: [], relationGroups: [] }
    const presentation = buildAgendaDesktopPresentation(emptySnapshot, parsedRoute.route)
    console.log("Presentation built successfully for empty items!")
  } catch (error) {
    console.error("CRASH DETECTED:")
    console.error(error)
  }
}

run()
