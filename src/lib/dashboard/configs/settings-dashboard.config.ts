import { SectionDashboardConfig } from "../dashboard-types"

export const settingsDashboardConfig: SectionDashboardConfig = {
  sectionKey: "settings",
  title: "Paramètres Système",
  description: "Configuration globale de l'application, des rôles et des webhooks",
  primaryAction: {
    id: "manage-team",
    label: "Gérer l'équipe",
    variant: "primary",
    href: "/settings/team"
  },
  secondaryActions: [
    {
      id: "api-keys",
      label: "Clés d'API & Sync",
      variant: "secondary",
      href: "/automations"
    }
  ],
  mainPanel: {
    title: "Workspace & Sécurité",
    description: "Informations générales sur l'organisation",
    type: "generic"
  }
}
