import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { PitchDraftFormState, ClientSummaryFormState, CampaignFormState } from "./intelligence-action-types"

// ─── Payload Builders ────────────────────────────────────────────────────────

export function buildPitchDraftPayload({
  companyId,
  form,
  data,
}: {
  companyId: string
  form: PitchDraftFormState
  data: ClientIntelligenceData
}) {
  const { company, client, contacts, pitches, signals } = data
  return {
    companyId,
    action: "pitch_draft",
    form,
    context: {
      companyName: company.name,
      sector: company.sector,
      aiScore: company.aiScore,
      contactsCount: contacts.length,
      hasClientAnalysis: client ? client.source : "none",
      hasSectorAnalysis: data.sector ? data.sector.source : "none",
      signalsCount: signals.length,
      pitchesCount: pitches.length,
    },
  }
}

export function buildClientSummaryPayload({
  companyId,
  form,
  data,
}: {
  companyId: string
  form: ClientSummaryFormState
  data: ClientIntelligenceData
}) {
  const { company, client, contacts, pitches, signals, presence } = data
  return {
    companyId,
    action: "client_summary",
    form,
    context: {
      companyName: company.name,
      sector: company.sector,
      aiScore: company.aiScore,
      contactsCount: contacts.length,
      hasClientAnalysis: client ? client.source : "none",
      hasSectorAnalysis: data.sector ? data.sector.source : "none",
      signalsCount: signals.length,
      pitchesCount: pitches.length,
      hasRoadmap: presence.hasRoadmap,
    },
  }
}

export function buildCampaignPayload({
  companyId,
  form,
  data,
}: {
  companyId: string
  form: CampaignFormState
  data: ClientIntelligenceData
}) {
  const { company, contacts } = data
  return {
    companyId,
    action: "campaign_generation",
    form,
    context: {
      companyName: company.name,
      sector: company.sector,
      contactsCount: contacts.length,
    },
  }
}

// ─── Statut Helpers ──────────────────────────────────────────────────────────

export function getAnalysisAvailabilityLabel(data: ClientIntelligenceData): {
  label: string
  tone: "success" | "warning" | "neutral"
} {
  const { client } = data
  if (!client) return { label: "Absente", tone: "neutral" }
  if (client.source === "engine") return { label: "Disponible", tone: "success" }
  return { label: "FOLIO", tone: "warning" }
}

export function getSectorAvailabilityLabel(data: ClientIntelligenceData): {
  label: string
  tone: "success" | "warning" | "neutral"
} {
  const { sector } = data
  if (!sector) return { label: "Absente", tone: "neutral" }
  if (sector.source === "engine") return { label: "Disponible", tone: "success" }
  return { label: "FOLIO", tone: "warning" }
}

export function getRoadmapAvailabilityLabel(data: ClientIntelligenceData): {
  label: string
  tone: "success" | "neutral"
} {
  const { presence } = data
  if (presence.hasRoadmap) return { label: "Disponible", tone: "success" }
  return { label: "Absente", tone: "neutral" }
}
