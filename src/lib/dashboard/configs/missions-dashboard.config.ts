import { SectionDashboardConfig } from "../dashboard-types"

export const missionsDashboardConfig: SectionDashboardConfig = {
  sectionKey: "missions",
  title: "Missions & Opportunités",
  description: "Suivi opérationnel des missions et du pipeline commercial",
  primaryAction: {
    id: "new-opp",
    label: "Nouvelle opportunité",
    variant: "primary",
    href: "/opportunites/nouvelle"
  },
  secondaryActions: [
    {
      id: "view-crm",
      label: "Accéder au CRM",
      variant: "secondary",
      href: "/crm"
    }
  ],
  mainPanel: {
    title: "Pipeline commercial",
    description: "État d'avancement des opportunités en cours",
    type: "pipeline"
  }
}
