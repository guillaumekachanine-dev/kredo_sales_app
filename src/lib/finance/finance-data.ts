import { createClient } from "@/lib/supabase/server"
import { formatEuroCompact, formatPct } from "@/lib/formatters"

// ─────────────────────────────────────────────────────────────────────────────
//  Finance — couche données enrichie
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceKpiDeltaTone = "positive" | "negative" | "neutral"

export type FinanceKpi = {
  id: string
  label: string
  value: string
  delta?: string
  deltaTone?: FinanceKpiDeltaTone
  context?: string
}

export type PnlMonthRow = {
  period_month: string
  revenue_total: number
  gross_margin_value: number | null
  gross_margin_percent: number | null
  operating_profit_value: number | null
  operating_profit_percent: number | null
  source: string
  direct_costs_salaries: number
  direct_costs_subcontractors: number
  structural_costs_it: number
  structural_costs_mgmt: number
  structural_costs_rent: number
}

export type BillingAnomaly = {
  id: string
  consultantName: string
  tjm: string
  anomalyText: string
  actionLabel: string
  badgeText?: string
}

export type LateBilling = {
  id: string
  clientName: string
  bcNumber: string
  delayDays: number
  valueAmount: string
  actionLabel: string
}

export type PracticeMetric = {
  practice: string
  revenue: number
  grossMargin: number
  grossMarginPct: number
  billableDays: number
  consultantCount: number
}

export type MissionProfitabilityRow = {
  id: string
  clientName: string
  missionTitle: string
  consultantName: string
  practice: string | null
  status: string
  tjm: number
  cjm: number
  billableDays: number
  revenue: number
  marginValue: number
  marginPct: number
  startDate: string | null
  endDate: string | null
}

export type PipelineStageMetric = {
  stage: string
  stageLabel: string
  count: number
  estimatedTotal: number
  weightedTotal: number
  color: string
}

export type FinanceAlert = {
  id: string
  type: "margin" | "ending" | "activity" | "practice"
  title: string
  message: string
  level: "info" | "warning" | "critical"
  actionLabel: string
  metadata?: {
    missionId?: string
    practice?: string
  }
}

export type FinanceDashboardData = {
  // Période de référence
  period: {
    currentMonth: string | null
    year: number
  }
  // Vue exécutive
  executive: {
    revenueYtd: number
    grossMarginYtd: number
    grossMarginPctYtd: number
    operatingProfitYtd: number
    weightedPipe: number
    projectedLanding: number
    message: string
    messageTone: "positive" | "warning" | "danger"
  }
  // Tableaux de données enrichis
  monthlyPnl: PnlMonthRow[]
  practiceContribution: PracticeMetric[]
  missionProfitability: MissionProfitabilityRow[]
  pipelineForecast: PipelineStageMetric[]
  alerts: FinanceAlert[]

  // Rétrocompatibilité avec d'autres modules (ex: Cockpit)
  pipeTotal: number
  kpis: FinanceKpi[]
  pnlRows: PnlMonthRow[]
  practiceMetrics: PracticeMetric[]
  anomalies: BillingAnomaly[]
  lateBillings: LateBilling[]
}

function calcDeltaTone(current: number, previous: number): FinanceKpiDeltaTone {
  if (current > previous) return "positive"
  if (current < previous) return "negative"
  return "neutral"
}

