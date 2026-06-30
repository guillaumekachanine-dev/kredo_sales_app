import type { MissionPlanningTimelineEvent } from "@/components/missions/planning/mission-planning-types"
import type { Json } from "@/types/database"

export type MissionDetailTabId =
  | "synthesis"
  | "collaborator"
  | "planning"
  | "activity"
  | "financial"

export interface MissionDetailTab {
  id: MissionDetailTabId
  label: string
}

export const MISSION_DETAIL_TABS: MissionDetailTab[] = [
  { id: "synthesis", label: "Synthèse" },
  { id: "collaborator", label: "Collaborateur" },
  { id: "planning", label: "Planning" },
  { id: "activity", label: "Taux d'activité" },
  { id: "financial", label: "Financier" },
]

export function isValidTabId(value: string): value is MissionDetailTabId {
  return MISSION_DETAIL_TABS.some((tab) => tab.id === value)
}

// ─── Mission core ─────────────────────────────────────────────────────────────

export interface MissionSummary {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  role_title: string | null
  practice: string | null
  seniority: string | null
  tjm: number
  cjm: number
  gross_margin_pct: number | null
  billing_condition: string | null
  description: string | null
  metadata: Json
  opportunity_id: string | null
  collaborator_id: string
  company_id: string
  external_ref: string | null
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface MissionCompany {
  id: string
  name: string
  description: string | null
  sector: string | null
  segment: string | null
  website: string | null
  employee_count: number | null
  revenue: string | null
  priority: string | null
  hq_location: string | null
  metadata: Json
}

// ─── Collaborator ─────────────────────────────────────────────────────────────

export interface MissionCollaboratorSkill {
  id: string
  level: number | null
  years: number | null
  confidence: number | null
  source: string | null
  skill: {
    id: string
    name: string
    category: string | null
  }
}

export interface MissionCollaboratorPerson {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
}

export interface MissionCollaborator {
  id: string
  practice: string | null
  seniority: string | null
  entry_date: string | null
  exit_date: string | null
  status: string
  current_title: string | null
  employee_ref: string | null
  availability: string | null
  metadata: Json
  person: MissionCollaboratorPerson | null
  skills: MissionCollaboratorSkill[]
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface MissionContact {
  id: string
  fullName: string
  role: string | null
  email: string | null
  phone: string | null
}

// ─── Activity Reports ─────────────────────────────────────────────────────────

export interface MissionActivityReport {
  id: string
  period_start: string
  period_end: string
  status: string
  billable_days: number
  non_billable_days: number
  business_days: number
  pto_days: number
  sick_days: number
  activity_rate_percent: number | null
  tjm_snapshot: number
  cjm_snapshot: number
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export interface MissionInteraction {
  id: string
  type: string
  summary: string | null
  details: Json
  occurred_at: string
  next_action: string | null
}

// ─── Compensation ─────────────────────────────────────────────────────────────

export interface MissionCompensation {
  gross_annual: number | null
  charges_rate: number | null
  working_days_per_year: number | null
  taci: number | null
}

// ─── View-model complet ───────────────────────────────────────────────────────

export interface MissionDetailViewModel {
  mission: MissionSummary
  company: MissionCompany | null
  collaborator: MissionCollaborator | null
  contacts: MissionContact[]
  activityReports: MissionActivityReport[]
  planningEvents: MissionPlanningTimelineEvent[]
  interactions: MissionInteraction[]
  companyContacts: Array<{ id: string; fullName: string; role: string | null }>
  compensation: MissionCompensation | null
}

// ─── Risk helpers ─────────────────────────────────────────────────────────────

export type RiskLevel = "faible" | "modere" | "critique"

export function getRiskFromMetadata(metadata: Json): {
  level: RiskLevel
  description: string
} {
  const meta = (metadata || {}) as Record<string, unknown>
  return {
    level: (meta.risk_level as RiskLevel) || "faible",
    description:
      (meta.risk_description as string) ||
      "Aucun risque identifié sur cette mission.",
  }
}
