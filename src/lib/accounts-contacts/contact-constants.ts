export const CONTACT_DEPARTMENTS = [
  { value: "general_management", label: "Direction générale" },
  { value: "sales", label: "Direction commerciale" },
  { value: "it", label: "Direction des systèmes d'information" },
  { value: "technical", label: "Direction technique" },
  { value: "it_operations", label: "Infrastructure & production IT" },
  { value: "cloud_devops", label: "Cloud & DevOps" },
  { value: "cybersecurity", label: "Cybersécurité" },
  { value: "data_bi", label: "Data & BI" },
  { value: "ai_innovation", label: "IA & innovation" },
  { value: "digital_transformation", label: "Digital / Transformation" },
  { value: "procurement", label: "Achats" },
  { value: "business_unit", label: "Direction métier" },
  { value: "other", label: "Autre" },
] as const

export type ContactDepartment = (typeof CONTACT_DEPARTMENTS)[number]["value"]

export const CONTACT_RELATIONSHIP_ROLE_OPTIONS = [
  { value: "decideur", label: "Décideur" },
  { value: "prescripteur", label: "Prescripteur" },
  { value: "sponsor", label: "Sponsor" },
  { value: "operationnel", label: "Opérationnel" },
  { value: "acheteur", label: "Acheteur" },
] as const

export type ContactRelationshipRole = (typeof CONTACT_RELATIONSHIP_ROLE_OPTIONS)[number]["value"]

const CONTACT_RELATIONSHIP_ROLE_LABELS: Record<ContactRelationshipRole, string> =
  Object.fromEntries(
    CONTACT_RELATIONSHIP_ROLE_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<ContactRelationshipRole, string>

export function departmentLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return CONTACT_DEPARTMENTS.find((d) => d.value === value)?.label ?? value
}

export function normalizeContactRelationshipRole(
  value: string | null | undefined,
): ContactRelationshipRole | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null

  switch (normalized) {
    case "decideur":
    case "dsi":
    case "direction_metier":
      return "decideur"
    case "prescripteur":
    case "rh":
      return "prescripteur"
    case "sponsor":
      return "sponsor"
    case "operationnel":
    case "manager_technique":
    case "utilisateur_final":
      return "operationnel"
    case "acheteur":
      return "acheteur"
    default:
      return null
  }
}

export function relationshipRoleLabel(value: string | null | undefined): string {
  const normalized = normalizeContactRelationshipRole(value)
  if (normalized) return CONTACT_RELATIONSHIP_ROLE_LABELS[normalized]
  if (!value) return "—"
  return value.replaceAll("_", " ")
}

/**
 * Accent de bordure gauche par rôle relationnel : jaune ambre pour les décideurs,
 * argent vif pour les prescripteurs et sponsors. Aucun accent pour les autres rôles.
 */
const RELATIONSHIP_ROLE_ACCENT_COLORS: Partial<Record<ContactRelationshipRole, string>> = {
  decideur: "#FFB812",
  prescripteur: "#9FB0C7",
  sponsor: "#9FB0C7",
}

export function relationshipRoleAccentColor(value: string | null | undefined): string | null {
  const normalized = normalizeContactRelationshipRole(value)
  if (!normalized) return null
  return RELATIONSHIP_ROLE_ACCENT_COLORS[normalized] ?? null
}

export function getContactDisplayDecisionPower(
  decisionPower: string | null | undefined,
  relationshipRole: string | null | undefined,
): string {
  if (decisionPower && decisionPower.trim()) {
    return decisionPower.trim()
  }
  const normRole = normalizeContactRelationshipRole(relationshipRole)
  if (normRole === "decideur") {
    return "Décideur"
  }
  return "—"
}

