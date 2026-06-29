import type { Json } from "./database"
import type {
  StaffingDrawerCandidate,
  StaffingDrawerHiringProcess,
} from "./staffing-drawer"

export interface AssistanceCaseSkillRequirement {
  id: string
  importance: "indispensable" | "souhaitee" | "bonus"
  min_level: number | null
  min_years: number | null
  weight: number
  comment: string | null
  skill: {
    id: string
    name: string
    category: string | null
  }
}

export interface AssistanceCasePositioning {
  id: string
  status: string
  comment: string | null
  client_feedback: string | null
  next_action: string | null
  positioning_origin: string | null
  proposed_at: string | null
  sent_to_client_at: string | null
  status_changed_at: string | null
  created_at: string
  updated_at: string
  candidate: StaffingDrawerCandidate
}

export interface AssistanceCaseOpportunity {
  id: string
  title: string
  stage: string
  priority: string
  conviction: number
  opportunity_type: string | null
  requires_staffing: boolean | null
  need_summary: string | null
  context: Json
  seniority: string | null
  location: string | null
  remote_policy: string | null
  practice: string | null
  target_daily_rate: number | null
  target_margin_pct: number | null
  duration_days: number | null
  estimated_gain: number | null
  acv: number | null
  opened_at: string | null
  start_date: string | null
  target_close_date: string | null
  next_action_label: string | null
  next_action_at: string | null
  required_headcount: number
  company: {
    id: string
    name: string
    website: string | null
    metadata: Json | null
  } | null
  opportunity_skills: AssistanceCaseSkillRequirement[]
  opportunity_candidates: AssistanceCasePositioning[]
}

export interface AssistanceCaseEvent {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string | null
  description: string | null
  candidate_id: string | null
  opportunity_candidate_id: string | null
  metadata: Json | null
  organizer_id: string | null
}

export function getPositioningHiringProcesses(
  positioning: AssistanceCasePositioning,
): StaffingDrawerHiringProcess[] {
  return (positioning.candidate.candidate_hiring_processes ?? []).filter(
    (process) => process.opportunity_candidate_id === positioning.id,
  )
}
