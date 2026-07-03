export type ReportGenerationKind = "activity_commercial" | "activity_recruitment"

export type ReportGenerationOrigin =
  | "global"
  | "reports_library"
  | "intelligence_common"
  | "commercial_activity"
  | "recruitment"
  | "cockpit"

export interface ReportGenerationRequest {
  origin: ReportGenerationOrigin
  reportType?: ReportGenerationKind
}

export const REPORT_GENERATION_EVENT = "kredo:open-report-generation"

export function openReportGeneration(request: ReportGenerationRequest = { origin: "global" }) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<ReportGenerationRequest>(REPORT_GENERATION_EVENT, {
      detail: request,
    }),
  )
}
