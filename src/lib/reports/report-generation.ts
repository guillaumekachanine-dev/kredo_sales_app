export type ReportGenerationKind =
  | "activity_commercial"
  | "activity_recruitment"
  | "financial"
  | "weekly_manager"

export type ReportGenerationAvailability = "ready" | "planned"

export interface ReportGenerationOption {
  reportType: ReportGenerationKind
  title: string
  description: string
  badge: string
  availability: ReportGenerationAvailability
}

export const REPORT_GENERATION_OPTIONS: ReportGenerationOption[] = [
  {
    reportType: "activity_commercial",
    title: "Rapport d'activité commerciale",
    description: "Synthèse des actions commerciales, des mouvements du pipe et des priorités de la période.",
    badge: "Commercial",
    availability: "ready",
  },
  {
    reportType: "activity_recruitment",
    title: "Rapport d'activité recrutement",
    description: "Synthèse du funnel recrutement et du positionnement candidats sur besoins.",
    badge: "Recrutement",
    availability: "ready",
  },
  {
    reportType: "financial",
    title: "Rapport financier",
    description: "Lecture structurée des indicateurs financiers, des écarts et des points de vigilance.",
    badge: "Finance",
    availability: "ready",
  },
  {
    reportType: "weekly_manager",
    title: "Brief hebdomadaire",
    description: "Priorités de la semaine, alertes à traiter et actions recommandées — calculées, pas devinées.",
    badge: "Hebdo",
    availability: "ready",
  },
]

export type ReportGenerationOrigin =
  | "global"
  | "reports_library"
  | "intelligence_common"
  | "commercial_activity"
  | "recruitment"
  | "cockpit"
  | "agenda"

export interface ReportGenerationRequest {
  origin: ReportGenerationOrigin
  reportType?: ReportGenerationKind
}

export const REPORT_GENERATION_EVENT = "kredo:open-report-generation"

export function getReportGenerationOption(reportType: ReportGenerationKind) {
  return REPORT_GENERATION_OPTIONS.find((option) => option.reportType === reportType)
}

export function openReportGeneration(request: ReportGenerationRequest = { origin: "global" }) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<ReportGenerationRequest>(REPORT_GENERATION_EVENT, {
      detail: request,
    }),
  )
}
