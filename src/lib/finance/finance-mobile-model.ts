import {
  OFFER_PRACTICE_SLUGS,
  type OfferPracticeSlug,
} from "@/lib/config/practices"

export type FinanceDistribution = {
  totalAmount: number
  attributedAmount: number
  unassignedAmount: number
  items: Array<{
    id: string
    label: string
    amount: number
    sharePct: number
  }>
}

export type FinanceQuarterAmount = {
  actual: number
  projected: number
}

export type FinanceMobileDashboardData = {
  period: {
    fiscalYear: number
    actualThrough: string | null
    currency: "EUR"
  }
  objectives: {
    annualRevenue: number | null
    grossMarginPct: number | null
  }
  summary: {
    actualRevenue: number
    actualGrossMarginPct: number | null
    projectedLanding: number
    gapToTarget: number | null
    coveragePct: number | null
  }
  revenueByMonth: Array<{
    month: string
    actual: number | null
    projected: number | null
    target: number | null
    grossMarginPct: number | null
    source: "pnl" | "secured-production" | "budget" | "forecast"
  }>
  forecast: {
    securedProduction: number
    pipelineGross: number
    pipelineWeighted: number
  }
  distributions: {
    clients: FinanceDistribution
    practices: FinanceDistribution
    engagements: FinanceDistribution
  }
  productionByClient: Array<{
    clientId: string | null
    clientName: string
    quarters: {
      q1: FinanceQuarterAmount
      q2: FinanceQuarterAmount
      q3: FinanceQuarterAmount
      q4: FinanceQuarterAmount
    }
  }>
  risksAndGaps: Array<{
    id: string
    kind:
      | "target-gap"
      | "margin"
      | "activity"
      | "mission-ending"
      | "unassigned"
      | "missing-projection"
    severity: "info" | "warning" | "critical"
    title: string
    detail: string
    amount?: number
    context?: {
      missionId?: string
      clientId?: string
      practiceSlug?: string
      month?: string
    }
  }>
}

export type FinanceMobilePlanRow = {
  id: string
  fiscal_year: number
  period_start: string
  period_end: string
  currency: string
  status: string
  updated_at: string
}

export type FinanceMobileCriterionRow = {
  plan_id: string
  code: string
  target_value: number
}

export type FinanceMobilePnlRow = {
  period_month: string
  revenue_total: number
  gross_margin_value: number | null
  source: string
}

export type FinanceMobileActivityReportRow = {
  id: string
  mission_id: string
  period_start: string
  billable_days: number
  tjm_snapshot: number
  activity_rate_percent: number | null
  status: string
}

export type FinanceMobileMissionRow = {
  id: string
  title: string
  company_id: string | null
  opportunity_id: string | null
  practice: string | null
  status: string
  start_date: string | null
  end_date: string | null
  gross_margin_pct: number | null
}

export type FinanceMobileOpportunityRow = {
  id: string
  company_id: string | null
  opportunity_type: string | null
  practice: string | null
  stage: string
  estimated_gain: number | null
  weighted_gain: number | null
  start_date: string | null
  target_close_date: string | null
}

export type FinanceMobileCompanyRow = {
  id: string
  name: string
}

export type FinanceMobilePracticeRow = {
  slug: string
  name: string
  is_active: boolean
}

export type FinanceMobileEngagementTypeRow = {
  slug: string
  name: string
  billing_model: string
  is_active: boolean
}

export type FinanceMobileModelInput = {
  fiscalYear: number
  asOfDate: string
  plans: FinanceMobilePlanRow[]
  criteria: FinanceMobileCriterionRow[]
  pnl: FinanceMobilePnlRow[]
  activityReports: FinanceMobileActivityReportRow[]
  missions: FinanceMobileMissionRow[]
  opportunities: FinanceMobileOpportunityRow[]
  companies: FinanceMobileCompanyRow[]
  practices: FinanceMobilePracticeRow[]
  engagementTypes: FinanceMobileEngagementTypeRow[]
}

type Allocation = {
  id: string | null
  label: string | null
  amount: number
}

type ProductionAccumulator = {
  clientId: string | null
  clientName: string
  quarters: {
    q1: FinanceQuarterAmount
    q2: FinanceQuarterAmount
    q3: FinanceQuarterAmount
    q4: FinanceQuarterAmount
  }
}

const PNL_ACTUAL_SOURCES = new Set(["actual", "cra_derived", "import"])

const OPEN_PIPELINE_STAGES = new Set([
  "qualification",
  "recherche_profil",
  "cv_envoyes",
  "entretien_client",
  "contractualisation",
  "detection",
  "besoin_confirme",
  "negociation",
])

