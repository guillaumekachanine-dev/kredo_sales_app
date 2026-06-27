export type TabEntityType = "mission" | "opportunite" | "planning-item" | "project" | "staffing" | "company-intelligence"

export type SectionTab = {
  id: string           // uuid généré à l'ouverture
  entityType: TabEntityType
  entityId: string
  title: string        // ex: "Mission BNP Paribas"
  subtitle?: string    // ex: "Opportunité · 45 k€"
}
