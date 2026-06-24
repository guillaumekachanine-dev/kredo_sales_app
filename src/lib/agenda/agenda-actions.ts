"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  AgendaEvent,
  AgendaEventFormInput,
  AgendaSelectCandidate,
  AgendaSelectContact,
  AgendaSelectOpportunity,
} from "./agenda-types"

type AgendaPersonRow = {
  id: string
  full_name: string | null
  primary_email?: string | null
}

type AgendaContactRelationRow = {
  id: string
  job_title: string | null
  persons: AgendaPersonRow | AgendaPersonRow[] | null
}

type AgendaCandidateRelationRow = {
  id: string
  persons: AgendaPersonRow | AgendaPersonRow[] | null
}

type AgendaOpportunityRelationRow = {
  id: string
  title: string
}

type AgendaCompanyRelationRow = {
  id: string
  name: string
}

type AgendaEventRow = {
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
  companies: AgendaCompanyRelationRow | null
  contacts: AgendaContactRelationRow | null
  opportunities: AgendaOpportunityRelationRow | null
  candidates: AgendaCandidateRelationRow | null
}

type ContactSelectRow = {
  id: string
  job_title: string | null
  persons: AgendaPersonRow | AgendaPersonRow[] | null
}

type CandidateSelectRow = {
  id: string
  status: string
  persons: AgendaPersonRow | AgendaPersonRow[] | null
}

/**
 * Charge les événements agenda sur une plage ISO.
 * Requête chevauchement : starts_at < endRange AND ends_at > startRange.
 * Tâches préparatoires chargées en un second appel batch (0 N+1).
 */
export async function getAgendaEvents(startRange: string, endRange: string): Promise<AgendaEvent[]> {
  const supabase = await createClient()

  const { data: events, error } = await supabase
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
    .lt("starts_at", endRange)
    .gt("ends_at", startRange)
    .order("starts_at", { ascending: true })

  if (error) {
    console.error("getAgendaEvents error:", error)
    return []
  }

  if (!events || events.length === 0) return []

  const eventIds = events.map((e) => e.id)

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, status, calendar_event_id")
    .in("calendar_event_id", eventIds)

  type TaskRow = { id: string; title: string; due_date: string | null; priority: string; status: string; calendar_event_id: string | null }
  const tasksMap = new Map<string, TaskRow>()
  tasks?.forEach((t: TaskRow) => {
    if (t.calendar_event_id) tasksMap.set(t.calendar_event_id, t)
  })

  return (events as AgendaEventRow[]).map((e) => {
    const contactPerson = e.contacts?.persons
      ? Array.isArray(e.contacts.persons)
        ? e.contacts.persons[0]
        : e.contacts.persons
      : null

    const candidatePerson = e.candidates?.persons
      ? Array.isArray(e.candidates.persons)
        ? e.candidates.persons[0]
        : e.candidates.persons
      : null

    return {
      id: e.id,
      title: e.title,
      event_type: e.event_type,
      status: e.status,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      description: e.description || null,
      organizer_id: e.organizer_id,
      company_id: e.company_id,
      company: e.companies ? { id: e.companies.id, name: e.companies.name } : null,
      contact_id: e.contact_id,
      contact: e.contacts
        ? {
            id: e.contacts.id,
            full_name: contactPerson?.full_name || "",
            job_title: e.contacts.job_title,
            email: contactPerson?.primary_email || null,
          }
        : null,
      opportunity_id: e.opportunity_id,
      opportunity: e.opportunities ? { id: e.opportunities.id, title: e.opportunities.title } : null,
      candidate_id: e.candidate_id,
      candidate: e.candidates
        ? { id: e.candidates.id, full_name: candidatePerson?.full_name || "" }
        : null,
      preparatory_task: tasksMap.get(e.id) || null,
    } satisfies AgendaEvent
  })
}

/**
 * Crée un événement + tâche optionnelle via la RPC atomique SECURITY INVOKER.
 */
