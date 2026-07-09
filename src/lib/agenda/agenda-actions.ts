"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import type {
  AgendaEvent,
  AgendaContextOption,
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
  metadata: Json | null
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
      metadata,
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
      metadata: e.metadata || null,
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
    p_metadata:       input.metadata || undefined,
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
      metadata:       input.metadata || {},
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

export async function getAgendaContextOptions(
  kind: string,
  companyId?: string | null,
): Promise<AgendaContextOption[]> {
  const supabase = await createClient()

  if (kind === "opportunity") {
    let query = supabase
      .from("opportunities")
      .select("id, title")
      .order("title", { ascending: true })
      .limit(50)

    if (companyId) query = query.eq("company_id", companyId)

    const { data, error } = await query
    if (error) {
      console.error("getAgendaContextOptions opportunities error:", error)
      return []
    }

    return (data || []).map((row: { id: string; title: string }) => ({
      id: row.id,
      label: row.title,
    }))
  }

  if (kind === "signal") {
    if (!companyId) return []

    const { data, error } = await supabase
      .from("account_signals")
      .select("id, title, signal_category")
      .eq("company_id", companyId)
      .order("detected_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("getAgendaContextOptions signals error:", error)
      return []
    }

    return (data || []).map((row: { id: string; title: string; signal_category: string | null }) => ({
      id: row.id,
      label: row.title,
      description: row.signal_category,
    }))
  }

  if (kind === "contract") {
    let query = supabase
      .from("missions")
      .select("id, title, status")
      .order("updated_at", { ascending: false })
      .limit(50)

    if (companyId) query = query.eq("company_id", companyId)

    const { data, error } = await query
    if (error) {
      console.error("getAgendaContextOptions contracts error:", error)
      return []
    }

    return (data || []).map((row: { id: string; title: string; status: string | null }) => ({
      id: row.id,
      label: row.title,
      description: row.status,
    }))
  }

  if (kind === "mail" || kind === "campaign") {
    let query = supabase
      .from("intelligence_documents")
      .select("id, title, status")
      .eq("document_type", kind === "mail" ? "communication" : "campaign")
      .order("updated_at", { ascending: false })
      .limit(50)

    if (companyId) {
      query = query
        .eq("primary_entity_type", "company")
        .eq("primary_entity_id", companyId)
    }

    const { data, error } = await query
    if (error) {
      console.error("getAgendaContextOptions documents error:", error)
      return []
    }

    return (data || []).map((row: { id: string; title: string; status: string | null }) => ({
      id: row.id,
      label: row.title,
      description: row.status,
    }))
  }

  if (kind === "offer") {
    const { data, error } = await supabase
      .from("offers")
      .select("id, name, short_description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(50)

    if (error) {
      console.error("getAgendaContextOptions offers error:", error)
      return []
    }

    return (data || []).map((row: { id: string; name: string; short_description: string | null }) => ({
      id: row.id,
      label: row.name,
      description: row.short_description,
    }))
  }

  return []
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

export interface CreateTaskFromAgendaInput {
  title: string
  description?: string
  due_date: string | null
  priority: "low" | "normal" | "high" | "urgent"
  assignee_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  linked_entity_type?: string | null
  linked_entity_id?: string | null
  calendar_event_id?: string | null
  bypassDuplicateCheck?: boolean
}

async function verifySourceAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  entityType?: string | null,
  entityId?: string | null,
  calendarEventId?: string | null
): Promise<boolean> {
  if (calendarEventId) {
    const { data } = await supabase
      .from("calendar_events")
      .select("id, workspace_id")
      .eq("id", calendarEventId)
      .single()
    if (!data || data.workspace_id !== workspaceId) return false
  }

  if (!entityType || !entityId) return true

  let table = ""
  switch (entityType) {
    case "opportunity":
      table = "opportunities"
      break
    case "mission":
      table = "missions"
      break
    case "company":
      table = "companies"
      break
    case "candidate":
      table = "candidates"
      break
    case "candidate_hiring_milestone":
      table = "candidate_hiring_milestones"
      break
    case "collaborator":
    case "profile":
      table = "profiles"
      break
    default:
      return true
  }

  const { data } = await supabase
    .from(table)
    .select("id, workspace_id")
    .eq("id", entityId)
    .single()

  if (!data || data.workspace_id !== workspaceId) return false
  return true
}

export async function completeAgendaTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return { error: "Pas de profil de workspace" }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, workspace_id")
    .eq("id", taskId)
    .single()

  if (fetchError || !task) return { error: "Tâche introuvable" }
  if (task.workspace_id !== profile.workspace_id) return { error: "Accès refusé" }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", taskId)

  if (updateError) return { error: updateError.message }

  revalidatePath("/agenda")
  return { success: true }
}

