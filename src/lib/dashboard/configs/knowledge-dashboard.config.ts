import { SectionDashboardConfig } from "../dashboard-types"

export const knowledgeDashboardConfig: SectionDashboardConfig = {
  sectionKey: "knowledge",
  title: "Knowledge Hub",
  description: "Base de connaissances et capitalisation projet",
  primaryAction: {
    id: "new-doc",
    label: "Ajouter document",
    variant: "primary",
    href: "/knowledge/documents/nouveau"
  },
  secondaryActions: [
    {
      id: "search-index",
      label: "Rechercher",
      variant: "secondary",
      href: "/knowledge/search"
    }
  ],
  mainPanel: {
    title: "Index documentaire",
    description: "Indexation RAG des connaissances",
    type: "rag"
  }
}
