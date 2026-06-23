export interface AgendaEvent {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string
  description: string | null
  organizer_id: string | null
  company_id: string | null
  company?: { id: string; name: string } | null
  contact_id: string | null
  contact?: {
    id: string
    full_name: string
    job_title: string | null
    email: string | null
  } | null
  opportunity_id: string | null
  opportunity?: { id: string; title: string } | null
  candidate_id: string | null
  candidate?: { id: string; full_name: string } | null
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
  title: string
  event_type: string
  starts_at: string
  ends_at: string
  description: string
  company_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  candidate_id: string | null
  create_task: boolean
  task_title: string
  task_due_date: string
  task_priority: string
}
