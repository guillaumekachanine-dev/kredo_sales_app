import type { AgendaQuery } from "./agenda-types"

export const AGENDA_V1_TIMEZONE = "Europe/Paris"

export const AGENDA_V1_LIMITS: AgendaQuery["limits"] = {
  maxWindowDays: 62,
  maxRowsCalendarEvents: 300,
  maxRowsPerOtherSource: 200,
  maxOverdueTasks: 50,
  overdueTaskLookbackDays: 30,
  sourceTimeoutMs: 3000,
  maxParallelQueries: 4,
}

export const AGENDA_V1_INCLUDE: AgendaQuery["include"] = {
  scheduledEvents: true,
  tasks: true,
  missionBoundaries: true,
  opportunityDeadlines: true,
  recruitmentMilestones: true,
  absences: true,
  clientClosures: true,
  derivedAlerts: true,
}

export const AGENDA_V1_THRESHOLDS = {
  imminentTaskHours: 48,
  imminentOpportunityNextActionHours: 72,
  imminentMissionEndDays: 7,
  imminentOpportunityTargetCloseDays: 7,
  imminentRecruitmentMilestoneHours: 72,
  denseDayVisibleItems: 8,
  denseDayActionableItems: 5,
  weekTensionOverdueTasks: 3,
  weekTensionConflicts: 2,
  weekTensionDenseDays: 2,
  weekTensionImminentDeadlines: 4,
  overdueDeadlineRetentionDays: 14,
  overdueOpportunityCloseRetentionDays: 14,
} as const

export type AgendaThresholds = typeof AGENDA_V1_THRESHOLDS
