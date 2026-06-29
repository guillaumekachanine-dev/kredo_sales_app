export interface CandidateReferencePractice {
  id: string
  name: string
  slug: string
  color_hex: string | null
}

export interface CandidateReferenceSkill {
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

export interface CandidateReferencePerson {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  primary_email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  notes: string | null
  person_skills: CandidateReferenceSkill[]
}

export interface CandidateReferenceProfileData {
  id: string
  status: string
  source: string | null
  current_title: string | null
  seniority: string | null
  practice_id: string | null
  practice?: CandidateReferencePractice | null
  experience_years: number | null
  highest_degree_level: string | null
  sector_context: string | null
  last_mission_title: string | null
  last_mission_contribution: string | null
  search_reason: string | null
  expected_daily_rate: number | null
  expected_salary: number | null
  last_salary: number | null
  available_from: string | null
  notice_period_days: number | null
  availability_notes: string | null
  availability: string | null
  mobility: string | null
  has_vehicle: boolean | null
  desired_workload_pct: number | null
  max_commute_minutes: number | null
  remote_preference: string | null
  remote_days_per_week: number | null
  active_offer_status: string | null
  active_offer_deadline: string | null
  active_offer_notes: string | null
  constraints_notes: string | null
  summary: string | null
  notes: string | null
  person: CandidateReferencePerson | null
}
