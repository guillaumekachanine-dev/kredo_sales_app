import type { Database } from "@/types/database.generated"

export type DBInteraction = Database["public"]["Tables"]["interactions"]["Row"]
export type DBTask = Database["public"]["Tables"]["tasks"]["Row"]

export interface AgendaEvent {
  id: string
  summary: string
  occurred_at: string
  ends_at: string
  type: string
  details: {
    body?: string
    [key: string]: any
  }
  company_id: string | null
  company?: {
    id: string
    name: string
  } | null
  contact_id: string | null
  contact?: {
    id: string
    full_name: string
    job_title: string | null
    email: string | null
  } | null
  opportunity_id: string | null
  opportunity?: {
    id: string
    title: string
  } | null
  author_id: string | null
  preparatory_task?: {
    id: string
    title: string
    due_date: string | null
    priority: string
    status: string
  } | null
}

export interface AgendaEventFormInput {
  id?: string
  summary: string
  occurred_at: string
  ends_at: string
  type: string
  details: string
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  create_task: boolean
  task_title: string
  task_due_date: string
  task_priority: string
}