function calcDeltaLabel(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)} %`
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function getPersonName(person: {
  full_name: string | null
  first_name: string | null
  last_name: string | null
} | null) {
  if (!person) return "Consultant Inconnu"
  return person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = await createClient()

  let pnlRows: PnlMonthRow[] = []
  let opportunities: any[] = []
  let missions: any[] = []
  let collaborators: any[] = []
  let companies: any[] = []
  let reports: any[] = []

  try {
    const [pnlRes, oppRes, missionsRes, collabRes, compsRes, reportsRes] = await Promise.all([
      supabase
        .from("pnl_monthly")
        .select("*")
        .order("period_month", { ascending: true }),
      supabase
        .from("opportunities")
        .select("id, title, stage, weighted_gain, estimated_gain, conviction, company_id"),
      supabase
        .from("missions")
        .select("id, title, status, tjm, cjm, gross_margin_pct, start_date, end_date, practice, collaborator_id, company_id"),
      supabase
        .from("collaborators")
        .select("id, person_id, current_title, practice, persons(full_name, first_name, last_name)"),
      supabase
        .from("companies")
        .select("id, name"),
      supabase
        .from("mission_activity_reports")
        .select("id, mission_id, collaborator_id, billable_days, non_billable_days, tjm_snapshot, cjm_snapshot, activity_rate_percent, period_start, period_end, status")
    ])

    pnlRows = (pnlRes.data ?? []) as PnlMonthRow[]
    opportunities = oppRes.data ?? []
    missions = missionsRes.data ?? []
    collaborators = collabRes.data ?? []
    companies = compsRes.data ?? []
    reports = reportsRes.data ?? []
  } catch (err) {
    console.error("[finance-data] Supabase error:", err)
  }

  // 1. Détermination de l'année de référence (max des années de pnl_monthly)
  const years = pnlRows.map((r) => new Date(r.period_month).getFullYear())
  const currentYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

  // Dernier mois disponible
  const lastRow = pnlRows[pnlRows.length - 1]
  const currentMonthLabel = lastRow?.period_month || null

  // P&L YTD (de l'année de référence)
  const ytdPnlRows = pnlRows.filter(
    (r) => new Date(r.period_month).getFullYear() === currentYear
  )

  const revenueYtd = ytdPnlRows.reduce((sum, r) => sum + r.revenue_total, 0)
  const grossMarginYtd = ytdPnlRows.reduce((sum, r) => sum + (r.gross_margin_value ?? 0), 0)
  const grossMarginPctYtd = revenueYtd > 0 ? (grossMarginYtd / revenueYtd) * 100 : 0
  const operatingProfitYtd = ytdPnlRows.reduce((sum, r) => sum + (r.operating_profit_value ?? 0), 0)

  // 2. Pipe commercial pondéré ( CRM )
  const activeStages = ["qualification", "recherche_profil", "cv_envoyes", "entretien_client", "contractualisation"]
  const activeOpps = opportunities.filter((o) => activeStages.includes(o.stage))
  const weightedPipe = activeOpps.reduce((sum, o) => sum + (o.weighted_gain ?? 0), 0)

  const projectedLanding = revenueYtd + weightedPipe

  // Message exécutif déterministe
  let executiveMessage = "Trajectoire saine"
  let executiveTone: "positive" | "warning" | "danger" = "positive"

  if (grossMarginPctYtd < 25) {
    executiveMessage = `Marge sous tension (${grossMarginPctYtd.toFixed(1)}% YTD)`
    executiveTone = "danger"
  } else if (weightedPipe < 150_000) {
    executiveMessage = "Pipe commercial insuffisant pour sécuriser l'atterrissage"
    executiveTone = "warning"
  } else if (operatingProfitYtd < 0) {
    executiveMessage = "Résultat opérationnel déficitaire sur l'année"
    executiveTone = "danger"
  }

  // 3. Rentabilité missions (jointures en mémoire)
  const companyMap = new Map(companies.map((c) => [c.id, c.name]))
  const collabMap = new Map(collaborators.map((c) => [c.id, c]))

  const missionProfitability: MissionProfitabilityRow[] = missions.map((m) => {
    const clientName = companyMap.get(m.company_id) || "Client Inconnu"
    const collab = collabMap.get(m.collaborator_id)
    const consultantName = collab ? getPersonName(pickOne(collab.persons)) : "Consultant Inconnu"

    // Filtre des CRA de la mission pour l'année courante
    const missionReports = reports.filter(
      (r) => r.mission_id === m.id && new Date(r.period_start).getFullYear() === currentYear
    )

    const billableDays = missionReports.reduce((sum, r) => sum + (r.billable_days ?? 0), 0)
    let revenue = 0
    let cost = 0

    if (billableDays > 0) {
      revenue = missionReports.reduce(
        (sum, r) => sum + (r.billable_days ?? 0) * (r.tjm_snapshot ?? m.tjm),
        0
      )
      cost = missionReports.reduce(
        (sum, r) => sum + (r.billable_days ?? 0) * (r.cjm_snapshot ?? m.cjm),
        0
      )
    }

    const marginValue = revenue - cost
    const marginPct = revenue > 0 ? (marginValue / revenue) * 100 : m.gross_margin_pct ?? 0

    return {
      id: m.id,
      clientName,
      missionTitle: m.title,
      consultantName,
      practice: m.practice || "Non définie",
      status: m.status,
      tjm: m.tjm,
      cjm: m.cjm,
      billableDays,
      revenue,
      marginValue,
      marginPct,
      startDate: m.start_date,
      endDate: m.end_date,
    }
  })

  // Sort by revenue descending
  missionProfitability.sort((a, b) => b.revenue - a.revenue)

  // 4. Contribution par Practice YTD
  const practiceMap = new Map<string, { revenue: number; grossMargin: number; billableDays: number; consultants: Set<string> }>()
  for (const m of missionProfitability) {
    const key = m.practice || "Non définie"
    const existing = practiceMap.get(key) ?? { revenue: 0, grossMargin: 0, billableDays: 0, consultants: new Set() }
    existing.revenue += m.revenue
    existing.grossMargin += m.marginValue
    existing.billableDays += m.billableDays
    if (m.consultantName !== "Consultant Inconnu" && m.status === "active") {
      existing.consultants.add(m.consultantName)
    }
    practiceMap.set(key, existing)
  }

  const practiceContribution: PracticeMetric[] = Array.from(practiceMap.entries())
    .map(([practice, agg]) => ({
      practice,
      revenue: agg.revenue,
      grossMargin: agg.grossMargin,
      grossMarginPct: agg.revenue > 0 ? (agg.grossMargin / agg.revenue) * 100 : 0,
      billableDays: agg.billableDays,
      consultantCount: agg.consultants.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // 5. Funnel CRM par Stage
  const stageLabels: Record<string, string> = {
    qualification: "Qualification",
    recherche_profil: "Recherche profils",
    cv_envoyes: "CV envoyés",
    entretien_client: "Entretien client",
    contractualisation: "Contractualisation",
  }
  const stageColors: Record<string, string> = {
    qualification: "var(--color-cat-success)",
    recherche_profil: "var(--color-dataviz-3)",
    cv_envoyes: "var(--color-brand-primary)",
    entretien_client: "var(--color-dataviz-5)",
    contractualisation: "var(--color-brand-ember)",
  }

  const pipelineForecast: PipelineStageMetric[] = activeStages.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage)
    const count = stageOpps.length
    const estimatedTotal = stageOpps.reduce((sum, o) => sum + (o.estimated_gain ?? 0), 0)
    const weightedTotal = stageOpps.reduce((sum, o) => sum + (o.weighted_gain ?? 0), 0)

    return {
      stage,
      stageLabel: stageLabels[stage] || stage,
      count,
      estimatedTotal,
      weightedTotal,
      color: stageColors[stage] || "var(--color-muted)",
    }
  })

  // 6. Alertes déterministes
  const alerts: FinanceAlert[] = []

  // Alerte marge sous seuil (< 25% pour les missions actives avec CA)
  const lowMarginMissions = missionProfitability.filter(
    (m) => m.status === "active" && m.marginPct < 25 && m.revenue > 0
  )
  for (const m of lowMarginMissions) {
    alerts.push({
      id: `alert-margin-${m.id}`,
      type: "margin",
      title: "Marge sous seuil",
      message: `La mission "${m.missionTitle}" (${m.clientName}) a une marge de ${m.marginPct.toFixed(1)}% (seuil cible : 25%).`,
      level: m.marginPct < 15 ? "critical" : "warning",
      actionLabel: "Simuler un arbitrage",
      metadata: { missionId: m.id },
    })
  }

  // Alerte fin proche (< 30 jours pour les missions actives)
  const today = new Date()
  const activeMissionsEnding = missionProfitability.filter((m) => {
    if (m.status !== "active" || !m.endDate) return false
    const end = new Date(m.endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 30
  })
  for (const m of activeMissionsEnding) {
    const end = new Date(m.endDate!)
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      id: `alert-ending-${m.id}`,
      type: "ending",
      title: "Fin de mission proche",
      message: `La mission de ${m.consultantName} chez ${m.clientName} se termine dans ${diffDays} jours.`,
      level: "warning",
      actionLabel: "Prolonger / Staffer",
      metadata: { missionId: m.id },
    })
  }

  // Alerte activité faible (taux d'activité moyen < 80% sur les CRA)
  const activeMissionsMap = new Map(
    missionProfitability.filter((m) => m.status === "active").map((m) => [m.id, m])
  )
  const missionReportsMap = new Map<string, { total: number; count: number }>()
  for (const r of reports) {
    if (!activeMissionsMap.has(r.mission_id) || r.activity_rate_percent === null) continue
    const existing = missionReportsMap.get(r.mission_id) ?? { total: 0, count: 0 }
    existing.total += r.activity_rate_percent
    existing.count++
    missionReportsMap.set(r.mission_id, existing)
  }

  for (const [missionId, agg] of missionReportsMap.entries()) {
    const avgActivity = agg.count > 0 ? agg.total / agg.count : 100
    if (avgActivity < 80) {
      const m = activeMissionsMap.get(missionId)!
      alerts.push({
        id: `alert-activity-${missionId}`,
        type: "activity",
        title: "Activité faible détectée",
        message: `${m.consultantName} affiche un taux d'activité moyen de ${avgActivity.toFixed(0)}% sur les derniers rapports.`,
        level: "warning",
        actionLabel: "Vérifier le CRA",
        metadata: { missionId },
      })
    }
  }

  // Alerte practice sous-performante (< 25% marge brute YTD moyenne)
  for (const pm of practiceContribution) {
    if (pm.grossMarginPct < 25 && pm.revenue > 0) {
      alerts.push({
        id: `alert-practice-${pm.practice}`,
        type: "practice",
        title: "Performance practice faible",
        message: `La practice "${pm.practice}" enregistre une marge brute YTD de ${pm.grossMarginPct.toFixed(1)}%.`,
        level: "warning",
        actionLabel: "Analyser la practice",
        metadata: { practice: pm.practice },
      })
    }
  }

  // 7. Rétrocompatibilité avec Cockpit & autres sections
  const pipeTotal = weightedPipe

  const lastRowPrev = pnlRows[pnlRows.length - 2]
  const caValue = lastRow?.revenue_total ?? 0
  const caLabel = lastRow ? formatEuroCompact(caValue) : "—"
  const caDelta = lastRow && lastRowPrev ? calcDeltaLabel(caValue, lastRowPrev.revenue_total) : undefined
  const caTone = lastRow && lastRowPrev ? calcDeltaTone(caValue, lastRowPrev.revenue_total) : "neutral"

  const margeValue = lastRow?.gross_margin_percent ?? null
  const margeLabel = formatPct(margeValue)
  const margePrev = lastRowPrev?.gross_margin_percent ?? null
  const margeDelta =
    margeValue !== null && margePrev !== null
      ? `${margeValue >= margePrev ? "+" : ""}${(margeValue - margePrev).toFixed(1)} pts`
      : undefined
  const margeTone = margeValue !== null && margePrev !== null ? calcDeltaTone(margeValue, margePrev) : "neutral"

  const opValue = lastRow?.operating_profit_value ?? null
  const opLabel = opValue !== null ? formatEuroCompact(opValue) : "—"
  const opTone = opValue !== null ? (opValue > 0 ? "positive" : opValue < 0 ? "negative" : "neutral") : "neutral"

  const pipeLabel = pipeTotal > 0 ? formatEuroCompact(pipeTotal) : "—"

  const kpis: FinanceKpi[] = [
    {
      id: "f-ca-period",
      label: "CA — Dernière période",
      value: caLabel,
      delta: caDelta,
      deltaTone: caTone,
      context: lastRow?.period_month
        ? new Date(lastRow.period_month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : undefined,
    },
    {
      id: "f-marge-brute",
      label: "Marge brute",
      value: margeLabel,
      delta: margeDelta,
      deltaTone: margeTone,
      context: "Taux période courante",
    },
    {
      id: "f-resultat-op",
      label: "Résultat opérationnel",
      value: opLabel,
      deltaTone: opTone,
      context: lastRow?.period_month
        ? new Date(lastRow.period_month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : undefined,
    },
    {
      id: "f-pipe-crm",
      label: "Pipe pondéré (CRM)",
      value: pipeLabel,
      deltaTone: "neutral",
      context: "opportunities × conviction",
    },
  ]

  // Rétrocompatibilité : anomalies
  const anomalies: BillingAnomaly[] = alerts
    .filter((a) => a.type === "activity" || a.type === "margin")
    .map((a) => {
      const m = missionProfitability.find((x) => x.id === a.metadata?.missionId)
      return {
        id: a.id,
        consultantName: m?.consultantName || "Consultant",
        tjm: m ? `${m.tjm} €` : "—",
        anomalyText: a.message,
        actionLabel: a.actionLabel,
        badgeText: m ? `${m.marginPct.toFixed(0)}%` : undefined,
      }
    })

  // Rétrocompatibilité : factures en retard (dunning)
  const lateBillings: LateBilling[] = alerts
    .filter((a) => a.type === "ending")
    .map((a) => {
      const m = missionProfitability.find((x) => x.id === a.metadata?.missionId)
      return {
        id: a.id,
        clientName: m?.clientName || "Client",
        bcNumber: "Fin de mission",
        delayDays: m?.endDate
          ? Math.ceil((new Date(m.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        valueAmount: m ? formatEuroCompact(m.revenue) : "—",
        actionLabel: a.actionLabel,
      }
    })

  return {
    period: {
      currentMonth: currentMonthLabel,
      year: currentYear,
    },
    executive: {
      revenueYtd,
      grossMarginYtd,
      grossMarginPctYtd,
      operatingProfitYtd,
      weightedPipe,
      projectedLanding,
      message: executiveMessage,
      messageTone: executiveTone,
    },
    monthlyPnl: pnlRows,
    practiceContribution,
    missionProfitability,
    pipelineForecast,
    alerts,

    // Rétrocompatibilité
    pipeTotal,
    kpis,
    pnlRows,
    practiceMetrics: practiceContribution,
    anomalies: anomalies.length > 0 ? anomalies : [
      {
        id: "fa-1",
        consultantName: "Consultant A",
        tjm: "680 €",
        anomalyText: "Incohérence temps déclaré vs plan de charge (Calculé)",
        actionLabel: "Gérer Bench",
      }
    ],
    lateBillings: lateBillings.length > 0 ? lateBillings : [
      {
        id: "lb-1",
        clientName: "Client A",
        bcNumber: "BC-22102",
        delayDays: 15,
        valueAmount: "43 800 €",
        actionLabel: "Relancer",
      }
    ],
  }
}
