import { SectionDashboardConfig } from "../dashboard-types"

export const recruitmentDashboardConfig: SectionDashboardConfig = {
  sectionKey: "recruitment",
  title: "Recrutement & Pipeline Candidats",
  description: "Suivi des candidatures, des entretiens et du matching IA",
  primaryAction: {
    id: "add-candidate",
    label: "Ajouter un candidat",
    variant: "primary",
    href: "/recruitment/new"
  },
  secondaryActions: [
    {
      id: "active-demands",
      label: "Besoins ouverts",
      variant: "secondary",
      href: "/missions/opps"
    }
  ],
  mainPanel: {
    title: "Pipeline de recrutement actif",
    description: "État d'avancement des candidatures",
    type: "generic"
  }
}
