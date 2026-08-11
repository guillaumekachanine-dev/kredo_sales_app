// Client-safe workflow vocabulary shared by operational and analytical views.
export const WORKFLOW_LABELS: Record<string, string> = {
  "intel-010-refresh": "Scan rapide compte",
  "intel-020-communication": "Rédaction (pitch / mail)",
  "intel-021-monthly-watch-analysis": "Analyse mensuelle de la veille",
  "intel-020-pitch-mail": "Rédaction (legacy)",
  "intel-030-account-knowledge": "Connaissance compte",
  "intel-031-issues-map": "Cartographie des enjeux",
  "intel-032-strategy": "Stratégie commerciale",
  account_watch_refresh: "Veille de compte",
  "report-account-summary": "Synthèse de compte",
  "report-activity-commercial": "Rapport activité commerciale",
  "report-activity-recruitment": "Rapport activité recrutement",
  "report-weekly-manager": "Brief hebdomadaire manager",
  process_diagnostic: "Diagnostic process (import)",
  process_diagnostic_import: "Diagnostic process (import)",
  full_prospection_analysis: "Analyse prospection (legacy)",
  activity_commercial: "Rapport activité commerciale (legacy)",
  activity_recruitment: "Rapport activité recrutement (legacy)",
}

export const WORKFLOW_NOMENCLATURE: Record<string, string> = {
  "intel-010-refresh": "INTEL-010 - Scan rapide compte",
  "intel-011-sector": "INTEL-011 - Étude sectorielle",
  "intel-020-communication": "INTEL-020 - Rédaction assistée",
  "intel-020-pitch-mail": "INTEL-020 - Rédaction (legacy)",
  "intel-021-monthly-watch-analysis": "INTEL-021 - Synthèse mensuelle de la veille",
  "intel-022-campaign": "INTEL-022 - Création de campagne",
  "intel-030-account-knowledge": "INTEL-030 - Connaissance compte",
  "intel-031-issues-map": "INTEL-031 - Cartographie des enjeux",
  "intel-032-strategy": "INTEL-032 - Stratégie commerciale",
  "intel-040-workspace-diagnostic": "INTEL-040 - Diagnostic workspace",
  account_watch_refresh: "INTEL-012 - Veille de compte",
  "report-account-summary": "REPORT-001 - Synthèse de compte",
  "report-activity-commercial": "REPORT-002 - Rapport activité commerciale",
  "report-activity-recruitment": "REPORT-003 - Rapport activité recrutement",
  "report-weekly-manager": "REPORT-004 - Brief hebdomadaire manager",
  process_diagnostic: "INTEL-033 - Diagnostic process",
  process_diagnostic_import: "INTEL-033 - Diagnostic process",
}

export function workflowLabelForRunType(runType: string): string {
  return WORKFLOW_LABELS[runType] ?? runType
}

export function workflowNomenclatureForRunType(runType: string): string {
  if (WORKFLOW_NOMENCLATURE[runType]) {
    return WORKFLOW_NOMENCLATURE[runType]
  }
  const label = WORKFLOW_LABELS[runType] ?? runType
  return `INTEL-0X - ${label}`
}

