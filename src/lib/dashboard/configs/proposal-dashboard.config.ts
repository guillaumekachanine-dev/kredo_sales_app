import { SectionDashboardConfig } from "../dashboard-types"

export const proposalDashboardConfig: SectionDashboardConfig = {
  sectionKey: "proposal",
  title: "Proposal Intelligence",
  description: "Génération et optimisation des propositions commerciales",
  primaryAction: {
    id: "new-proposal",
    label: "Nouvelle proposition",
    variant: "primary",
    href: "/proposals/nouvelle"
  },
  secondaryActions: [
    {
      id: "view-templates",
      label: "Modèles de document",
      variant: "secondary",
      href: "/proposals/templates"
    }
  ],
  mainPanel: {
    title: "Statistiques des propositions",
    description: "Taux de conversion et statuts",
    type: "proposal"
  }
}
