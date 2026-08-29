// ─────────────────────────────────────────────────────────────────────────────
//  Vue « Activité & congés » du shell Engagements (Desktop, Phase 2).
//
//  Surface analytique transverse : productivité CRA des collaborateurs en
//  mission AT, fermetures de sites clients, écart marge théorique / marge réelle
//  (snapshots CRA), impact des absences non prévues.
//
//  Périmètre data volontairement restreint (cf. HANDOFF §7 / §15) :
//   • missions AT actives + leurs CRA (`mission_activity_reports`)
//   • fermetures clients (`client_closures`)
//   • JAMAIS `collaborator_compensation` ni la table `collaborator_absences` —
//     la seule donnée d'absence imprévue exploitée est `sick_days` du CRA, seule
//     à porter des snapshots TJM/CJM permettant une estimation d'impact.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Sources brutes (mappées depuis Supabase par le loader) ──────────────────

export interface ActivityMissionSource {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  companyId: string | null
  companyName: string
  /** Collaborateur affecté à la mission — `null` si aucun. */
  collaboratorName: string | null
  /** `missions.gross_margin_pct` — colonne générée, jamais recalculée ici. */
  grossMarginPct: number | null
  tjm: number
  cjm: number
}

export interface ActivityReportSource {
  id: string
  missionId: string
  periodStart: string
  periodEnd: string
  status: string
  billableDays: number
  businessDays: number
  ptoDays: number
  sickDays: number
  nonBillableDays: number
  activityRatePercent: number | null
  tjmSnapshot: number
  cjmSnapshot: number
}

export interface ActivityClosureSource {
  id: string
  companyId: string | null
  companyName: string
  label: string
  startDate: string
  endDate: string
  isRecurring: boolean
}

export interface EngagementsActivitySources {
  now: Date
  issues: string[]
  missions: ActivityMissionSource[]
  reports: ActivityReportSource[]
  closures: ActivityClosureSource[]
}

// ─── View-model (produit par buildEngagementsActivityAnalytics) ──────────────

export interface ProductivityMonthPoint {
  monthIndex: number
  label: string
  /** Moyenne simple des `activity_rate_percent` non nuls du mois, ou null. */
  rate: number | null
  billableDays: number
  ptoDays: number
  sickDays: number
  nonBillableDays: number
  craCount: number
  isFuture: boolean
}

export interface ClosureItem {
  id: string
  companyName: string
  label: string
  startDate: string
  endDate: string
  isRecurring: boolean
  isSingleDay: boolean
  isPast: boolean
}

export interface MarginRealityItem {
  missionId: string
  title: string
  companyName: string
  /** Collaborateur affecté à la mission — `null` si aucun. */
  collaboratorName: string | null
  theoreticalPct: number
  realPct: number
  gapPoints: number
  billableDays: number
}

export interface UnplannedAbsenceMonthPoint {
  monthIndex: number
  label: string
  days: number
  lostRevenue: number
  lostMargin: number
}

export interface UnplannedAbsenceMissionImpact {
  missionId: string
  title: string
  companyName: string
  days: number
  lostRevenue: number
  lostMargin: number
}

export interface EngagementsActivityAnalytics {
  year: number
  generatedAt: string
  status: "complete" | "partial"
  issues: string[]
  productivity: {
    ytdAverageRate: number | null
    targetRate: number
    monthly: ProductivityMonthPoint[]
  }
  closures: ClosureItem[]
  marginReality: {
    theoreticalAvg: number | null
    realAvg: number | null
    gapAvg: number | null
    items: MarginRealityItem[]
  }
  unplannedAbsences: {
    totalDays: number
    estimatedLostRevenue: number
    estimatedLostMargin: number
    monthly: UnplannedAbsenceMonthPoint[]
    topMissions: UnplannedAbsenceMissionImpact[]
  }
}
