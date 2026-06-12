import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

export type TabKey =
  | "accueil"
  | "analyses"
  | "enjeux"
  | "scoring"
  | "strategie"
  | "roadmap"

export type ProcessStepKey = Exclude<TabKey, "accueil">

export const INTELLIGENCE_PROCESS_STEPS: {
  key: ProcessStepKey
  label: string
  shortLabel: string
  description: string
}[] = [
  {
    key: "analyses",
    label: "Analyses",
    shortLabel: "Analyser",
    description: "Comprendre le compte, son secteur, ses signaux et son contexte business.",
  },
  {
    key: "enjeux",
    label: "Cartographie des enjeux",
    shortLabel: "Enjeux",
    description: "Transformer les constats en problématiques client et zones de création de valeur.",
  },
  {
    key: "scoring",
    label: "Scoring",
    shortLabel: "Scoring",
    description: "Prioriser le compte avec un score expliqué et exploitable commercialement.",
  },
  {
    key: "strategie",
    label: "Stratégie commerciale",
    shortLabel: "Stratégie",
    description: "Définir l’angle d’approche, les messages clés et les interlocuteurs prioritaires.",
  },
  {
    key: "roadmap",
    label: "Roadmap commerciale",
    shortLabel: "Roadmap",
    description: "Convertir la stratégie en prochaines actions, jalons et relances.",
  },
]

export function getProcessStepStatus(stepKey: ProcessStepKey, data: ClientIntelligenceData): {
  label: string
  tone: "success" | "warning" | "neutral"
} {
  switch (stepKey) {
    case "analyses": {
      const hasEngine = (data.client && data.client.source === "engine") || (data.sector && data.sector.source === "engine")
      const hasFolio = (data.client && data.client.source === "folio") || (data.sector && data.sector.source === "folio")
      if (hasEngine) {
        return { label: "Disponible", tone: "success" }
      }
      if (hasFolio) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À compléter", tone: "neutral" }
    }
    case "enjeux":
      if (data.presence.hasProcessDiagnostic) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
    case "scoring":
      if (data.company.aiScore !== null) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À compléter", tone: "neutral" }
    case "strategie":
      if (data.pitches && data.pitches.length > 0) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À venir", tone: "neutral" }
    case "roadmap":
      if (data.presence.hasRoadmap) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
  }
}
