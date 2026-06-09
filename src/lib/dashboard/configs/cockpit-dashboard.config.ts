import { SectionDashboardConfig } from "../dashboard-types"

export const cockpitDashboardConfig: SectionDashboardConfig = {
  sectionKey: "cockpit",
  title: "Cockpit",
  description: "Vue d'ensemble et pilotage consolidé de Kredo",
  primaryAction: {
    id: "refresh-all",
    label: "Actualiser la vue",
    variant: "primary",
    href: "/cockpit?refresh=true"
  },
  secondaryActions: [
    {
      id: "config-views",
      label: "Configurer les vues",
      variant: "secondary",
      href: "/settings"
    }
  ],
  mainPanel: {
    title: "Santé opérationnelle globale",
    description: "Indicateurs clés consolidés de l'activité",
    type: "forecast"
  }
}
