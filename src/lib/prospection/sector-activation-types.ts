import type {
  DataOrigin,
  ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"
import type { PracticeKey, SectorStatus } from "@/types/sector"

export type SectorActivationSourceType = "event" | "news" | "regulation"
export type SectorActivationTemporalStatus = "close" | "active" | "future" | "expired" | "undated"
export type SectorActivationFreshnessBand = "hot" | "fresh" | "stale" | "future" | "undated"
export type SectorActivationPriorityBand = "critical" | "high" | "medium" | "low"
export type SectorActivationStatusFilter = "open" | "all"
export type SectorActivationState = "to_activate" | "to_cover" | "to_monitor" | "data_insufficient"

export const SECTOR_ACTIVATION_PRACTICE_LABELS: Record<PracticeKey, string> = {
  data_ai: "Data & AI",
  cloud_eng: "Cloud Eng",
  product: "Product",
  cyber: "Cyber",
}

export const SECTOR_ACTIVATION_SOURCE_LABELS: Record<SectorActivationSourceType, string> = {
  event: "Événement",
  news: "Actualité",
  regulation: "Réglementation",
}

export interface SectorActivationWindow {
  id: string
  sourceType: SectorActivationSourceType
  sourceId: string
  sourceLabel: string
  sourceUrl: string | null
  dataOrigin: DataOrigin
  sectorId: string
  sectorSlug: string
  sectorName: string
  title: string
  subtitle: string
  practiceKey: PracticeKey
  practiceLabel: string
  detectedAt: string | null
  deadlineAt: string | null
  temporalStatus: SectorActivationTemporalStatus
  freshnessBand: SectorActivationFreshnessBand
  urgencyScore: number
  priorityBand: SectorActivationPriorityBand
  isOpenNow: boolean
  exposedAccountIds: string[]
  exposedAccountCount: number
  averagePotentialScore: number | null
  averageReachScore: number | null
  coverageGap: number | null
  suggestedAction: string
  playbookSummary: string
  sectorAttractivenessScore: number | null
}

export interface SectorActivationSector {
  id: string
  slug: string
  name: string
  status: SectorStatus
  attractivenessScore: number | null
  digitalMaturity: "low" | "medium" | "high" | null
  topPracticeKey: PracticeKey
  topPracticeLabel: string
  practiceScores: Record<PracticeKey, number>
  linkedAccountIds: string[]
  linkedAccountCount: number
  coveredAccountCount: number
  averagePotentialScore: number | null
  averageReachScore: number | null
  coverageGap: number | null
  dataCoverageRatio: number
  openWindowCount: number
  futureWindowCount: number
  undatedWindowCount: number
  expiredWindowCount: number
  activationState: SectorActivationState
  updatedAt: string | null
  painPoints?: any[]
  description?: string | null

  marketSizeEurBn?: number | null
  marketGrowthPct?: number | null
  keyPlayersPaca?: any[]
  keyPlayersNational?: any[]
  avgTjmMin?: number | null
  avgTjmMax?: number | null
  caveats?: any
  playbook?: any
}


export interface SectorActivationStudy {
  slug: string
  name: string
  status: SectorStatus
  attractivenessScore: number | null
  linkedAccountCount: number
  openWindowCount: number
  updatedAt: string | null
}

/**
 * Secteur présent en base mais dont l'étude n'a pas encore été produite
 * (status 'watch' ou 'development') : des comptes y sont rattachés, mais il n'a
 * ni pain point, ni calendrier réglementaire, ni playbook exploitable.
 * `linkedAccountCount` sert à prioriser la prochaine étude à lancer.
 */
export interface SectorPreparationStudy {
  slug: string
  name: string
  linkedAccountCount: number
}

export interface SectorActivationKpi {
  openWindowCount: number
  closeWindowCount: number
  exposedAccountCount: number
  linkedSectorAccounts: number
  totalAccounts: number
}

export interface SectorActivationFilterOptions {
  sectors: Array<{ value: string; label: string }>
  practices: Array<{ value: PracticeKey; label: string }>
  sourceTypes: Array<{ value: SectorActivationSourceType; label: string }>
  priorityBands: Array<{ value: SectorActivationPriorityBand; label: string }>
  temporalStatuses: Array<{ value: SectorActivationTemporalStatus; label: string }>
  statusFilters: Array<{ value: SectorActivationStatusFilter; label: string }>
}

export interface SectorActivationReadyData {
  state: "ready"
  generatedAt: string
  lastUpdatedAt: string | null
  windows: SectorActivationWindow[]
  sectors: SectorActivationSector[]
  accounts: ProspectionPortfolioAccount[]
  studies: {
    available: SectorActivationStudy[]
    preparing: SectorPreparationStudy[]
  }
  filterOptions: SectorActivationFilterOptions
}

export interface SectorActivationErrorData {
  state: "error"
  title: string
  message: string
}

export type SectorActivationData = SectorActivationReadyData | SectorActivationErrorData
