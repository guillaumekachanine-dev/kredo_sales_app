import type {
  WeeklyManagerContent,
  WeeklyManagerPriorityItem,
} from "@/app/(app)/reports/_data/reports-types"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

export type CockpitPriorityItem = WeeklyManagerPriorityItem

export interface CockpitTodayEvent {
  id: string
  title: string
  eventType: string
  startsAt: string
  endsAt: string
  allDay: boolean
  companyId: string | null
  companyName: string | null
  href: string
}

export interface CockpitMeetingItem extends CockpitTodayEvent {
  location: string | null
  meetingUrl: string | null
  contactId: string | null
  contactName: string | null
  opportunityId: string | null
  opportunityTitle: string | null
}

export type CockpitOpportunityCoverageStatus =
  | "not_required"
  | "uncovered"
  | "partial"
  | "covered"

export interface CockpitOpportunityItem {
  id: string
  title: string
  stage: string
  companyId: string | null
  companyName: string | null
  nextActionLabel: string | null
  nextActionAt: string | null
  targetCloseDate: string | null
  requiredHeadcount: number
  positioningCount: number
  coveringPositioningCount: number
  coverageStatus: CockpitOpportunityCoverageStatus
  href: string
}

export interface CockpitSignalItem {
  id: string
  source: "account_signal" | "veille_article"
  title: string
  summary: string | null
  globalScore: number | null
  lastEvidenceAt: string
  expiresAt: string | null
  isStrong: boolean
  recommendedAction: string | null
  companyId: string | null
  companyName: string | null
  href: string
  sourceUrl: string | null
}

export interface CockpitMobileSnapshot {
  generatedAt: string

  header: {
    todayEvents: CockpitTodayEvent[]
    urgencies: CockpitPriorityItem[]
    todayEventCount: number
    urgencyCount: number
  }

  priorities: {
    items: CockpitPriorityItem[]
    criticalCount: number
    totalCount: number
  }

  meetings: {
    items: CockpitMeetingItem[]
    weekCount: number
    nextMeetingLabel: string | null
  }

  opportunities: {
    items: CockpitOpportunityItem[]
    overdueNextStepCount: number
    dueThisWeekCount: number
  }

  weeklyBrief: WeeklyManagerContent | null
  diagnostic: WorkspaceDiagnosticSnapshot | null

  signals: {
    items: CockpitSignalItem[]
    strongCount: number
    totalAvailableCount: number
  }
}
