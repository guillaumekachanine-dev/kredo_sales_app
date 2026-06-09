import { SectionDashboardConfig } from "../dashboard-types"

export const prospectionDashboardConfig: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Prospection Intelligence",
  description: "Ciblage et engagement de nouveaux comptes",
  primaryAction: {
    id: "new-campaign",
    label: "Nouvelle campagne",
    variant: "primary",
    href: "/prospection/campagnes/nouvelle"
  },
  secondaryActions: [
    {
      id: "view-leads",
      label: "Liste des prospects",
      variant: "secondary",
      href: "/prospection/prospects"
    }
  ],
  mainPanel: {
    title: "Performance de prospection",
    description: "Engagement et taux de réponse",
    type: "forecast"
  }
}
