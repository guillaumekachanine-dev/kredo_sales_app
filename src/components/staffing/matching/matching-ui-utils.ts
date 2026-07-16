import type { StatusPillVariant } from "@/components/ui/StatusPill"
import type { MatchTier, ProfileMatchResult } from "@/lib/staffing-matching/types"

export const TIER_LABELS: Record<MatchTier, string> = {
  strong: "Match fort",
  moderate: "Match correct",
  weak: "Match faible",
  insufficient_data: "Données insuffisantes",
}

export const TIER_TONES: Record<MatchTier, StatusPillVariant> = {
  strong: "success",
  moderate: "info",
  weak: "warning",
  insufficient_data: "neutral",
}

export function profileSourceKey(profile: Pick<ProfileMatchResult, "sourceType" | "sourceId">): string {
  return `${profile.sourceType}:${profile.sourceId}`
}

export function formatAvailability(availableFrom: string | null): string {
  if (!availableFrom) return "Disponibilité inconnue"
  const parsed = new Date(`${availableFrom.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return "Disponibilité inconnue"
  const isPastOrToday = parsed.getTime() <= Date.now()
  const formatted = parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
  return isPastOrToday ? `Disponible (dep. ${formatted})` : `Disponible le ${formatted}`
}

export function sourceTypeLabel(sourceType: ProfileMatchResult["sourceType"]): string {
  return sourceType === "candidate" ? "Candidat" : "Collaborateur"
}
