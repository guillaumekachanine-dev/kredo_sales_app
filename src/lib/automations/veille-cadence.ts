// Constantes de cadence de veille — module client-safe (aucun import Supabase).
// Extrait de automations-data.ts : un composant client qui importait ces
// constantes runtime depuis automations-data.ts tirait tout le module serveur
// (createClient → next/headers) dans le bundle client (échec de build Turbopack).

export type VeilleCadence = "weekly" | "twice_weekly" | "daily"

// Runs/mois par cadence de veille — 4.345 semaines/mois en moyenne (365.25/84).
export const VEILLE_RUNS_PER_MONTH: Record<VeilleCadence, number> = {
  weekly: 4.345,
  twice_weekly: 8.69,
  daily: 30.44,
}

export const VEILLE_CADENCE_LABELS: Record<VeilleCadence, string> = {
  weekly: "Hebdomadaire",
  twice_weekly: "Bi-hebdomadaire",
  daily: "Quotidienne",
}

export type VeilleSimulatorBaseline = {
  avgCostPerRun: number | null
  watchedAccountsCount: number
  cadenceBreakdown: { cadence: string; count: number }[]
  currentMonthlyCostEstimate: number | null
}
