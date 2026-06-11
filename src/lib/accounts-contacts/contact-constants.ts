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

export function departmentLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return CONTACT_DEPARTMENTS.find((d) => d.value === value)?.label ?? value
}
