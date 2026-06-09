import { SectionDashboardConfig } from "../dashboard-types"

export const automationsDashboardConfig: SectionDashboardConfig = {
  sectionKey: "automations",
  title: "Automations",
  description: "Suivi des workflows automatisés et connecteurs",
  primaryAction: {
    id: "new-flow",
    label: "Nouveau workflow",
    variant: "primary",
    href: "/automations/workflows/nouveau"
  },
  secondaryActions: [
    {
      id: "view-logs",
      label: "Logs d'exécution",
      variant: "secondary",
      href: "/automations/logs"
    }
  ],
  mainPanel: {
    title: "Statut des automates",
    description: "Taux de succès et exécutions",
    type: "automation"
  }
}
