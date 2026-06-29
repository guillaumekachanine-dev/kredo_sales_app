import type { Json } from "./database"
import type { CandidateReferenceProfileData } from "./candidate-reference-profile"

export interface StaffingDrawerSkill {
  id: string
  level: number | null
  years: number | null
  last_used_year: number | null
  confidence: number | null
  source: string | null
  comment: string | null
  profile_rank: number | null
  skill: {
    id: string
    name: string
    category: string | null
  }
}

export interface StaffingDrawerCompensation {
  gross_annual: number
  effective_to: string | null
}

export interface StaffingDrawerMission {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  tjm: number
  cjm: number
  gross_margin_pct: number | null
  company: { name: string } | null
}

export interface StaffingDrawerCollaborator {
  id: string
  status: string
  current_title: string | null
  entry_date: string | null
  practice: string | null
  seniority: string | null
  compensation: StaffingDrawerCompensation[]
  missions: StaffingDrawerMission[]
}

export interface StaffingDrawerPerson {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  primary_email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  notes: string | null
  person_skills: StaffingDrawerSkill[]
  collaborators: StaffingDrawerCollaborator[]
}

export interface StaffingDrawerHiringMilestone {
  id: string
  step: string
  result: string
  scheduled_at: string | null
  completed_at: string | null
  calendar_event_id?: string | null
  notes: string | null
}

export interface StaffingDrawerHiringProcess {
  id: string
  status: string
  current_step: string
  started_at: string
  closed_at: string | null
  close_reason: string | null
  opportunity_candidate_id: string | null
  job_profile: { id: string; title: string } | null
  candidate_hiring_milestones: StaffingDrawerHiringMilestone[]
}

export interface StaffingDrawerCandidate
  extends Omit<CandidateReferenceProfileData, "person"> {
  person: StaffingDrawerPerson | null
  candidate_hiring_processes?: StaffingDrawerHiringProcess[]
}

export interface StaffingDrawerOpportunity {
  id: string
  title: string
  stage: string
  priority: string
  opportunity_type: string | null
  requires_staffing: boolean | null
  start_date: string | null
  target_daily_rate: number | null
  context: Json
  company: {
    id: string
    name: string
    website: string | null
    metadata: Json | null
  } | null
}

export interface StaffingDrawerViewModel {
  id: string
  status: string
  comment: string | null
  next_action: string | null
  positioning_origin: string | null
  proposed_at: string | null
  sent_to_client_at: string | null
  status_changed_at: string | null
  created_at: string
  updated_at: string
  opportunity: StaffingDrawerOpportunity
  candidate: StaffingDrawerCandidate
}
