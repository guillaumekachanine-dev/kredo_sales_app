// Client-safe workflow vocabulary shared by operational and analytical views.

export const LEGACY_WORKFLOW_TYPES = [
  "intel-020-pitch-mail",
  "process_diagnostic",
  "process_diagnostic_import",
  "full_prospection_analysis",
  "activity_commercial",
  "activity_recruitment",
  "folio_legacy",
  "agent_ia_business_analyst",
] as const

export const CANONICAL_ACTIVE_WORKFLOWS: Array<{ runType: string; label: string; nomenclature: string }> = [
  { runType: "veille-hebdomadaire-kredo", label: "Veille hebdomadaire IA & Marché", nomenclature: "VEILLE-001 - Veille hebdomadaire IA & Marché" },
  { runType: "veille-ia-marche-on-demand", label: "Veille IA & Marché à la demande", nomenclature: "VEILLE-001 - Veille IA & Marché à la demande" },
  { runType: "intel-010-refresh", label: "Scan rapide compte", nomenclature: "INTEL-010 - Scan rapide compte" },
  { runType: "intel-011-sector", label: "Étude sectorielle", nomenclature: "INTEL-011 - Étude sectorielle" },
  { runType: "intel-020-communication", label: "Rédaction assistée", nomenclature: "INTEL-020 - Rédaction assistée" },
  { runType: "intel-021-monthly-watch-analysis", label: "Synthèse mensuelle de la veille", nomenclature: "INTEL-021 - Synthèse mensuelle de la veille" },
  { runType: "intel-022-campaign", label: "Création de campagne", nomenclature: "INTEL-022 - Création de campagne" },
  { runType: "intel-030-account-knowledge", label: "Connaissance compte", nomenclature: "INTEL-030 - Connaissance compte" },
  { runType: "intel-031-issues-map", label: "Cartographie des enjeux", nomenclature: "INTEL-031 - Cartographie des enjeux" },
  { runType: "intel-032-strategy", label: "Stratégie commerciale", nomenclature: "INTEL-032 - Stratégie commerciale" },
  { runType: "account_watch_refresh", label: "Veille de compte", nomenclature: "INTEL-033 - Veille de compte" },
  { runType: "intel-033-account-watch-refresh", label: "Veille de compte", nomenclature: "INTEL-033 - Veille de compte" },
  { runType: "intel-034-account-signal-verification", label: "Vérification de signal", nomenclature: "INTEL-034 - Vérification de signal" },
  { runType: "intel-040-workspace-diagnostic", label: "Diagnostic workspace", nomenclature: "INTEL-040 - Diagnostic workspace" },
  { runType: "report-account-summary", label: "Synthèse de compte", nomenclature: "REPORT-001 - Synthèse de compte" },
  { runType: "report-activity-commercial", label: "Rapport activité commerciale", nomenclature: "REPORT-002 - Rapport activité commerciale" },
  { runType: "report-activity-recruitment", label: "Rapport activité recrutement", nomenclature: "REPORT-003 - Rapport activité recrutement" },
  { runType: "report-weekly-manager", label: "Brief hebdomadaire manager", nomenclature: "REPORT-004 - Brief hebdomadaire manager" },
]

