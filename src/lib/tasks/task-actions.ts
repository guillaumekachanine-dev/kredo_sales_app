"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type TaskPriority = "low" | "normal" | "high" | "urgent"

export type CreateTaskInput = {
  title: string
  due_date?: string | null
  priority: TaskPriority
  entity_type: string
  entity_id: string
  linked_entity_type?: string | null
  linked_entity_id?: string | null
}

export type TaskRow = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  completed_at: string | null
}

export async function createTask(
  input: CreateTaskInput
): Promise<{ data: TaskRow | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      title: input.title.trim(),
      due_date: input.due_date || null,
      priority: input.priority,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      linked_entity_type: input.linked_entity_type || null,
      linked_entity_id: input.linked_entity_id || null,
      status: "open",
    } as any)
    .select("id, title, description, due_date, priority, status, completed_at")
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath("/prospection/accounts")
  revalidatePath("/agenda")

  return { data: data as TaskRow, error: null }
}

export async function toggleTaskStatus(
  taskId: string,
  isDone: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      status: isDone ? "done" : "open",
      completed_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", taskId)

  return { error: error?.message ?? null }
}

export type EntityOption = { id: string; label: string }

export async function getEntityOptions(
  entityType: string
): Promise<{ data: EntityOption[]; error: string | null }> {
  const supabase = await createClient()

  if (entityType === "opportunity") {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, title")
      .order("title")
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map((o) => ({ id: o.id, label: o.title })), error: null }
  }

  if (entityType === "mission") {
    const { data, error } = await supabase
      .from("missions")
      .select("id, title")
      .order("title")
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map((m) => ({ id: m.id, label: m.title })), error: null }
  }

  if (entityType === "collaborator") {
    const { data, error } = await supabase
      .from("collaborators")
      .select("id, persons(full_name)")
    if (error) return { data: [], error: error.message }
    return {
      data: (data ?? []).map((c) => {
        const p = Array.isArray(c.persons) ? c.persons[0] : c.persons
        return { id: c.id, label: (p as { full_name: string | null } | null)?.full_name ?? "—" }
      }),
      error: null,
    }
  }

  if (entityType === "candidate") {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, persons(full_name)")
    if (error) return { data: [], error: error.message }
    return {
      data: (data ?? []).map((c) => {
        const p = Array.isArray(c.persons) ? c.persons[0] : c.persons
        return { id: c.id, label: (p as { full_name: string | null } | null)?.full_name ?? "—" }
      }),
      error: null,
    }
  }

  if (entityType === "contact") {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, persons(full_name), companies(name)")
    if (error) return { data: [], error: error.message }
    return {
      data: (data ?? []).map((c) => {
        const p = Array.isArray(c.persons) ? c.persons[0] : c.persons
        const co = Array.isArray(c.companies) ? c.companies[0] : c.companies
        const name = (p as { full_name: string | null } | null)?.full_name ?? "—"
        const company = (co as { name: string } | null)?.name
        return { id: c.id, label: company ? `${name} (${company})` : name }
      }),
      error: null,
    }
  }

  return { data: [], error: "Type d'entité non supporté" }
}
