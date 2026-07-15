// Client-safe workflow vocabulary shared by operational and analytical views.
export const WORKFLOW_LABELS: Record<string, string> = {
  "intel-010-refresh": "Scan rapide compte",
  "intel-020-communication": "Rédaction (pitch / mail)",
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

export function workflowLabelForRunType(runType: string): string {
  return WORKFLOW_LABELS[runType] ?? runType
}
