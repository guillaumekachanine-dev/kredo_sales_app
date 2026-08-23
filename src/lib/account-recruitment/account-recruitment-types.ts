import type { SkillImportance } from "@/lib/staffing-matching/types"

export type TechnicalConfidence = "Forte" | "Moyenne" | "Faible"
export type TechnicalSourceKind = "Observé" | "Déduit"

export interface IdentifiedNeedSkillItem {
  skillId: string
  skillName: string
  importance: SkillImportance
  minLevel?: number | null
  minYears?: number | null
}

export interface IdentifiedNeedItem {
  id: string
  title: string
  stage: string | null
  practice: string | null
  seniority: string | null
  needSummary: string | null
  skills: IdentifiedNeedSkillItem[]
  createdAt: string
}

export interface EstimatedTechItem {
  id: string
  name: string
  category: string
  sourceKind: TechnicalSourceKind
  confidence: TechnicalConfidence
  provenance: string
}

export interface KredoAdequacyItem {
  id: string
  title: string
  kind: "practice" | "offer" | "profile"
  description: string | null
  confidence: TechnicalConfidence
  provenance: string
}

export interface AccountRecruitmentAnalysis {
  companyId: string
  companyName: string
  identifiedNeeds: IdentifiedNeedItem[]
  estimatedTechEnvironment: EstimatedTechItem[]
  kredoAdequacy: KredoAdequacyItem[]
}

export interface CompanyOpportunityItem {
  id: string
  title: string
  companyId: string
  companyName: string
  practice: string | null
  seniority: string | null
  stage: string | null
  isCurrentAccount: boolean
}
