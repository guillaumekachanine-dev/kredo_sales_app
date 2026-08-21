export type BusinessIntelligenceCatalogIssue = "unknown_segment" | "macro_not_allowed" | "malformed_segment" | null

export const CATALOG_ISSUE_MESSAGES: Record<Exclude<BusinessIntelligenceCatalogIssue, null>, string> = {
  unknown_segment: "Le segment demandé n’existe pas ou n’est pas accessible.",
  macro_not_allowed: "Sélectionnez un segment métier : un macro-secteur ne peut pas devenir le contexte actif.",
  malformed_segment: "L’identifiant de segment fourni n’est pas valide.",
}
