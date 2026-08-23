// Constantes du simulateur de cadence — module client-safe (aucun import Supabase).
// Le nom de fichier est conservé pour éviter un refactor cosmétique des imports
// existants ; les types ci-dessous couvrent désormais tous les workflows actifs.

export type VeilleCadence = "monthly" | "weekly" | "twice_weekly" | "daily"

// Runs/mois par cadence — 4.345 semaines/mois en moyenne (365.25/84).
export const VEILLE_RUNS_PER_MONTH: Record<VeilleCadence, number> = {
  monthly: 1,
  weekly: 4.345,
  twice_weekly: 8.69,
  daily: 30.44,
}

export const VEILLE_CADENCE_LABELS: Record<VeilleCadence, string> = {
  monthly: "Mensuelle",
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

export type CadenceSimulatorWorkflow = {
  runType: string
  label: string
  runs30d: number
  avgCost30d: number | null
  totalCost30d: number | null
  hasPricingGap: boolean
  hasTokensGap: boolean
}

export type CadenceSimulatorLoadResult =
  | { ok: true; workflows: CadenceSimulatorWorkflow[] }
  | { ok: false; error: string }
