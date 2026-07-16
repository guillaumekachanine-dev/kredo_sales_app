import type { MatchingNeed, MatchingProfile, RawMatchComponent } from "../types"

const MS_PER_DAY = 1000 * 60 * 60 * 24

// C4 — Disponibilité. Compare la date de disponibilité du profil (candidat :
// available_from ; collaborateur : fin de mission active ou aujourd'hui si
// intercontrat) à la date de démarrage du besoin. Dispo avant le démarrage = 100 ;
// au-delà, dégradation par jours de décalage. Sans date de démarrage, on note la
// proximité de disponibilité seule. Non applicable si aucune date de dispo connue.
export function computeAvailabilityFit(need: MatchingNeed, profile: MatchingProfile): RawMatchComponent {
  const base = {
    componentKey: "C4_availability" as const,
    componentLabel: "Disponibilité",
    evidenceRefs: [{ table: profile.sourceType === "candidate" ? "candidates" : "missions", id: profile.sourceId }],
  }

  const availableFrom = parseDateOnly(profile.availableFrom)
  if (!availableFrom) {
    return {
      ...base,
      applicable: false,
      normalizedScore: 0,
      confidence: 0,
      explanation: "Date de disponibilité inconnue — critère non évalué.",
      positives: [],
      negatives: [],
    }
  }

  const availLabel = formatDate(profile.availableFrom)
  const startDate = parseDateOnly(need.startDate)

  // Pas de date de démarrage : on récompense une disponibilité proche.
  if (!startDate) {
    const daysFromNow = Math.round((availableFrom.getTime() - Date.now()) / MS_PER_DAY)
    const normalizedScore = daysFromNow <= 0 ? 100 : Math.max(30, Math.round(100 - daysFromNow * 0.8))
    return {
      ...base,
      applicable: true,
      normalizedScore,
      confidence: 60,
      explanation: `Disponible ${availLabel}, aucune date de démarrage sur le besoin.`,
      positives: daysFromNow <= 30 ? [`Disponibilité proche (${availLabel}).`] : [],
      negatives: daysFromNow > 60 ? [`Disponibilité lointaine (${availLabel}).`] : [],
    }
  }

  const gapDays = Math.round((availableFrom.getTime() - startDate.getTime()) / MS_PER_DAY)
  if (gapDays <= 0) {
    return {
      ...base,
      applicable: true,
      normalizedScore: 100,
      confidence: 80,
      explanation: `Disponible ${availLabel}, avant le démarrage ${formatDate(need.startDate)}.`,
      positives: [`Disponible avant le démarrage (${availLabel}).`],
      negatives: [],
    }
  }

  const normalizedScore = Math.max(0, Math.round(100 - gapDays * 1.5))
  return {
    ...base,
    applicable: true,
    normalizedScore,
    confidence: 80,
    explanation: `Disponible ${availLabel}, soit ${gapDays} j après le démarrage souhaité (${formatDate(need.startDate)}).`,
    positives: [],
    negatives: [`Disponibilité ${gapDays} j après le démarrage souhaité.`],
  }
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null
  const parts = value.slice(0, 10).split("-")
  if (parts.length !== 3) return null
  const [y, m, d] = parts.map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function formatDate(value: string | null): string {
  const parsed = parseDateOnly(value)
  if (!parsed) return "—"
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}
