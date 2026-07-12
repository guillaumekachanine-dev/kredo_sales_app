"use server"

import { createClient } from "@/lib/supabase/server"

export interface EventResource {
  name: string
  type: string
  size?: number
  url?: string
  storage_path?: string
  bucket?: string
  created_at?: string
}

type EventTimelineItem = EventDrawerDetail["timeline"][number]

export interface EventDrawerDetail {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  description: string | null
  location: string | null
  meeting_url: string | null
  metadata: unknown
  company: { id: string; name: string } | null
  contact: { id: string; full_name: string; email: string | null; phone: string | null; job_title: string | null } | null
  opportunity: { id: string; title: string } | null
  mission: {
    id: string
    title: string
    collaborator: { id: string; full_name: string | null } | null
  } | null
  candidate: { id: string; full_name: string; status: string } | null
  preparatory_task: { id: string; title: string; due_date: string | null; priority: string; status: string } | null
  timeline: Array<{
    id: string
    title: string
    starts_at: string
    ends_at: string
    event_type: string
    description: string | null
  }>
  timelineContext: {
    type: "opportunity" | "company" | "candidate" | "none"
    name: string
  }
}

export async function getEventDetailForDrawer(eventId: string): Promise<EventDrawerDetail | null> {
  const supabase = await createClient()

  // 1. Fetch calendar event details
  const { data: event, error: eventError } = await supabase
    .from("calendar_events")
    .select(`
      id,
      title,
      event_type,
      status,
      starts_at,
      ends_at,
      description,
      location,
      meeting_url,
      metadata,
      company_id,
      contact_id,
      opportunity_id,
      mission_id,
      candidate_id,
      companies ( id, name ),
      contacts (
        id,
        job_title,
        persons ( id, full_name, primary_email, phone )
      ),
      opportunities ( id, title ),
      missions (
        id,
        title,
        collaborators (
          id,
          persons ( id, full_name )
        )
      ),
      candidates (
        id,
        status,
        persons ( id, full_name )
      )
    `)
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    console.error("Error fetching event for drawer:", eventError)
    return null
  }

  // 2. Fetch preparatory task
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, status")
    .eq("calendar_event_id", eventId)
    .maybeSingle()

  // 3. Determine timeline context and fetch timeline events
  let timeline: EventTimelineItem[] = []
  let timelineContext: EventDrawerDetail["timelineContext"] = { type: "none", name: "" }

  if (event.opportunity_id) {
    timelineContext = { type: "opportunity", name: event.opportunities?.title || "Opportunité" }
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, event_type, description")
      .eq("opportunity_id", event.opportunity_id)
      .order("starts_at", { ascending: false })
    timeline = data || []
  } else if (event.mission_id) {
    timelineContext = { type: "opportunity", name: event.missions?.title || "Mission" }
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, event_type, description")
      .eq("mission_id", event.mission_id)
      .order("starts_at", { ascending: false })
    timeline = data || []
  } else if (event.candidate_id) {
    const candidatePerson = event.candidates?.persons
      ? Array.isArray(event.candidates.persons) ? event.candidates.persons[0] : event.candidates.persons
      : null
    timelineContext = { type: "candidate", name: candidatePerson?.full_name || "Candidat" }
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, event_type, description")
      .eq("candidate_id", event.candidate_id)
      .order("starts_at", { ascending: false })
    timeline = data || []
  } else if (event.company_id) {
    timelineContext = { type: "company", name: event.companies?.name || "Compte" }
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, event_type, description")
      .eq("company_id", event.company_id)
      .order("starts_at", { ascending: false })
    timeline = data || []
  }

  const contactPerson = event.contacts?.persons
    ? Array.isArray(event.contacts.persons) ? event.contacts.persons[0] : event.contacts.persons
    : null

  const candidatePerson = event.candidates?.persons
    ? Array.isArray(event.candidates.persons) ? event.candidates.persons[0] : event.candidates.persons
    : null
  const missionCollaborator = event.missions?.collaborators
    ? Array.isArray(event.missions.collaborators) ? event.missions.collaborators[0] : event.missions.collaborators
    : null
  const missionCollaboratorPerson = missionCollaborator?.persons
    ? Array.isArray(missionCollaborator.persons) ? missionCollaborator.persons[0] : missionCollaborator.persons
    : null

  return {
    id: event.id,
    title: event.title,
    event_type: event.event_type,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    description: event.description,
    location: event.location,
    meeting_url: event.meeting_url,
    metadata: event.metadata,
    company: event.companies ? { id: event.companies.id, name: event.companies.name } : null,
    contact: event.contacts
      ? {
          id: event.contacts.id,
          full_name: contactPerson?.full_name || "Contact sans nom",
          email: contactPerson?.primary_email || null,
          phone: contactPerson?.phone || null,
          job_title: event.contacts.job_title,
        }
      : null,
    opportunity: event.opportunities ? { id: event.opportunities.id, title: event.opportunities.title } : null,
    mission: event.missions
      ? {
          id: event.missions.id,
          title: event.missions.title,
          collaborator: missionCollaborator
            ? {
                id: missionCollaborator.id,
                full_name: missionCollaboratorPerson?.full_name ?? null,
              }
            : null,
        }
      : null,
    candidate: event.candidates
      ? {
          id: event.candidates.id,
          full_name: candidatePerson?.full_name || "Candidat sans nom",
          status: event.candidates.status,
        }
      : null,
    preparatory_task: task || null,
    timeline,
    timelineContext,
  }
}

export async function getEventResourceSignedUrl(bucket: string, storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600)
  if (error) {
    console.error("Error creating signed URL for resource:", error.message, { bucket, storagePath })
    return null
  }
  return data?.signedUrl || null
}
