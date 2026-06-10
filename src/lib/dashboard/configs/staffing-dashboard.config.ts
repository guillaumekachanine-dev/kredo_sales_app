import { SectionDashboardConfig } from "../dashboard-types"

export const staffingDashboardConfig: SectionDashboardConfig = {
  sectionKey: "staffing",
  title: "Staffing & Plan de charge",
  description: "Planification des consultants sur les projets et missions actives",
  primaryAction: {
    id: "plan-staffing",
    label: "Planifier un consultant",
    variant: "primary",
    href: "/staffing/plan"
  },
  secondaryActions: [
    {
      id: "view-calendar",
      label: "Vue calendrier",
      variant: "secondary",
      href: "/missions/planning"
    }
  ],
  mainPanel: {
    title: "Affectations & Taux d'occupation",
    description: "Suivi des affectations en temps réel",
    type: "generic"
  }
}