export async function reopenAgendaTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return { error: "Pas de profil de workspace" }

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, workspace_id")
    .eq("id", taskId)
    .single()

  if (fetchError || !task) return { error: "Tâche introuvable" }
  if (task.workspace_id !== profile.workspace_id) return { error: "Accès refusé" }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: "open",
      completed_at: null
    })
    .eq("id", taskId)

  if (updateError) return { error: updateError.message }

  revalidatePath("/agenda")
  return { success: true }
}

export async function getWorkspaceMembers() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return []

  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("workspace_id", profile.workspace_id)
    .order("full_name", { ascending: true })

  if (error) {
    console.error("getWorkspaceMembers error:", error)
    return []
  }

  return members || []
}

export async function createTaskFromAgendaItem(input: CreateTaskFromAgendaInput) {
  if (!input.title || !input.title.trim()) {
    return { error: "Le titre de la tâche est obligatoire." }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return { error: "Pas de profil de workspace" }

  // 1. Verify access to source object
  const hasAccess = await verifySourceAccess(
    supabase,
    profile.workspace_id,
    input.entity_type,
    input.entity_id,
    input.calendar_event_id
  )
  if (!hasAccess) return { error: "Accès refusé à l'objet source." }

  // 2. Check for duplicate open tasks
  if (!input.bypassDuplicateCheck) {
    let query = supabase
      .from("tasks")
      .select("id")
      .eq("workspace_id", profile.workspace_id)
      .is("completed_at", null)
      .neq("status", "completed")

    let hasCriteria = false
    if (input.entity_type && input.entity_id) {
      query = query.eq("entity_type", input.entity_type).eq("entity_id", input.entity_id)
      hasCriteria = true
    } else if (input.linked_entity_type && input.linked_entity_id) {
      query = query.eq("linked_entity_type", input.linked_entity_type).eq("linked_entity_id", input.linked_entity_id)
      hasCriteria = true
    } else if (input.calendar_event_id) {
      query = query.eq("calendar_event_id", input.calendar_event_id)
      hasCriteria = true
    }

    if (hasCriteria) {
      const { data: duplicates } = await query.limit(1)
      if (duplicates && duplicates.length > 0) {
        return {
          warning: "DUPLICATE_EXISTS",
          message: "Une tâche ouverte existe déjà pour cet objet source. Voulez-vous tout de même forcer la création ?"
        }
      }
    }
  }

  // 3. Insert task
  const { data, error: insertError } = await supabase
    .from("tasks")
    .insert({
      workspace_id: profile.workspace_id,
      title: input.title.trim(),
      description: input.description || null,
      due_date: input.due_date,
      priority: input.priority || "normal",
      status: "open",
      assignee_id: input.assignee_id || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      linked_entity_type: input.linked_entity_type || null,
      linked_entity_id: input.linked_entity_id || null,
      calendar_event_id: input.calendar_event_id || null,
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("createTaskFromAgendaItem error:", insertError)
    return { error: insertError.message }
  }

  revalidatePath("/agenda")
  return { success: true, taskId: data.id }
}
