export type CandidateSkillDraft = {
  client_key: string
  skill_id: string | null
  name: string
  category: string | null
  level: number | null
  years: number | null
  last_used_year: number | null
  source: string | null
  confidence: number | null
  comment: string | null
  profile_rank: number | null
}

export type CandidateProfileFormValues = {
  first_name: string
  last_name: string
  primary_email: string
  phone: string
  linkedin_url: string
  location: string
  person_notes: string
  status: string
  current_title: string
  seniority: string
  source: string
  practice_id: string
  experience_years: number | null
  highest_degree_level: string
  sector_context: string
  last_mission_title: string
  last_mission_contribution: string
  search_reason: string
  expected_daily_rate: number | null
  expected_salary: number | null
  last_salary: number | null
  available_from: string
  notice_period_days: number | null
  availability_notes: string
  mobility: string
  has_vehicle: boolean | null
  desired_workload_pct: number | null
  max_commute_minutes: number | null
  remote_preference: string
  remote_days_per_week: number | null
  active_offer_status: string
  active_offer_deadline: string
  active_offer_notes: string
  constraints_notes: string
  notes: string
  skills: CandidateSkillDraft[]
}

export type CandidatePracticeOption = {
  id: string
  name: string
}

export type CandidateSkillOption = {
  id: string
  name: string
  category: string | null
}
