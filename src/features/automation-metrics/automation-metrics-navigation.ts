import type { AutomationMetricsSectionId } from "./automation-metrics-types"

export type AutomationMetricsNavigationItem = {
  id: AutomationMetricsSectionId
  title: string
  mobileTitle: string
  description: string
  icon: string
}

export const AUTOMATION_METRICS_SECTIONS: AutomationMetricsNavigationItem[] = [
  { id: "overview", title: "Vue d’ensemble", mobileTitle: "Vue d’ensemble", description: "Volumes, succès et tendance globale", icon: "◫" },
  { id: "reliability", title: "Fiabilité", mobileTitle: "Fiabilité", description: "Succès et échecs par workflow", icon: "◌" },
  { id: "performance", title: "Performance", mobileTitle: "Performance", description: "Latences médianes et dégradées", icon: "↗" },
  { id: "costs", title: "Coûts & efficacité", mobileTitle: "Coûts", description: "Dépenses, couverture et coût par succès", icon: "€" },
  { id: "incidents", title: "Incidents & reprises", mobileTitle: "Incidents", description: "Causes d’échec et interventions automatiques", icon: "!" },
]
