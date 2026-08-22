import type { IntelligenceIconKey } from "@/lib/intelligence/intelligence-registry"

import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"

const COCKPIT_ICON_BASE = "/icons_set/cockpit_intelligence"

export const COCKPIT_PANEL_INDIGO = "var(--color-primary)"

export const cockpitActionIcons = {
  alert: `${COCKPIT_ICON_BASE}/alerte_ai.png`,
  marginAnalysis: `${COCKPIT_ICON_BASE}/analyse_marges.png`,
  sectorAnalysis: `${COCKPIT_ICON_BASE}/analyse_sectorielle.png`,
  brief: `${COCKPIT_ICON_BASE}/brief_hebdo.png`,
  campaign: `${COCKPIT_ICON_BASE}/creer_campagne.png`,
  cockpitIntelligence: `${COCKPIT_ICON_BASE}/cockpit_intelligence.png`,
  priorities: `${COCKPIT_ICON_BASE}/definition_priorites.png`,
  pitch: `${COCKPIT_ICON_BASE}/generation_pitch.png`,
  generatedReport: `${COCKPIT_ICON_BASE}/generer_rapport.png`,
  revenueForecast: `${COCKPIT_ICON_BASE}/prevision_ca.png`,
  prioritizeAccounts: `${COCKPIT_ICON_BASE}/prioriser_comptes.png`,
  financeReport: `${COCKPIT_ICON_BASE}/rapport_financier_ai.png`,
  recruitmentReport: `${COCKPIT_ICON_BASE}/rapport_recrutement_ai.png`,
  recommendations: `${COCKPIT_ICON_BASE}/recommandations_ai.png`,
  recommendationsIa: `${COCKPIT_ICON_BASE}/recommandations_ia.png`,
  message: `${COCKPIT_ICON_BASE}/redaction_message_ai.png`,
  roadmap: `${COCKPIT_ICON_BASE}/roadmap_commerciale-removebg-preview.png`,
  tasks: `${COCKPIT_ICON_BASE}/suggestion_taches_&_evenements.png`,
  valid: `${COCKPIT_ICON_BASE}/valide.png`,
} as const

export function cockpitIconForKey(icon: IntelligenceIconKey): string {
  switch (icon) {
    case "weekly_brief":
      return cockpitActionIcons.brief
    case "write_email":
      return cockpitActionIcons.message
    case "generate_pitch":
      return cockpitActionIcons.pitch
    case "search_news":
    case "detect_risks":
      return cockpitActionIcons.alert
    case "scan_contact":
      return cockpitActionIcons.recommendationsIa
    case "deep_analysis":
    case "recommendations":
    case "sparkle":
      return cockpitActionIcons.recommendations
    case "build_roadmap":
      return cockpitActionIcons.roadmap
    case "prioritize":
      return cockpitActionIcons.priorities
    case "sector_analysis":
      return cockpitActionIcons.sectorAnalysis
    case "create_campaign":
      return cockpitActionIcons.campaign
    case "match_profiles":
    case "analyze_skills":
      return cockpitActionIcons.recruitmentReport
    case "report":
      return cockpitActionIcons.generatedReport
    case "analyze_margins":
      return cockpitActionIcons.marginAnalysis
    case "forecast":
      return cockpitActionIcons.revenueForecast
    default:
      return cockpitActionIcons.recommendations
  }
}

export function cockpitIconForAction(actionId: string, icon: IntelligenceIconKey): string {
  if (actionId in MISSION_COMPOSER_ACTION_CONFIGS || actionId.includes("mission")) {
    return cockpitActionIcons.cockpitIntelligence
  }
  if (actionId.includes("brief")) return cockpitActionIcons.brief
  if (actionId.includes("email")) return cockpitActionIcons.message
  if (actionId.includes("pitch") || actionId.includes("offer") || actionId.includes("quote")) {
    return cockpitActionIcons.pitch
  }
  if (actionId.includes("campaign")) return cockpitActionIcons.campaign
  if (actionId.includes("sector")) return cockpitActionIcons.sectorAnalysis
  if (actionId.includes("roadmap")) return cockpitActionIcons.roadmap
  if (actionId.includes("prioritize_accounts")) return cockpitActionIcons.prioritizeAccounts
  if (actionId.includes("report") || actionId.includes("portfolio") || actionId.includes("funnel")) {
    return cockpitActionIcons.generatedReport
  }
  if (actionId.includes("margin")) return cockpitActionIcons.marginAnalysis
  if (actionId.includes("forecast")) return cockpitActionIcons.revenueForecast
  if (actionId.includes("profile") || actionId.includes("skill") || actionId.includes("training")) {
    return cockpitActionIcons.recruitmentReport
  }
  if (actionId.includes("priorit")) {
    return cockpitActionIcons.priorities
  }
  if (actionId.includes("meeting") || actionId.includes("day")) return cockpitActionIcons.tasks
  if (actionId.includes("risk") || actionId.includes("anomal")) return cockpitActionIcons.alert
  return cockpitIconForKey(icon)
}
