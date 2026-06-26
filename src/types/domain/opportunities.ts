import type { Database } from "../database.generated"
import type { SalesStage as OpportunitySalesStage } from "@/lib/opportunities/stages"

type PublicSchema = Database["public"]

export type Opportunity = PublicSchema["Tables"]["opportunities"]["Row"] & {
  account_id?: string | null
  duration?: number | null
  need_detail?: string | null
  client_context?: string | null
  engagement_notes?: string | null
  outcome?: SalesOutcome | null
  diffusion_date?: string | null
  decision_date?: string | null
  searched_profile?: string | null
  rythme?: string | null
  budget?: number | null
}

export type OpportunityInsert = PublicSchema["Tables"]["opportunities"]["Insert"]
export type OpportunityUpdate = PublicSchema["Tables"]["opportunities"]["Update"]

export type Account = PublicSchema["Tables"]["companies"]["Row"]

export type Mission = PublicSchema["Tables"]["missions"]["Row"]
export type MissionInsert = PublicSchema["Tables"]["missions"]["Insert"]
export type MissionUpdate = PublicSchema["Tables"]["missions"]["Update"]

export type Contact = {
  id: string
  account_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  notes: string | null
  created_at: string
}

export type OpportunitySkill = {
  id: string
  opportunity_id: string
  skill_name: string
  importance: SkillImportance
  min_years: number | null
  created_at: string
}

export type OpportunityEvent = {
  id: string
  opportunity_id: string
  event_type: string
  body: string | null
  occurred_at: string
}

export type OpportunityStandingProfile = {
  id: string
  candidate_id: string
  full_name: string
  currentTitle: string | null
  seniority: string | null
  availability: string | null
  mobility: string | null
  expected_daily_rate: number | null
  summary: string | null
  internal_score: number | null
  source: string | null
  candidate_status: string
  opportunity_status: string
  proposed_at: string | null
  sent_to_client_at: string | null
  comment: string | null
  next_action: string | null
  origin: "pressenti" | "ia"
}

export type SalesStage = OpportunitySalesStage

export type SalesOutcome = "gagnee" | "perdue" | "abandonnee" | "non_traitee"
export type SalesPriority = "haute" | "moyenne" | "basse"
export type ContactRole = "sponsor" | "decideur" | "manager_operationnel" | "acheteur" | "rh" | "contact_technique" | "validateur_final"
export type SkillImportance = "indispensable" | "souhaitee" | "bonus"
