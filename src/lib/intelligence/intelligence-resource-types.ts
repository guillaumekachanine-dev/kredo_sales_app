export type IntelligenceResourceCategory =
  | "analyses"
  | "communications"
  | "reports"
  | "roadmaps"

export const ANALYSIS_RESULT_TYPES = [
  "client_analysis",
  "sector_analysis",
  "process_diagnostic",
] as const

export const COMMUNICATION_RESULT_TYPES = [
  "communication",
  "pitch",
  "pitch_mail",
] as const

export const REPORT_RESULT_TYPES = [
  "client_summary",
  "report",
] as const

export const ROADMAP_RESULT_TYPES = ["roadmap"] as const

export const LEGACY_ROADMAP_PHASE = 4

const RESOURCE_CATEGORY_BY_RESULT_TYPE: Record<string, IntelligenceResourceCategory> = {
  ...Object.fromEntries(ANALYSIS_RESULT_TYPES.map((type) => [type, "analyses"])),
  ...Object.fromEntries(COMMUNICATION_RESULT_TYPES.map((type) => [type, "communications"])),
  ...Object.fromEntries(REPORT_RESULT_TYPES.map((type) => [type, "reports"])),
  ...Object.fromEntries(ROADMAP_RESULT_TYPES.map((type) => [type, "roadmaps"])),
}

export function classifyIntelligenceResultType(
  resultType: string | null | undefined,
): IntelligenceResourceCategory | null {
  if (!resultType) return null
  return RESOURCE_CATEGORY_BY_RESULT_TYPE[resultType] ?? null
}

export function isLegacyPhase4RoadmapFallback(row: {
  phase: number
  result_type: string
  status: string
}): boolean {
  return (
    row.phase === LEGACY_ROADMAP_PHASE &&
    row.status === "succeeded" &&
    classifyIntelligenceResultType(row.result_type) !== "roadmaps"
  )
}
