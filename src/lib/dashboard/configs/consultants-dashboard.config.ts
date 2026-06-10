import { SectionDashboardConfig } from "../dashboard-types"

export const consultantsDashboardConfig: SectionDashboardConfig = {
  sectionKey: "consultants",
  title: "Pool Consultants & Compétences",
  description: "Gestion des fiches collaborateurs et matching des compétences",
  primaryAction: {
    id: "add-consultant",
    label: "Ajouter un collaborateur",
    variant: "primary",
    href: "/consultants/new"
  },
  secondaryActions: [
    {
      id: "skills-map",
      label: "Cartographie compétences",
      variant: "secondary",
      href: "/knowledge"
    }
  ],
  mainPanel: {
    title: "Suivi des effectifs & qualification",
    description: "Compétences clés du pool de consultants",
    type: "generic"
  }
}
