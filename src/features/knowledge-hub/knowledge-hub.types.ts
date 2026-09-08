export type KnowledgeHubMode = "library" | "workshops" | "ask"

export type KnowledgeView =
  | { type: "categories" }
  | { type: "domain"; domainId: string; sectionId?: string }

export interface DomainItem {
  id: string
  title: string
  subItems: string[]
  description: string
  nature: string
  relations: string[]
}

export interface WorkshopItem {
  id: string
  title: string
  description: string
  mobilizedKnowledge: string[]
  icon: string
  status: "À venir"
}
