import { SectionDashboardConfig } from "../dashboard-types"

export const financeDashboardConfig: SectionDashboardConfig = {
  sectionKey: "finance",
  title: "Finance",
  description: "P&L, marge, forecast et rentabilité",
  primaryAction: {
    id: "refresh-forecast",
    label: "Actualiser forecast",
    variant: "primary",
    href: "/finance/forecast/refresh"
  },
  secondaryActions: [
    {
      id: "view-margins",
      label: "Analyse des marges",
      variant: "secondary",
      href: "/finance/marges"
    }
  ],
  mainPanel: {
    title: "Performance Financière",
    description: "P&L et projections de marge",
    type: "pnl"
  }
}
