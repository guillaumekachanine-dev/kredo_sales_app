import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

// ADR-0012 — Chaîne de décision commerciale.
// Le processus devient : Connaissance compte → Intelligence sectorielle →
// Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale.
// Le Scoring N'EST PLUS une étape : c'est une capacité transverse (badge header
// + modale, ADR-0011). Cf. docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md
export type TabKey =
  | "accueil"
  | "connaissance"
  | "secteur"
  | "enjeux"
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
    key: "connaissance",
    label: "Connaissance compte",
    shortLabel: "Compte",
    description: "Réunir ce que l'on sait factuellement du compte : identité, organisation, interlocuteurs, relation et signaux propres.",
  },
  {
    key: "secteur",
    label: "Intelligence sectorielle",
    shortLabel: "Secteur",
    description: "Lire les enjeux, contraintes et fenêtres commerciales du secteur, mutualisés et contextualisés pour ce compte.",
  },
  {
    key: "enjeux",
    label: "Cartographie des enjeux",
    shortLabel: "Enjeux",
    description: "Transformer les constats en enjeux priorisés, sourcés et actionnables par KREDO.",
  },
  {
    key: "strategie",
    label: "Stratégie commerciale",
    shortLabel: "Stratégie",
    description: "Relier enjeux et offres KREDO en angles d'approche, messages clés et pitchs ciblés.",
  },
  {
    key: "roadmap",
    label: "Roadmap commerciale",
    shortLabel: "Roadmap",
    description: "Convertir la stratégie en actions cadencées, validées par le manager puis matérialisées dans l'agenda.",
  },
]

export function getProcessStepStatus(stepKey: ProcessStepKey, data: ClientIntelligenceData): {
  label: string
  tone: "success" | "warning" | "neutral"
} {
  switch (stepKey) {
    case "connaissance": {
      // ADR-0012 Lot 2 : `client` (FOLIO) et `accountKnowledge` (moteur) sont
      // deux champs distincts depuis Lot 2 — plus jamais client.source==="engine".
      const hasEngine = data.accountKnowledge !== null
      const hasFolio = data.client?.source === "folio"
      if (hasEngine) {
        return { label: "Disponible", tone: "success" }
      }
      if (hasFolio) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À compléter", tone: "neutral" }
    }
    case "secteur": {
      const hasEngine = data.sector?.source === "engine"
      const hasFolio = data.sector?.source === "folio"
      if (hasEngine) {
        return { label: "Disponible", tone: "success" }
      }
      if (hasFolio) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À venir", tone: "neutral" }
    }
    case "enjeux":
      if (data.presence.hasProcessDiagnostic) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
    case "strategie":
      if ((data.pitchDocuments && data.pitchDocuments.length > 0) || (data.pitches && data.pitches.length > 0)) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
    case "roadmap":
      if (data.presence.hasRoadmap) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
  }
}
