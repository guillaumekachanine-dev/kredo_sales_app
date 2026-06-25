export type TabEntityType = "mission" | "opportunite" | "planning-item" | "project"

export type SectionTab = {
  id: string           // uuid généré à l'ouverture
  entityType: TabEntityType
  entityId: string
  title: string        // ex: "Mission BNP Paribas"
  subtitle?: string    // ex: "Opportunité · 45 k€"
}
