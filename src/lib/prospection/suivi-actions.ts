"use server"

import { createClient } from "@/lib/supabase/server"

export type CalendarEventItem = {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  description: string | null
  organizer_id: string | null
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  candidate_id: string | null
  companies: { id: string; name: string } | null
  contacts: {
    id: string
    job_title: string | null
    persons: { id: string; full_name: string | null; primary_email: string | null } | null
  } | null
  opportunities: { id: string; title: string } | null
  candidates: {
    id: string
    persons: { id: string; full_name: string | null } | null
  } | null
}

function getDateRangeForPeriod(period: "semaine" | "mois" | "trimestre" | "année") {
  const now = new Date()
  let start = new Date(now)
  let end = new Date(now)

  if (period === "semaine") {
    // Semaine courante : du lundi 00:00 au dimanche 23:59:59
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    start.setDate(now.getDate() + diffToMonday)
    start.setHours(0, 0, 0, 0)

    end = new Date(start)
    end.setDate(start.getDate() + 7)
    end.setMilliseconds(-1)
  } else if (period === "mois") {
    // Mois courant
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
    end.setMilliseconds(-1)
  } else if (period === "trimestre") {
    // Trimestre courant
    const quarter = Math.floor(now.getMonth() / 3)
    start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0)
    end = new Date(now.getFullYear(), (quarter + 1) * 3, 1, 0, 0, 0, 0)
    end.setMilliseconds(-1)
  } else if (period === "année") {
    // Année courante
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    end = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0)
    end.setMilliseconds(-1)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

export async function getCalendarEventsForSuivi(
  period: "semaine" | "mois" | "trimestre" | "année",
  dbTypes: string[]
): Promise<CalendarEventItem[]> {
  if (!dbTypes || dbTypes.length === 0) {
    return []
  }

  const dateRange = getDateRangeForPeriod(period)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("calendar_events")
    .select(`
      id,
      title,
      event_type,
      status,
      starts_at,
      ends_at,
      description,
      organizer_id,
      company_id,
      contact_id,
      opportunity_id,
      candidate_id,
      companies ( id, name ),
      contacts (
        id,
        job_title,
        persons ( id, full_name, primary_email )
      ),
      opportunities ( id, title ),
      candidates (
        id,
        persons ( id, full_name )
      )
    `)
    .in("event_type", dbTypes)
    .lt("starts_at", dateRange.end)
    .gt("ends_at", dateRange.start)
    .order("starts_at", { ascending: true })

  if (error) {
    console.error("Error in getCalendarEventsForSuivi:", error)
    return []
  }

  return (data || []) as unknown as CalendarEventItem[]
}
