export interface AgendaEventTypeConfig {
  id: string
  label: string
  shortLabel: string
  colorClasses: string // Tailwind classes e.g. "bg-cat-active/10 text-cat-active border-cat-active/30"
  borderClasses: string
  dotClass: string
}

export const AGENDA_EVENT_TYPES: Record<string, AgendaEventTypeConfig> = {
  prospection: {
    id: "prospection",
    label: "Rendez-vous de prospection",
    shortLabel: "Prospection",
    colorClasses: "bg-cat-active/10 text-cat-active border-cat-active/20",
    borderClasses: "border-l-4 border-l-cat-active",
    dotClass: "bg-cat-active",
  },
  client: {
    id: "client",
    label: "Rendez-vous client",
    shortLabel: "Client",
    colorClasses: "bg-cat-success/10 text-cat-success border-cat-success/20",
    borderClasses: "border-l-4 border-l-cat-success",
    dotClass: "bg-cat-success",
  },
  candidat: {
    id: "candidat",
    label: "Entretien candidat",
    shortLabel: "Candidat",
    colorClasses: "bg-cat-warning/15 text-cat-warning-fg border-cat-warning/20",
    borderClasses: "border-l-4 border-l-cat-warning",
    dotClass: "bg-cat-warning",
  },
  interne: {
    id: "interne",
    label: "Événement interne",
    shortLabel: "Interne",
    colorClasses: "bg-cat-idea/10 text-cat-idea border-cat-idea/20",
    borderClasses: "border-l-4 border-l-cat-idea",
    dotClass: "bg-cat-idea",
  },
  suivi: {
    id: "suivi",
    label: "Point de suivi",
    shortLabel: "Suivi",
    colorClasses: "bg-cat-info/10 text-cat-info-fg border-cat-info/20",
    borderClasses: "border-l-4 border-l-cat-info",
    dotClass: "bg-cat-info",
  },
  autre: {
    id: "autre",
    label: "Autre",
    shortLabel: "Autre",
    colorClasses: "bg-gray-100 text-body border-border",
    borderClasses: "border-l-4 border-l-muted",
    dotClass: "bg-muted",
  },
}

export type AgendaEventType = keyof typeof AGENDA_EVENT_TYPES
export const AGENDA_EVENT_TYPE_KEYS = Object.keys(AGENDA_EVENT_TYPES) as AgendaEventType[]
export const AGENDA_EVENT_TYPE_OPTIONS = Object.values(AGENDA_EVENT_TYPES)
