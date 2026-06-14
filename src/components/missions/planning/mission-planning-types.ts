import type { Json } from "@/types/database"

export type MissionTemporalStatus =
  | "active"
  | "ending_soon"
  | "future"
  | "expired"
  | "ongoing_open_end"

export type MissionPlanningPerson = {
  id: string | null
  fullName: string | null
  firstName: string | null
  lastName: string | null
}

export type MissionPlanningCompany = {
  id: string | null
  name: string
  sector: string | null
  hqLocation: string | null
}

export type MissionPlanningCollaborator = {
  id: string | null
  employeeRef: string | null
  currentTitle: string | null
  practice: string | null
  seniority: string | null
  availability: string | null
  person: MissionPlanningPerson | null
}

export type MissionPlanningQuarterlyRevenue = {
  quarterLabel: string | null
  quarterStart: string | null
  revenue: number | null
  grossMargin: number | null
  grossMarginPct: number | null
  billableDays: number | null
}

export type MissionPlanningRow = {
  id: string
  title: string
  status: string
  startDate: string | null
  endDate: string | null
  renewalDate: string | null
  roleTitle: string | null
  practice: string | null
  seniority: string | null
  tjm: number | null
  cjm: number | null
  grossMarginPct: number | null
  companyId: string | null
  collaboratorId: string | null
  metadata: Json
  company: MissionPlanningCompany
  collaborator: MissionPlanningCollaborator | null
  lastQuarterRevenue: MissionPlanningQuarterlyRevenue | null
}
