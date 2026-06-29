import type {
  SectorActivationFreshnessBand,
  SectorActivationPriorityBand,
  SectorActivationSector,
  SectorActivationState,
  SectorActivationTemporalStatus,
  SectorActivationWindow,
} from "@/lib/prospection/sector-activation-types"
import type { PracticeKey, SectorStatus } from "@/types/sector"
import type { StatusPillVariant } from "@/components/ui/StatusPill"
import type { SurfaceCardAccent } from "@/components/ui/SurfaceCard"

export type CommercialWindowSortKey = "priority" | "deadline" | "exposure" | "sector"
export type SectorActivationHorizonFilter = "open" | "pipeline" | "all"

export const PRACTICE_LABELS: Record<PracticeKey, string> = {
  data_ai: "Data & AI",
  cloud_eng: "Cloud Eng",
  product: "Product",
  cyber: "Cyber",
}

export const TEMPORAL_STATUS_LABELS: Record<SectorActivationTemporalStatus, string> = {
  close: "Échéance proche",
  active: "Active",
  future: "Future",
  undated: "Non datée",
  expired: "Expirée",
}

export const FRESHNESS_LABELS: Record<SectorActivationFreshnessBand, string> = {
  hot: "Très fraîche",
  fresh: "Fraîche",
  stale: "Ancienne",
  future: "Date incohérente",
  undated: "Date inconnue",
}

export const PRIORITY_BAND_LABELS: Record<SectorActivationPriorityBand, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
}

export const SECTOR_STATUS_LABELS: Record<SectorStatus, string> = {
  active: "Actif",
  development: "En développement",
  watch: "Sous veille",
}

export const ACTIVATION_STATE_LABELS: Record<SectorActivationState, string> = {
  to_activate: "À activer",
  to_cover: "À couvrir",
  to_monitor: "À surveiller",
  data_insufficient: "Données insuffisantes",
}

export const HORIZON_OPTIONS: Array<{ value: SectorActivationHorizonFilter; label: string }> = [
  { value: "open", label: "Ouvert maintenant" },
  { value: "pipeline", label: "Hors expirées" },
  { value: "all", label: "Tout l'historique" },
]

export const WINDOW_SORT_OPTIONS: Array<{ value: CommercialWindowSortKey; label: string }> = [
  { value: "priority", label: "Priorité" },
  { value: "deadline", label: "Échéance" },
  { value: "exposure", label: "Exposition" },
  { value: "sector", label: "Secteur" },
]

export function getTemporalStatusVariant(status: SectorActivationTemporalStatus): StatusPillVariant {
  if (status === "close") return "warning"
  if (status === "active") return "success"
  if (status === "future") return "info"
  if (status === "expired") return "draft"
  return "neutral"
}

export function getPriorityBandVariant(band: SectorActivationPriorityBand): StatusPillVariant {
  if (band === "critical") return "danger"
  if (band === "high") return "warning"
  if (band === "medium") return "benchmark"
  return "neutral"
}

export function getActivationStateVariant(state: SectorActivationState): StatusPillVariant {
  if (state === "to_activate") return "benchmark"
  if (state === "to_cover") return "warning"
  if (state === "to_monitor") return "info"
  return "draft"
}

export function getActivationStateAccent(state: SectorActivationState): SurfaceCardAccent {
  if (state === "to_activate") return "brass"
  if (state === "to_cover") return "warning"
  if (state === "to_monitor") return "primary"
  return "none"
}

export function getFreshnessVariant(band: SectorActivationFreshnessBand): StatusPillVariant {
  if (band === "hot") return "benchmark"
  if (band === "fresh") return "info"
  if (band === "stale") return "draft"
  if (band === "future") return "warning"
  return "neutral"
}

export function getCoverageText(covered: number, total: number) {
  if (total === 0) return "Aucun compte relié"
  return `${covered} / ${total} comptes couverts`
}

export function getSectorCoverageContext(data: {
  linkedSectorAccounts: number
  totalAccounts: number
}) {
  if (data.totalAccounts === 0) return "0 / 0"
  return `${data.linkedSectorAccounts} / ${data.totalAccounts}`
}

export function describeActivationState(sector: SectorActivationSector) {
  if (sector.activationState === "to_activate") {
    return `${sector.openWindowCount} fenêtre${sector.openWindowCount > 1 ? "s" : ""} ouverte${sector.openWindowCount > 1 ? "s" : ""} avec couverture exploitable.`
  }
  if (sector.activationState === "to_cover") {
    return "Des signaux existent, mais la couverture comptes ou le reach reste insuffisant."
  }
  if (sector.activationState === "to_monitor") {
    return "Le secteur mérite une veille active avant prochaine ouverture commerciale."
  }
  return "Le secteur manque de couverture ou de signaux activables pour décider."
}

export function summarizeWhyNow(window: SectorActivationWindow) {
  if (window.temporalStatus === "close") {
    return "La fenêtre est courte: l'échéance est proche et le signal peut perdre sa valeur rapidement."
  }
  if (window.temporalStatus === "active") {
    return "Le signal est exploitable maintenant avec une fenêtre encore actionnable."
  }
  if (window.temporalStatus === "future") {
    return "Le signal est crédible mais demande une préparation avant ouverture."
  }
  if (window.temporalStatus === "expired") {
    return "La fenêtre est expirée. Elle reste utile pour la lecture sectorielle, pas pour l'activation immédiate."
  }
  return "Le signal est exploitable mais la date de conversion reste incomplète."
}

export function getWindowSortComparator(sort: CommercialWindowSortKey) {
  if (sort === "deadline") {
    return (left: SectorActivationWindow, right: SectorActivationWindow) => {
      const leftValue = Date.parse(left.deadlineAt ?? left.detectedAt ?? "")
      const rightValue = Date.parse(right.deadlineAt ?? right.detectedAt ?? "")
      const normalizedLeft = Number.isFinite(leftValue) ? leftValue : Number.MAX_SAFE_INTEGER
      const normalizedRight = Number.isFinite(rightValue) ? rightValue : Number.MAX_SAFE_INTEGER
      if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight
      return right.urgencyScore - left.urgencyScore
    }
  }

  if (sort === "exposure") {
    return (left: SectorActivationWindow, right: SectorActivationWindow) => {
      if (right.exposedAccountCount !== left.exposedAccountCount) {
        return right.exposedAccountCount - left.exposedAccountCount
      }
      return right.urgencyScore - left.urgencyScore
    }
  }

  if (sort === "sector") {
    return (left: SectorActivationWindow, right: SectorActivationWindow) => {
      const sectorDelta = left.sectorName.localeCompare(right.sectorName, "fr")
      if (sectorDelta !== 0) return sectorDelta
      return right.urgencyScore - left.urgencyScore
    }
  }

  return (left: SectorActivationWindow, right: SectorActivationWindow) => {
    if (right.urgencyScore !== left.urgencyScore) {
      return right.urgencyScore - left.urgencyScore
    }
    return left.title.localeCompare(right.title, "fr")
  }
}