// Mapping canonique déjà appliqué par les RPC Cockpit
// (052_commercial_strategy_context_rpc et ses prédécesseurs).
const COCKPIT_MISSION_PRACTICE_MAP: Readonly<Record<string, OfferPracticeSlug>> = {
  cloud: "cloud-engineering",
  cybersecurity: "cybersecurity",
  data: "data-ai",
  design: "digital-experience",
  digital: "digital-business-solutions",
  mobile: "digital-experience",
  "product management": "digital-experience",
  "project management": "project-agile-delivery",
  qa: "quality-engineering-testing",
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundPct(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function amount(value: number | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function monthKey(value: string): string {
  return `${value.slice(0, 7)}-01`
}

function normalizeLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function getQuarter(month: string): "q1" | "q2" | "q3" | "q4" {
  const monthNumber = Number(month.slice(5, 7))
  if (monthNumber <= 3) return "q1"
  if (monthNumber <= 6) return "q2"
  if (monthNumber <= 9) return "q3"
  return "q4"
}

function emptyQuarters(): ProductionAccumulator["quarters"] {
  return {
    q1: { actual: 0, projected: 0 },
    q2: { actual: 0, projected: 0 },
    q3: { actual: 0, projected: 0 },
    q4: { actual: 0, projected: 0 },
  }
}

function isDateInFiscalYear(value: string | null, fiscalYear: number): boolean {
  return value?.slice(0, 4) === String(fiscalYear)
}

function isOpenFiscalOpportunity(
  opportunity: FinanceMobileOpportunityRow,
  fiscalYear: number,
): boolean {
  if (!OPEN_PIPELINE_STAGES.has(opportunity.stage)) return false
  const forecastDate = opportunity.start_date ?? opportunity.target_close_date
  return isDateInFiscalYear(forecastDate, fiscalYear)
}

function resolvePlan(input: FinanceMobileModelInput): FinanceMobilePlanRow | null {
  return (
    input.plans
      .filter((plan) => plan.fiscal_year === input.fiscalYear && plan.status === "active")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
  )
}

function resolveObjective(
  criteria: FinanceMobileCriterionRow[],
  planId: string | undefined,
  code: string,
): number | null {
  if (!planId) return null
  const criterion = criteria.find(
    (item) => item.plan_id === planId && item.code === code,
  )
  return criterion ? amount(criterion.target_value) : null
}

function buildDistribution(
  totalAmount: number,
  allocations: Allocation[],
): FinanceDistribution {
  const grouped = new Map<string, { label: string; amount: number }>()

  for (const allocation of allocations) {
    if (!allocation.id || !allocation.label || allocation.amount <= 0) continue
    const current = grouped.get(allocation.id)
    grouped.set(allocation.id, {
      label: allocation.label,
      amount: (current?.amount ?? 0) + allocation.amount,
    })
  }

  const attributedAmount = roundMoney(
    [...grouped.values()].reduce((sum, item) => sum + item.amount, 0),
  )
  const reconciledTotal = roundMoney(totalAmount)
  const unassignedAmount = roundMoney(
    Math.max(0, reconciledTotal - attributedAmount),
  )
  const denominator = reconciledTotal > 0 ? reconciledTotal : 1

  const items = [...grouped.entries()]
    .map(([id, item]) => ({
      id,
      label: item.label,
      amount: roundMoney(item.amount),
      sharePct: roundPct((item.amount / denominator) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)

  items.push({
    id: "non-attribue",
    label: "Non attribué",
    amount: unassignedAmount,
    sharePct: roundPct((unassignedAmount / denominator) * 100),
  })

  return {
    totalAmount: reconciledTotal,
    attributedAmount,
    unassignedAmount,
    items,
  }
}

export function normalizeFinancePractice(
  value: string | null | undefined,
  practices: FinanceMobilePracticeRow[],
): OfferPracticeSlug | null {
  if (!value) return null

  const activeCatalog = practices.filter(
    (practice) =>
      practice.is_active &&
      OFFER_PRACTICE_SLUGS.includes(practice.slug as OfferPracticeSlug),
  )
  const normalizedValue = normalizeLookup(value)
  const catalogMatch = activeCatalog.find(
    (practice) =>
      normalizeLookup(practice.slug) === normalizedValue ||
      normalizeLookup(practice.name) === normalizedValue,
  )

  if (catalogMatch) return catalogMatch.slug as OfferPracticeSlug

  const rpcMappedSlug = COCKPIT_MISSION_PRACTICE_MAP[normalizedValue]
  return rpcMappedSlug && activeCatalog.some((practice) => practice.slug === rpcMappedSlug)
    ? rpcMappedSlug
    : null
}

export function normalizeFinanceEngagement(
  opportunityType: string | null | undefined,
  engagementTypes: FinanceMobileEngagementTypeRow[],
): "assistance_technique" | "forfait" | null {
  if (!opportunityType) return null

  const activeSlugs = new Set(
    engagementTypes
      .filter((engagement) => engagement.is_active)
      .map((engagement) => engagement.slug),
  )
  const normalized = normalizeLookup(opportunityType).replace(/ /g, "_")

  if (
    (normalized === "regie" && activeSlugs.has("regie")) ||
    (normalized === "staffing" && activeSlugs.has("regie")) ||
    (normalized === "centre_competences" && activeSlugs.has("centre_competences")) ||
    (normalized === "centre_de_service" && activeSlugs.has("centre_competences"))
  ) {
    return "assistance_technique"
  }

  if (
    ["forfait", "conseil", "audit"].includes(normalized) &&
    activeSlugs.has(normalized)
  ) {
    return "forfait"
  }

  return null
}

export function buildFinanceMobileDashboardData(
  input: FinanceMobileModelInput,
): FinanceMobileDashboardData {
  const plan = resolvePlan(input)
  if (plan && plan.currency !== "EUR") {
    throw new Error(`Devise Finance mobile non supportée : ${plan.currency}`)
  }

  const annualRevenueTarget = resolveObjective(
    input.criteria,
    plan?.id,
    "billed_revenue",
  )
  const grossMarginTargetPct = resolveObjective(
    input.criteria,
    plan?.id,
    "gross_margin_pct",
  )
  const yearPrefix = `${input.fiscalYear}-`
  const asOfMonth = monthKey(input.asOfDate)
  const fiscalPnl = input.pnl.filter((row) => row.period_month.startsWith(yearPrefix))
  const actualPnl = fiscalPnl.filter(
    (row) =>
      PNL_ACTUAL_SOURCES.has(row.source) && monthKey(row.period_month) <= asOfMonth,
  )
  const actualThrough =
    actualPnl
      .map((row) => monthKey(row.period_month))
      .sort((a, b) => b.localeCompare(a))[0] ?? null

  const actualRows = actualThrough
    ? actualPnl.filter((row) => monthKey(row.period_month) <= actualThrough)
    : []
  const actualRevenue = roundMoney(
    actualRows.reduce((sum, row) => sum + amount(row.revenue_total), 0),
  )
  const actualGrossMargin = roundMoney(
    actualRows.reduce((sum, row) => sum + amount(row.gross_margin_value), 0),
  )
  const actualGrossMarginPct =
    actualRevenue > 0 ? roundPct((actualGrossMargin / actualRevenue) * 100) : null

  const missionById = new Map(input.missions.map((mission) => [mission.id, mission]))
  const opportunityById = new Map(
    input.opportunities.map((opportunity) => [opportunity.id, opportunity]),
  )
  const companyById = new Map(input.companies.map((company) => [company.id, company]))
  const validatedReports = input.activityReports.filter(
    (report) =>
      report.status === "validated" && report.period_start.startsWith(yearPrefix),
  )
  const futureReports = actualThrough
    ? validatedReports.filter((report) => monthKey(report.period_start) > actualThrough)
    : []
  const securedProduction = roundMoney(
    futureReports.reduce(
      (sum, report) => sum + amount(report.billable_days) * amount(report.tjm_snapshot),
      0,
    ),
  )

  const openPipeline = input.opportunities.filter((opportunity) =>
    isOpenFiscalOpportunity(opportunity, input.fiscalYear),
  )
  const pipelineGross = roundMoney(
    openPipeline.reduce((sum, opportunity) => sum + amount(opportunity.estimated_gain), 0),
  )
  const pipelineWeighted = roundMoney(
    openPipeline.reduce((sum, opportunity) => sum + amount(opportunity.weighted_gain), 0),
  )
  const projectedLanding = roundMoney(
    actualRevenue + securedProduction + pipelineWeighted,
  )
  const gapToTarget =
    annualRevenueTarget === null
      ? null
      : roundMoney(projectedLanding - annualRevenueTarget)
  const coveragePct =
    annualRevenueTarget && annualRevenueTarget > 0
      ? roundPct((projectedLanding / annualRevenueTarget) * 100)
      : null

  const monthTargets = annualRevenueTarget === null ? null : annualRevenueTarget / 12
  const revenueByMonth: FinanceMobileDashboardData["revenueByMonth"] = Array.from(
    { length: 12 },
    (_, index) => {
      const month = `${input.fiscalYear}-${String(index + 1).padStart(2, "0")}-01`
      const pnlRows = fiscalPnl.filter((row) => monthKey(row.period_month) === month)
      const actualRowAmount =
        actualThrough && month <= actualThrough
          ? pnlRows
              .filter((row) => PNL_ACTUAL_SOURCES.has(row.source))
              .reduce((sum, row) => sum + amount(row.revenue_total), 0)
          : null
      const actualGrossMarginAmount =
        actualThrough && month <= actualThrough
          ? pnlRows
              .filter((row) => PNL_ACTUAL_SOURCES.has(row.source))
              .reduce((sum, row) => sum + amount(row.gross_margin_value), 0)
          : null
      const securedMonth = futureReports
        .filter((report) => monthKey(report.period_start) === month)
        .reduce(
          (sum, report) => sum + amount(report.billable_days) * amount(report.tjm_snapshot),
          0,
        )
      const forecastPnl = pnlRows.find((row) => row.source === "forecast")
      const budgetPnl = pnlRows.find((row) => row.source === "budget")

      let projected: number | null = null
      let source: FinanceMobileDashboardData["revenueByMonth"][number]["source"] = "pnl"

      if (!actualThrough || month > actualThrough) {
        if (securedMonth > 0) {
          projected = roundMoney(securedMonth)
          source = "secured-production"
        } else if (forecastPnl) {
          projected = roundMoney(amount(forecastPnl.revenue_total))
          source = "forecast"
        } else if (budgetPnl) {
          projected = roundMoney(amount(budgetPnl.revenue_total))
          source = "budget"
        } else {
          projected = 0
          source = "secured-production"
        }
      }

      return {
        month,
        actual: actualRowAmount === null ? null : roundMoney(actualRowAmount),
        projected,
        target: monthTargets === null ? null : roundMoney(monthTargets),
        grossMarginPct:
          actualRowAmount !== null && actualRowAmount > 0 && actualGrossMarginAmount !== null
            ? roundPct((actualGrossMarginAmount / actualRowAmount) * 100)
            : null,
        source,
      }
    },
  )

  const clientAllocations: Allocation[] = []
  const practiceAllocations: Allocation[] = []
  const engagementAllocations: Allocation[] = []
  const productionMap = new Map<string, ProductionAccumulator>()

  for (const report of validatedReports) {
    const mission = missionById.get(report.mission_id)
    const reportAmount = amount(report.billable_days) * amount(report.tjm_snapshot)
    const company = mission?.company_id ? companyById.get(mission.company_id) : null
    const practiceSlug = normalizeFinancePractice(mission?.practice, input.practices)
    const opportunity = mission?.opportunity_id
      ? opportunityById.get(mission.opportunity_id)
      : null
    const engagement = normalizeFinanceEngagement(
      opportunity?.opportunity_type,
      input.engagementTypes,
    )

    if (actualThrough && monthKey(report.period_start) <= actualThrough) {
      clientAllocations.push({
        id: company?.id ?? null,
        label: company?.name ?? null,
        amount: reportAmount,
      })
      practiceAllocations.push({
        id: practiceSlug,
        label: practiceSlug
          ? input.practices.find((practice) => practice.slug === practiceSlug)?.name ?? practiceSlug
          : null,
        amount: reportAmount,
      })
      engagementAllocations.push({
        id: engagement,
        label:
          engagement === "assistance_technique"
            ? "Assistance technique"
            : engagement === "forfait"
              ? "Forfait"
              : null,
        amount: reportAmount,
      })
    }

    const productionKey = company?.id ?? "non-attribue"
    const production = productionMap.get(productionKey) ?? {
      clientId: company?.id ?? null,
      clientName: company?.name ?? "Non attribué",
      quarters: emptyQuarters(),
    }
    const quarter = getQuarter(monthKey(report.period_start))
    const bucket = actualThrough && monthKey(report.period_start) <= actualThrough
      ? "actual"
      : "projected"
    production.quarters[quarter][bucket] = roundMoney(
      production.quarters[quarter][bucket] + reportAmount,
    )
    productionMap.set(productionKey, production)
  }

  const distributions = {
    clients: buildDistribution(actualRevenue, clientAllocations),
    practices: buildDistribution(actualRevenue, practiceAllocations),
    engagements: buildDistribution(actualRevenue, engagementAllocations),
  }

  const risksAndGaps: FinanceMobileDashboardData["risksAndGaps"] = []
  if (gapToTarget !== null) {
    risksAndGaps.push({
      id: "target-gap",
      kind: "target-gap",
      severity: gapToTarget < 0 ? "critical" : "info",
      title: gapToTarget < 0 ? "Objectif annuel non couvert" : "Objectif annuel couvert",
      detail: `Écart déterministe entre l'atterrissage projeté et l'objectif annuel.`,
      amount: gapToTarget,
    })
  }
  if (
    actualGrossMarginPct !== null &&
    grossMarginTargetPct !== null &&
    actualGrossMarginPct < grossMarginTargetPct
  ) {
    risksAndGaps.push({
      id: "margin",
      kind: "margin",
      severity: "warning",
      title: "Marge sous l'objectif",
      detail: `La marge réelle est inférieure de ${roundPct(grossMarginTargetPct - actualGrossMarginPct)} points à l'objectif.`,
    })
  }

  for (const report of validatedReports) {
    if (
      actualThrough &&
      monthKey(report.period_start) <= actualThrough &&
      report.activity_rate_percent !== null &&
      report.activity_rate_percent < 80
    ) {
      risksAndGaps.push({
        id: `activity-${report.id}`,
        kind: "activity",
        severity: report.activity_rate_percent < 60 ? "critical" : "warning",
        title: "Activité sous 80 %",
        detail: `Le CRA validé affiche ${roundPct(report.activity_rate_percent)} % d'activité.`,
        context: {
          missionId: report.mission_id,
          clientId: missionById.get(report.mission_id)?.company_id ?? undefined,
          practiceSlug:
            normalizeFinancePractice(
              missionById.get(report.mission_id)?.practice,
              input.practices,
            ) ?? undefined,
          month: monthKey(report.period_start),
        },
      })
    }
  }

  const asOfTime = Date.parse(input.asOfDate)
  const thirtyDaysAfter = asOfTime + 30 * 24 * 60 * 60 * 1000
  for (const mission of input.missions) {
    if (!mission.end_date || mission.status !== "active") continue
    const endTime = Date.parse(mission.end_date)
    if (endTime >= asOfTime && endTime <= thirtyDaysAfter) {
      risksAndGaps.push({
        id: `mission-ending-${mission.id}`,
        kind: "mission-ending",
        severity: "warning",
        title: "Mission proche de son terme",
        detail: `${mission.title} se termine le ${mission.end_date}.`,
        context: {
          missionId: mission.id,
          clientId: mission.company_id ?? undefined,
        },
      })
    }
  }

  for (const [dimension, distribution] of Object.entries(distributions)) {
    if (distribution.unassignedAmount <= 0) continue
    risksAndGaps.push({
      id: `unassigned-${dimension}`,
      kind: "unassigned",
      severity: distribution.unassignedAmount > distribution.totalAmount * 0.1 ? "critical" : "warning",
      title: `Montant non attribué — ${dimension}`,
      detail: "Le total financier officiel dépasse les montants attribuables avec les relations fiables disponibles.",
      amount: distribution.unassignedAmount,
    })
  }

  const missingProjectionMonths = revenueByMonth
    .filter(
      (row) => actualThrough && row.month > actualThrough && row.projected === 0,
    )
    .map((row) => row.month.slice(0, 7))
  if (missingProjectionMonths.length > 0) {
    risksAndGaps.push({
      id: "missing-projection",
      kind: "missing-projection",
      severity: "warning",
      title: "Projection mensuelle manquante",
      detail: `Aucune production sécurisée ni projection P&L pour : ${missingProjectionMonths.join(", ")}.`,
    })
  }

  return {
    period: {
      fiscalYear: input.fiscalYear,
      actualThrough,
      currency: "EUR",
    },
    objectives: {
      annualRevenue: annualRevenueTarget,
      grossMarginPct: grossMarginTargetPct,
    },
    summary: {
      actualRevenue,
      actualGrossMarginPct,
      projectedLanding,
      gapToTarget,
      coveragePct,
    },
    revenueByMonth,
    forecast: {
      securedProduction,
      pipelineGross,
      pipelineWeighted,
    },
    distributions,
    productionByClient: [...productionMap.values()].sort((a, b) => {
      const totalA = Object.values(a.quarters).reduce(
        (sum, quarter) => sum + quarter.actual + quarter.projected,
        0,
      )
      const totalB = Object.values(b.quarters).reduce(
        (sum, quarter) => sum + quarter.actual + quarter.projected,
        0,
      )
      return totalB - totalA
    }),
    risksAndGaps,
  }
}
