export type AgendaCategoryId = "prospection" | "client_actif" | "recrutement" | "management" | "interne"

export interface AgendaEventTypeConfig {
  id: string
  label: string
  shortLabel: string
  colorClasses: string
  borderClasses: string
  dotClass: string
  category: AgendaCategoryId
}

export const AGENDA_EVENT_TYPES: Record<string, AgendaEventTypeConfig> = {
  // ── PROSPECTION ──────────────────────────────────────────────
  rdv_prospection: {
    id: "rdv_prospection",
    label: "RDV prospection",
    shortLabel: "Prospection",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "prospection",
  },
  appel_qualification: {
    id: "appel_qualification",
    label: "Appel qualification besoin",
    shortLabel: "Qualification",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "prospection",
  },
  appel_prospection: {
    id: "appel_prospection",
    label: "Appel prospection",
    shortLabel: "Appel prosp.",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "prospection",
  },
  mailing_prospection: {
    id: "mailing_prospection",
    label: "Mailing prospection",
    shortLabel: "Mailing",
    colorClasses: "bg-cat-active/8 text-cat-active border-cat-active/15",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
    category: "prospection",
  },

  // ── CLIENT ACTIF ─────────────────────────────────────────────
  rdv_client_suivi: {
    id: "rdv_client_suivi",
    label: "RDV suivi client",
    shortLabel: "Suivi client",
    colorClasses: "bg-primary/10 text-primary border-primary/20",
    borderClasses: "border-l-4 border-l-primary",
    dotClass: "bg-primary",
    category: "client_actif",
  },
  soutenance: {
    id: "soutenance",
    label: "Soutenance",
    shortLabel: "Soutenance",
    colorClasses: "bg-primary/10 text-primary border-primary/20",
    borderClasses: "border-l-4 border-l-primary",
    dotClass: "bg-primary",
    category: "client_actif",
  },
  atelier_client: {
    id: "atelier_client",
    label: "Atelier client",
    shortLabel: "Atelier",
    colorClasses: "bg-cat-info/10 text-cat-info-fg border-cat-info/20",
    borderClasses: "border-l-4 border-l-cat-info",
    dotClass: "bg-cat-info",
    category: "client_actif",
  },
  suivi_mission_client: {
    id: "suivi_mission_client",
    label: "Suivi mission client",
    shortLabel: "Suivi mission",
    colorClasses: "bg-success/10 text-success border-success/20",
    borderClasses: "border-l-4 border-l-success",
    dotClass: "bg-success",
    category: "client_actif",
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

  // ── INTERNE ─────────────────────────────────────────────────
  presentation_rt: {
    id: "presentation_rt",
    label: "Présentation (RT)",
    shortLabel: "RT",
    colorClasses: "bg-cat-idea/10 text-cat-idea border-cat-idea/20",
    borderClasses: "border-l-4 border-l-cat-idea",
    dotClass: "bg-cat-idea",
    category: "interne",
  },
}

export type AgendaEventType = keyof typeof AGENDA_EVENT_TYPES
export const AGENDA_EVENT_TYPE_KEYS = Object.keys(AGENDA_EVENT_TYPES) as AgendaEventType[]
export const AGENDA_EVENT_TYPE_OPTIONS = Object.values(AGENDA_EVENT_TYPES)

export const AGENDA_CATEGORIES = [
  {
    id: "prospection" as const,
    label: "Prospection",
    subtitle: "Découverte & prospection",
    dataviz: 1 as const,
    iconUrl: "/icons_set/contexte_client.png",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "prospection"),
  },
  {
    id: "client_actif" as const,
    label: "Client actif",
    subtitle: "Suivi & soutenance client",
    dataviz: 2 as const,
    iconUrl: "/icons_set/contacts_client.png",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "client_actif"),
  },
  {
    id: "recrutement" as const,
    label: "Recrutement",
    subtitle: "Candidats & sourcing",
    dataviz: 4 as const,
    iconUrl: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "recrutement"),
  },
  {
    id: "management" as const,
    label: "Management",
    subtitle: "Collaborateurs & suivi mission",
    dataviz: 5 as const,
    iconUrl: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "management"),
  },
  {
    id: "interne" as const,
    label: "Interne",
    subtitle: "Présentations & interne",
    dataviz: 6 as const,
    iconUrl: "/icons_set/presentation_client_rt_2.png",
    types: AGENDA_EVENT_TYPE_OPTIONS.filter((t) => t.category === "interne"),
  },
] as const

export function getCategoryForType(eventType: string): AgendaCategoryId | null {
  const config = AGENDA_EVENT_TYPES[eventType]
  return config?.category ?? null
}

export const PROSPECTION_TYPES = new Set([
  "rdv_prospection",
  "appel_prospection",
  "mailing_prospection",
  "appel_qualification",
])

export const CLIENT_ACTIF_TYPES = new Set([
  "rdv_client_suivi",
  "soutenance",
  "atelier_client",
  "suivi_mission_client",
])

export const RECRUTEMENT_TYPES = new Set([
  "entretien_candidat",
  "preparation_candidat",
  "sourcing_candidats",
])

export const MANAGEMENT_TYPES = new Set([
  "suivi_mission_collab",
  "ead_collab",
  "entretien_rh",
  "preparation_collab",
])

export const INTERNE_TYPES = new Set([
  "presentation_rt",
])

// Legacy compatibility exports
export const COMMERCE_TYPES = new Set([
  ...PROSPECTION_TYPES,
  ...CLIENT_ACTIF_TYPES,
])
