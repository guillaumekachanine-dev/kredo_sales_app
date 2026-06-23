"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { AgendaEvent, AgendaEventFormInput } from "./agenda-types"

/**
 * Loads agenda events in a given ISO date range.
 * Optimizes performance by querying preparatory tasks in a batch (0 N+1).
 */
export async function getAgendaEvents(startRange: string, endRange: string): Promise<AgendaEvent[]> {
  const supabase = await createClient()

  // 1. Fetch interactions
  const { data: interactions, error: interactionsError } = await supabase
    .from("interactions")
    .select(`
      id,
      summary,
      occurred_at,
      ends_at,
      type,
      details,
      author_id,
      company_id,
      contact_id,
      opportunity_id,
      companies (
        id,
        name
      ),
      contacts (
        id,
        job_title,
        persons (
          id,
          full_name,
          primary_email
        )
      ),
      opportunities (
        id,
        title
      )
    `)
    .gte("occurred_at", startRange)
    .lte("occurred_at", endRange)
    .order("occurred_at", { ascending: true })

  if (interactionsError) {
    console.error("Error loading interactions:", interactionsError)
    return []
  }

  if (!interactions || interactions.length === 0) {
    return []
  }

  const interactionIds = interactions.map((i) => i.id)

  // 2. Fetch associated tasks in one batch query
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, status, entity_id")
    .eq("entity_type", "interaction")
    .in("entity_id", interactionIds)

  if (tasksError) {
    console.error("Error loading preparatory tasks:", tasksError)
  }

  const tasksMap = new Map<string, any>()
  if (tasks) {
    tasks.forEach((t) => {
      if (t.entity_id) {
        tasksMap.set(t.entity_id, t)
      }
    })
  }

  // 3. Format and clean return list
  return interactions.map((i: any) => {
    const contactPerson = i.contacts?.persons
      ? (Array.isArray(i.contacts.persons) ? i.contacts.persons[0] : i.contacts.persons)
      : null

    // Fallback: 1 hour duration if ends_at is not defined
    const endsAt = i.ends_at || new Date(new Date(i.occurred_at).getTime() + 60 * 60 * 1000).toISOString()

    return {
      id: i.id,
      summary: i.summary || i.type || "Événement sans titre",
      occurred_at: i.occurred_at,
      ends_at: endsAt,
      type: i.type,
      details: i.details && typeof i.details === "object" ? i.details : {},
      author_id: i.author_id,
      company_id: i.company_id,
      company: i.companies ? { id: i.companies.id, name: i.companies.name } : null,
      contact_id: i.contact_id,
      contact: i.contacts
        ? {
            id: i.contacts.id,
            full_name: contactPerson?.full_name || "",
            job_title: i.contacts.job_title,
            email: contactPerson?.primary_email || null,
          }
        : null,
      opportunity_id: i.opportunity_id,
      opportunity: i.opportunities ? { id: i.opportunities.id, title: i.opportunities.title } : null,
      preparatory_task: tasksMap.get(i.id) || null,
    }
  })
}

/**
 * Creates an agenda event and its optional preparatory task atomically.
 */
export async function createAgendaEvent(input: AgendaEventFormInput) {
  const supabase = await createClient()

  // Make sure details is properly structured
  const detailsJson = { body: input.details || "" }

  const { data, error } = await supabase.rpc("create_agenda_event", {
    p_summary: input.summary,
    p_occurred_at: input.occurred_at,
    p_ends_at: input.ends_at,
    p_type: input.type,
    p_company_id: (input.company_id || null) as any,
    p_contact_id: (input.contact_id || null) as any,
    p_opportunity_id: (input.opportunity_id || null) as any,
    p_details: detailsJson,
    p_create_task: input.create_task,
    p_task_title: input.task_title || "",
    p_task_due_date: (input.task_due_date || null) as any,
    p_task_priority: input.task_priority || "normale",
  })

  if (error) {
    console.error("Error creating agenda event via RPC:", error)
    return { error: error.message }
  }

  revalidatePath("/agenda")
  return { success: true, data }
}

/**
 * Updates an agenda event and inserts, updates or deletes its preparatory task atomically.
 */
export async function updateAgendaEvent(input: AgendaEventFormInput) {
  if (!input.id) {
    return { error: "Identifiant d'événement manquant." }
  }

  const supabase = await createClient()
  const detailsJson = { body: input.details || "" }

  const { data, error } = await supabase.rpc("update_agenda_event", {
    p_interaction_id: input.id,
    p_summary: input.summary,
    p_occurred_at: input.occurred_at,
    p_ends_at: input.ends_at,
    p_type: input.type,
    p_company_id: (input.company_id || null) as any,
    p_contact_id: (input.contact_id || null) as any,
    p_opportunity_id: (input.opportunity_id || null) as any,
    p_details: detailsJson,
    p_create_task: input.create_task,
    p_task_title: input.task_title || "",
    p_task_due_date: (input.task_due_date || null) as any,
    p_task_priority: input.task_priority || "normale",
  })

  if (error) {
    console.error("Error updating agenda event via RPC:", error)
    return { error: error.message }
  }

  revalidatePath("/agenda")
  return { success: true, data }
}

/**
 * Deletes an agenda event and its associated tasks.
 */
export async function deleteAgendaEvent(id: string) {
  const supabase = await createClient()

  // First delete any preparatory tasks
  const { error: taskError } = await supabase
    .from("tasks")
    .delete()
    .eq("entity_type", "interaction")
    .eq("entity_id", id)

  if (taskError) {
    console.error("Error deleting preparatory tasks:", taskError)
  }

  // Then delete the interaction
  const { error: interactionError } = await supabase
    .from("interactions")
    .delete()
    .eq("id", id)

  if (interactionError) {
    console.error("Error deleting interaction:", interactionError)
    return { error: interactionError.message }
  }

  revalidatePath("/agenda")
  return { success: true }
}

/**
 * Loads all contacts for a specific company.
 */
export async function getContactsByCompany(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id,
      job_title,
      persons (
        id,
        full_name,
        primary_email
      )
    `)
    .eq("company_id", companyId)

  if (error) {
    console.error("Error loading contacts for company:", error)
    return []
  }

  return (data || []).map((c: any) => {
    const person = Array.isArray(c.persons) ? c.persons[0] : c.persons
    return {
      id: c.id,
      full_name: person?.full_name || "",
      job_title: c.job_title || "",
      email: person?.primary_email || null,
    }
  })
}

/**
 * Loads opportunities for selection lists.
 */
export async function getOpportunitiesForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, title")
    .order("title", { ascending: true })

  if (error) {
    console.error("Error loading opportunities:", error)
    return []
  }
  return data || []
}
