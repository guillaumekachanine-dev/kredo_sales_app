"use client"

// Lecture directe depuis le navigateur, RLS workspace — même doctrine que
// `watch-analysis-client-queries.ts` et le sélecteur de besoins du matching :
// une lecture d'affichage, sans écriture ni décision métier côté client.

import { createClient } from "@/lib/supabase/client"
import {
  AGENDA_LIGHT_HORIZON_DAYS,
  buildAgendaLight,
  type AgendaLightEventRow,
  type AgendaLightResult,
} from "./agenda-light"

type Row = {
  id: string
  title: string
  event_type: string
  status: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean | null
  location: string | null
  companies: { name: string | null } | { name: string | null }[] | null
}

export async function fetchAgendaLight(): Promise<AgendaLightResult> {
  const supabase = createClient()
  const now = new Date()
  // On repart de la veille : un événement commencé hier et encore en cours doit
  // rester visible.
  const floor = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const ceiling = new Date(now.getTime() + AGENDA_LIGHT_HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,title,event_type,status,starts_at,ends_at,all_day,location,companies(name)")
    .gte("starts_at", floor)
    .lte("starts_at", ceiling)
    .order("starts_at", { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)

  const events = (data ?? []).map<AgendaLightEventRow>((row) => {
    const typed = row as unknown as Row
    const company = Array.isArray(typed.companies) ? typed.companies[0] : typed.companies
    return {
      id: typed.id,
      title: typed.title,
      eventType: typed.event_type,
      status: typed.status,
      startsAt: typed.starts_at,
      endsAt: typed.ends_at,
      allDay: typed.all_day,
      location: typed.location,
      companyName: company?.name ?? null,
    }
  })

  return buildAgendaLight({
    now: now.toISOString(),
    horizonDays: AGENDA_LIGHT_HORIZON_DAYS,
    events,
  })
}