export const WORKFLOW_LABELS: Record<string, string> = {
  "veille-hebdomadaire-kredo": "Veille hebdomadaire IA & Marché",
  "veille-ia-marche-on-demand": "Veille IA & Marché à la demande",
  "global-watch": "Veille hebdomadaire IA & Marché",
  "global_watch": "Veille hebdomadaire IA & Marché",
  "KREDO — Veille Hebdomadaire IA & Marché": "Veille hebdomadaire IA & Marché",
  "intel-010-refresh": "Scan rapide compte",
  "intel-011-sector": "Étude sectorielle",
  "intel-020-communication": "Rédaction assistée",
  "intel-021-monthly-watch-analysis": "Synthèse mensuelle de la veille",
  "intel-022-campaign": "Création de campagne",
  "intel-030-account-knowledge": "Connaissance compte",
  "intel-031-issues-map": "Cartographie des enjeux",
  "intel-032-strategy": "Stratégie commerciale",
  "intel-033-account-watch-refresh": "Veille de compte",
  account_watch_refresh: "Veille de compte",
  "intel-034-account-signal-verification": "Vérification de signal",
  "intel-040-workspace-diagnostic": "Diagnostic workspace",
  "report-account-summary": "Synthèse de compte",
  "report-activity-commercial": "Rapport activité commerciale",
  "report-activity-recruitment": "Rapport activité recrutement",
  "report-weekly-manager": "Brief hebdomadaire manager",
  "report-weekly-manager-cron": "Brief hebdomadaire manager (cron)",
  "account-watch-scheduler": "Planificateur de veille compte",
}

export const WORKFLOW_NOMENCLATURE: Record<string, string> = {
  "veille-hebdomadaire-kredo": "VEILLE-001 - Veille hebdomadaire IA & Marché",
  "veille-ia-marche-on-demand": "VEILLE-001 - Veille IA & Marché à la demande",
  "global-watch": "VEILLE-001 - Veille hebdomadaire IA & Marché",
  "global_watch": "VEILLE-001 - Veille hebdomadaire IA & Marché",
  "KREDO — Veille Hebdomadaire IA & Marché": "VEILLE-001 - Veille hebdomadaire IA & Marché",
  "intel-010-refresh": "INTEL-010 - Scan rapide compte",
  "intel-011-sector": "INTEL-011 - Étude sectorielle",
  "intel-020-communication": "INTEL-020 - Rédaction assistée",
  "intel-021-monthly-watch-analysis": "INTEL-021 - Synthèse mensuelle de la veille",
  "intel-022-campaign": "INTEL-022 - Création de campagne",
  "intel-030-account-knowledge": "INTEL-030 - Connaissance compte",
  "intel-031-issues-map": "INTEL-031 - Cartographie des enjeux",
  "intel-032-strategy": "INTEL-032 - Stratégie commerciale",
  "intel-033-account-watch-refresh": "INTEL-033 - Veille de compte",
  account_watch_refresh: "INTEL-033 - Veille de compte",
  "intel-034-account-signal-verification": "INTEL-034 - Vérification de signal",
  "intel-040-workspace-diagnostic": "INTEL-040 - Diagnostic workspace",
  "report-account-summary": "REPORT-001 - Synthèse de compte",
  "report-activity-commercial": "REPORT-002 - Rapport activité commerciale",
  "report-activity-recruitment": "REPORT-003 - Rapport activité recrutement",
  "report-weekly-manager": "REPORT-004 - Brief hebdomadaire manager",
  "report-weekly-manager-cron": "REPORT-004 - Brief hebdomadaire manager (cron)",
  "account-watch-scheduler": "OPS-001 - Planificateur de veille compte",
}

export function isLegacyWorkflow(runType: string | null | undefined): boolean {
  if (!runType) return false
  const normalized = runType.toLowerCase().trim()
  return (
    LEGACY_WORKFLOW_TYPES.includes(normalized as typeof LEGACY_WORKFLOW_TYPES[number]) ||
    normalized.includes("legacy") ||
    normalized.startsWith("process_diagnostic") ||
    normalized === "full_prospection_analysis" ||
    normalized === "activity_commercial" ||
    normalized === "activity_recruitment" ||
    normalized.startsWith("folio_")
  )
}

export function workflowLabelForRunType(runType: string): string {
  return WORKFLOW_LABELS[runType] ?? runType
}

export function workflowNomenclatureForRunType(runType: string): string {
  if (WORKFLOW_NOMENCLATURE[runType]) {
    return WORKFLOW_NOMENCLATURE[runType]
  }
  const label = WORKFLOW_LABELS[runType] ?? runType
  return label
}

