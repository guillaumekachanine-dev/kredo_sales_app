import { getCategoryForType } from "@/lib/agenda/agenda-config"
import type { CommercialActivityCategory, CommercialActivityNature } from "./commercial-activity-types"

type ActivityMetadata = Record<string, unknown> | null | undefined

export type CommercialActivityClassificationInput = {
  metadata?: ActivityMetadata
  eventType?: string | null
  missionId?: string | null
  opportunityId?: string | null
  candidateId?: string | null
  opportunityCandidateId?: string | null
  companyLifecycle?: string | null
}

const EXPLICIT_NATURES: Record<string, CommercialActivityNature> = {
  prospection: "prospection",
  client_active: "client_active",
  client_actif: "client_active",
  recrutement: "recruitment",
  recruitment: "recruitment",
  management: "management",
  interne: "internal",
  internal: "internal",
}

function metadataNature(metadata: ActivityMetadata): CommercialActivityNature | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  for (const key of ["commercial_activity_nature", "activity_nature", "agenda_category", "category"]) {
    const value = metadata[key]
    if (typeof value === "string" && EXPLICIT_NATURES[value.trim().toLowerCase()]) {
      return EXPLICIT_NATURES[value.trim().toLowerCase()]!
    }
  }
  return null
}

/** Canonical, title-independent classifier shared by all commercial activity calculations. */
export function resolveCommercialActivityNature(input: CommercialActivityClassificationInput): CommercialActivityCategory {
  const explicit = metadataNature(input.metadata)
  if (explicit) return explicit

  if (input.eventType) {
    const agendaCategory = getCategoryForType(input.eventType)
    if (agendaCategory) return agendaCategory === "client_actif" ? "client_active" : agendaCategory === "recrutement" ? "recruitment" : agendaCategory === "interne" ? "internal" : agendaCategory
  }

  if (input.candidateId || input.opportunityCandidateId) return "recruitment"
  if (input.missionId || input.opportunityId) return "client_active"
  if (input.companyLifecycle === "prospect") return "prospection"
  if (input.companyLifecycle === "client") return "client_active"
  return "unclassified"
}

export function isIncludedNature(category: CommercialActivityCategory, filter: CommercialActivityNature | "commercial") {
  if (category === "unclassified") return false
  return filter === "commercial"
    ? category === "prospection" || category === "client_active" || category === "recruitment"
    : category === filter
}

export const COMMERCIAL_ACTIVITY_NATURE_LABELS: Record<CommercialActivityNature, string> = {
  prospection: "Prospection",
  client_active: "Client actif",
  recruitment: "Recrutement",
  management: "Management",
  internal: "Interne",
}