export async function createAgendaEvent(input: AgendaEventFormInput) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("create_calendar_event", {
    p_title:          input.title,
    p_event_type:     input.event_type,
    p_starts_at:      input.starts_at,
    p_ends_at:        input.ends_at,
    p_description:    input.description || undefined,
    p_all_day:        false,
    p_company_id:     input.company_id || undefined,
    p_contact_id:     input.contact_id || undefined,
    p_opportunity_id: input.opportunity_id || undefined,
    p_candidate_id:   input.candidate_id || undefined,
    p_create_task:    input.create_task,
    p_task_title:     input.task_title || undefined,
    p_task_due_date:  input.task_due_date || undefined,
    p_task_priority:  input.task_priority || "normal",
  })

  if (error) {
    console.error("createAgendaEvent RPC error:", error)
    return { error: error.message }
  }

  revalidatePath("/agenda")
  return { success: true, data }
}

/**
 * Met à jour un événement agenda existant.
 * Gère également la tâche préparatoire (création / mise à jour / suppression).
 */
export async function updateAgendaEvent(input: AgendaEventFormInput) {
  if (!input.id) return { error: "Identifiant d'événement manquant." }

  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from("calendar_events")
    .update({
      title:          input.title,
      event_type:     input.event_type,
      starts_at:      input.starts_at,
      ends_at:        input.ends_at,
      description:    input.description || null,
      company_id:     input.company_id || null,
      contact_id:     input.contact_id || null,
      opportunity_id: input.opportunity_id || null,
      candidate_id:   input.candidate_id || null,
    })
    .eq("id", input.id)

  if (updateError) {
    console.error("updateAgendaEvent error:", updateError)
    return { error: updateError.message }
  }

  // Sync tâche préparatoire
  if (input.create_task && input.task_title.trim()) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("calendar_event_id", input.id)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from("tasks")
        .update({
          title:    input.task_title.trim(),
          due_date: input.task_due_date || null,
          priority: input.task_priority || "normal",
        })
        .eq("id", existing.id)
    } else {
      await supabase.from("tasks").insert({
        calendar_event_id: input.id,
        title:             input.task_title.trim(),
        due_date:          input.task_due_date || null,
        priority:          input.task_priority || "normal",
        status:            "open",
      })
    }
  } else {
    // Supprimer la tâche si décochée
    await supabase.from("tasks").delete().eq("calendar_event_id", input.id)
  }

  revalidatePath("/agenda")
  return { success: true }
}

/**
 * Supprime un événement (les tâches liées sont supprimées en CASCADE par la FK).
 */
export async function deleteAgendaEvent(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("calendar_events").delete().eq("id", id)

  if (error) {
    console.error("deleteAgendaEvent error:", error)
    return { error: error.message }
  }

  revalidatePath("/agenda")
  return { success: true }
}

/**
 * Marque un événement comme complété ou annulé.
 */
export async function setAgendaEventStatus(id: string, status: "completed" | "cancelled") {
  const supabase = await createClient()

  const { error } = await supabase
    .from("calendar_events")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { success: true }
}

// ── Sélecteurs ─────────────────────────────────────────────────────────────────

export async function getContactsByCompany(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("id, job_title, persons ( id, full_name, primary_email )")
    .eq("company_id", companyId)

  if (error) {
    console.error("getContactsByCompany error:", error)
    return []
  }

  return ((data || []) as ContactSelectRow[]).map<AgendaSelectContact>((c) => {
    const person = Array.isArray(c.persons) ? c.persons[0] : c.persons
    return {
      id: c.id,
      full_name: person?.full_name || "",
      job_title: c.job_title || "",
      email: person?.primary_email || null,
    }
  })
}

export async function getOpportunitiesForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, title")
    .order("title", { ascending: true })

  if (error) {
    console.error("getOpportunitiesForSelect error:", error)
    return []
  }
  return (data || []) as AgendaSelectOpportunity[]
}

export async function getCandidatesForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("candidates")
    .select("id, status, persons!inner ( id, full_name )")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getCandidatesForSelect error:", error)
    return []
  }

  return ((data || []) as CandidateSelectRow[])
    .map<AgendaSelectCandidate>((c) => {
      const person = Array.isArray(c.persons) ? c.persons[0] : c.persons
      return {
        id: c.id,
        full_name: person?.full_name || "",
        status: c.status,
      }
    })
    .sort((a: { full_name: string }, b: { full_name: string }) =>
      a.full_name.localeCompare(b.full_name, "fr")
    )
}
