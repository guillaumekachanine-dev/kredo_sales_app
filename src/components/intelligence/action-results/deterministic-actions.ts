// Identifiants des actions d'intelligence déterministes et leur prédicat.
//
// Module PUR, sans composant : extrait de `IntelligenceActionResultContent.tsx`
// (audit d'ouverture des pages, O-7). Le prédicat était importé par
// `IntelligenceActionCard`, le panneau et le FAB — ce qui tirait statiquement les
// 16 vues de résultat dans la chrome de toutes les pages, alors qu'elles ne
// s'affichent qu'après le clic sur une action.

export const DETERMINISTIC_INTELLIGENCE_ACTION_IDS = [
  "action_priorities",
  "prepare_day",
  "detect_risks",
  "analyze_activity",
  "pipeline_insights",
  "forecast_revenue",
  "prioritize_pipeline",
  "analyze_needs",
  "scan_contacts",
  "analyze_funnel",
  "analyze_margins",
  "upcoming_deadlines",
  "analyze_automation_errors",
  "analyze_automation_costs",
  "prioritize_automation_fixes",
  "skills_vs_needs",
] as const

export type DeterministicIntelligenceActionId = typeof DETERMINISTIC_INTELLIGENCE_ACTION_IDS[number]

export function isDeterministicIntelligenceAction(id: string): id is DeterministicIntelligenceActionId {
  return DETERMINISTIC_INTELLIGENCE_ACTION_IDS.includes(id as DeterministicIntelligenceActionId)
}
