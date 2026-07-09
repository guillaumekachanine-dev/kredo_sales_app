export interface AgendaEventTypeConfig {
  id: string
  label: string
  shortLabel: string
  colorClasses: string
  borderClasses: string
  dotClass: string
  category: "commerce" | "management" | "recrutement"
}

export const AGENDA_EVENT_TYPES: Record<string, AgendaEventTypeConfig> = {
  // ── COMMERCE ────────────────────────────────────────────────
  rdv_client_suivi: {
    id: "rdv_client_suivi",
    label: "RDV suivi client",
    shortLabel: "Suivi client",
    colorClasses: "bg-primary/10 text-primary border-primary/20",
    borderClasses: "border-l-4 border-l-primary",
    dotClass: "bg-primary",
    category: "commerce",
  },
  rdv_prospection: {
    id: "rdv_prospection",
    label: "RDV prospection",
    shortLabel: "Prospection",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "commerce",
  },
  soutenance: {
    id: "soutenance",
    label: "Soutenance",
    shortLabel: "Soutenance",
    colorClasses: "bg-primary/10 text-primary border-primary/20",
    borderClasses: "border-l-4 border-l-primary",
    dotClass: "bg-primary",
    category: "commerce",
  },
  atelier_client: {
    id: "atelier_client",
    label: "Atelier client",
    shortLabel: "Atelier",
    colorClasses: "bg-cat-info/10 text-cat-info-fg border-cat-info/20",
    borderClasses: "border-l-4 border-l-cat-info",
    dotClass: "bg-cat-info",
    category: "commerce",
  },
  appel_qualification: {
    id: "appel_qualification",
    label: "Appel qualification besoin",
    shortLabel: "Qualification",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "commerce",
  },
  appel_prospection: {
    id: "appel_prospection",
    label: "Appel prospection",
    shortLabel: "Appel prosp.",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "commerce",
  },
  mailing_prospection: {
    id: "mailing_prospection",
    label: "Mailing prospection",
    shortLabel: "Mailing",
    colorClasses: "bg-cat-active/8 text-cat-active border-cat-active/15",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "commerce",
  },
  suivi_mission_client: {
    id: "suivi_mission_client",
    label: "Suivi mission client",
    shortLabel: "Suivi mission",
    colorClasses: "bg-success/10 text-success border-success/20",
    borderClasses: "border-l-4 border-l-success",
    dotClass: "bg-success",
    category: "commerce",
  },

  // ── MANAGEMENT ──────────────────────────────────────────────
  suivi_mission_collab: {
    id: "suivi_mission_collab",
    label: "Suivi mission collab",
    shortLabel: "Suivi collab",
    colorClasses: "bg-success/10 text-success border-success/20",
    borderClasses: "border-l-4 border-l-success",
    dotClass: "bg-success",
    category: "management",
  },
  presentation_rt: {
    id: "presentation_rt",
    label: "Présentation (RT)",
    shortLabel: "RT",
    colorClasses: "bg-cat-idea/10 text-cat-idea border-cat-idea/20",
    borderClasses: "border-l-4 border-l-cat-idea",
    dotClass: "bg-cat-idea",
    category: "management",
  },
  ead_collab: {
    id: "ead_collab",
    label: "EAD collab",
    shortLabel: "EAD",
    colorClasses: "bg-cat-idea/10 text-cat-idea border-cat-idea/20",
    borderClasses: "border-l-4 border-l-cat-idea",
    dotClass: "bg-cat-idea",
    category: "management",
  },
  entretien_rh: {
    id: "entretien_rh",
    label: "Entretien RH",
    shortLabel: "Entretien RH",
    colorClasses: "bg-cat-idea/10 text-cat-idea border-cat-idea/20",
    borderClasses: "border-l-4 border-l-cat-idea",
    dotClass: "bg-cat-idea",
    category: "management",
  },
  preparation_collab: {
    id: "preparation_collab",
    label: "Préparation collab",
    shortLabel: "Prépa collab",
    colorClasses: "bg-success/8 text-success border-success/15",
    borderClasses: "border-l-4 border-l-success",
    dotClass: "bg-success",
    category: "management",
  },

  // ── RECRUTEMENT ─────────────────────────────────────────────
  entretien_candidat: {
    id: "entretien_candidat",
    label: "Entretien candidat",
    shortLabel: "Entretien",
    colorClasses: "bg-brand-brass/10 text-brand-brass border-brand-brass/20",
    borderClasses: "border-l-4 border-l-brand-brass",
    dotClass: "bg-brand-brass",
    category: "recrutement",
  },
  preparation_candidat: {
    id: "preparation_candidat",
    label: "Préparation candidat",
    shortLabel: "Prépa candidat",
    colorClasses: "bg-brand-brass/10 text-brand-brass border-brand-brass/20",
    borderClasses: "border-l-4 border-l-brand-brass",
    dotClass: "bg-brand-brass",
    category: "recrutement",
  },
  sourcing_candidats: {
    id: "sourcing_candidats",
    label: "Sourcing candidats",
    shortLabel: "Sourcing",
    colorClasses: "bg-brand-brass/8 text-brand-brass border-brand-brass/15",
    borderClasses: "border-l-4 border-l-brand-brass",
    dotClass: "bg-brand-brass",
    category: "recrutement",
  },
}

export type AgendaEventType = keyof typeof AGENDA_EVENT_TYPES
export const AGENDA_EVENT_TYPE_KEYS = Object.keys(AGENDA_EVENT_TYPES) as AgendaEventType[]
export const AGENDA_EVENT_TYPE_OPTIONS = Object.values(AGENDA_EVENT_TYPES)

export const AGENDA_CATEGORIES = [
  {
    id: "commerce" as const,
    label: "Commerce",
    subtitle: "Clients, prospects & missions",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "commerce"),
  },
  {
    id: "management" as const,
    label: "Interne",
    subtitle: "Équipe, collaborateurs & RH",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "management"),
  },
  {
    id: "recrutement" as const,
    label: "Recrutement",
    subtitle: "Candidats & sourcing",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "recrutement"),
  },
] as const

export type AgendaCategoryId = "commerce" | "management" | "recrutement"

export function getCategoryForType(eventType: string): AgendaCategoryId | null {
  const config = AGENDA_EVENT_TYPES[eventType]
  return config?.category ?? null
}

export const RECRUTEMENT_TYPES = new Set([
  "entretien_candidat",
  "preparation_candidat",
  "sourcing_candidats",
])

export const MANAGEMENT_TYPES = new Set([
  "suivi_mission_collab",
  "presentation_rt",
  "ead_collab",
  "entretien_rh",
  "preparation_collab",
])

export const COMMERCE_TYPES = new Set([
  "rdv_client_suivi",
  "rdv_prospection",
  "soutenance",
  "atelier_client",
  "appel_qualification",
  "appel_prospection",
  "mailing_prospection",
  "suivi_mission_client",
])
