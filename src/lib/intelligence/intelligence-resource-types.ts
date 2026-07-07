export type IntelligenceResourceCategory =
  | "analyses"
  | "communications"
  | "reports"
  | "roadmaps"

export const ANALYSIS_RESULT_TYPES = [
  "client_analysis",
  "sector_analysis",
  "process_diagnostic",
  // ADR-0012 — chaîne de décision commerciale (Lots 2-5)
  "account_knowledge",
  "sector_snapshot",
  "account_issues_map",
  "commercial_strategy",
] as const

export const COMMUNICATION_RESULT_TYPES = [
  "communication",
  "commercial_pitch", // ADR-0009 — vrai result_type produit (remplace pitch/pitch_mail)
  "pitch",            // legacy pré-rename intel-020-pitch-mail — alias de compat, cf. save-as-document.ts/api/n8n/callback
  "pitch_mail",       // idem
] as const

export const REPORT_RESULT_TYPES = [
  "client_summary",
  "activity_commercial",  // REPORT-001 Lot 2
  "activity_recruitment", // REPORT-001 Lot 2
  "weekly_manager",       // ADR-0010
] as const
// Note : "report" (générique) retiré — jamais produit en base et sans aucune
// autre référence dans le code (contrairement à "roadmap", qui reste un
// placeholder documenté ailleurs, cf. ROADMAP_RESULT_TYPES + account-panel-data.ts).

export const ROADMAP_RESULT_TYPES = [
  "roadmap",
  "commercial_roadmap", // ADR-0012 Lot 6
] as const

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
