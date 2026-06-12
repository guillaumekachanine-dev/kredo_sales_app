import { SectionDashboardConfig } from "../dashboard-types"

export const salesDashboardConfig: SectionDashboardConfig = {
  sectionKey: "sales",
  title: "Sales",
  description: "Pilotage commercial du centre de profit",
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
