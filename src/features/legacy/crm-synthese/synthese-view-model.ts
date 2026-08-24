import {
  getPortfolioPeriodMetrics,
  type PortfolioTrustBundle,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

export type ProspectionSummaryFocusPreset =
  | "all"
  | "open-opportunity-undercovered"
  | "inactive-relationship"
  | "activity-no-conversion"
  | "planned-engagements"

export type ProspectionSummaryFilters = {
  period: ProspectionPeriod
  sector: string
  lifecycle: string
  priority: string
  focus: ProspectionSummaryFocusPreset
}

export type CommercialRecommendation = {
  key: string
  dominantReason: string
  actionLabel: string
  whyNow: string
  costOfInaction: string
}

export type ProspectionSummaryKpi = {
  id: Exclude<ProspectionSummaryFocusPreset, "all">
  label: string
  value: string
  context: string
  definition: string
  active: boolean
}

export type ProspectionSummaryViewModel = {
  baseAccounts: ProspectionPortfolioAccount[]
  visibleAccounts: ProspectionPortfolioAccount[]
  selectedAccount: ProspectionPortfolioAccount | null
  summarySentence: string
  focusLabel: string | null
  kpis: ProspectionSummaryKpi[]
  weeklyFocus: Array<{
    account: ProspectionPortfolioAccount
    inactivityRisk: number
    momentumScore: number
    plannedCount: number
    recommendation: CommercialRecommendation
  }>
  trust: PortfolioTrustBundle
}

const FOCUS_LABELS: Record<Exclude<ProspectionSummaryFocusPreset, "all">, string> = {
  "open-opportunity-undercovered": "Opportunités sous-couvertes",
  "inactive-relationship": "Relations inactives",
  "activity-no-conversion": "Activité sans conversion",
  "planned-engagements": "Engagements planifiés",
}

const LIFECYCLE_LABELS: Record<string, string> = {
  cible: "Cible",
  prospect: "Prospect",
  client: "Client",
  client_actif: "Client actif",
  client_dormant: "Client dormant",
  ancien_client: "Ancien client",
  partenaire: "Partenaire",
  non_prioritaire: "Non prioritaire",
  exclu: "Exclu",
}

const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  normale: "Normale",
  basse: "Basse",
}

function matchesBaseFilters(account: ProspectionPortfolioAccount, filters: ProspectionSummaryFilters) {
  if (filters.sector !== "all" && account.sector !== filters.sector) return false
  if (filters.lifecycle !== "all" && account.lifecycle !== filters.lifecycle) return false
  if (filters.priority !== "all" && account.priority !== filters.priority) return false
  return true
}

export function getLifecycleLabel(lifecycle: string) {
  return LIFECYCLE_LABELS[lifecycle] ?? lifecycle.replaceAll("_", " ")
}

export function getPriorityLabel(priority: string) {
  return PRIORITY_LABELS[priority] ?? priority
}

function isOpenOpportunityUndercovered(account: ProspectionPortfolioAccount) {
  return account.openOpportunityCount > 0 && account.reachScore < 50
}

function isInactiveRelationship(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  return periodMetrics.activityCount === 0 && periodMetrics.plannedCount === 0
}

function isActivityWithoutConversion(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  return getPortfolioPeriodMetrics(account, period).activityCount > 0 && account.openOpportunityCount === 0
}

function hasPlannedEngagement(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  return getPortfolioPeriodMetrics(account, period).plannedCount > 0
}

function matchesFocusPreset(account: ProspectionPortfolioAccount, filters: ProspectionSummaryFilters) {
  if (filters.focus === "open-opportunity-undercovered") return isOpenOpportunityUndercovered(account)
  if (filters.focus === "inactive-relationship") return isInactiveRelationship(account, filters.period)
  if (filters.focus === "activity-no-conversion") return isActivityWithoutConversion(account, filters.period)
  if (filters.focus === "planned-engagements") return hasPlannedEngagement(account, filters.period)
  return true
}

export function getConversionLabel(account: ProspectionPortfolioAccount) {
  if (account.openOpportunityCount === 0) return "Aucune opportunité ouverte"
  if (account.weightedPipeline > 0) {
    return `${account.openOpportunityCount} opp. ouvertes · ${Math.round(account.weightedPipeline / 1000)} k€ pondérés`
  }
  return `${account.openOpportunityCount} opp. ouvertes`
}

export function getCommercialRecommendation(
  account: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
): CommercialRecommendation {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)

  if (account.openOpportunityCount > 0 && periodMetrics.plannedCount === 0) {
    return {
      key: "opportunity-next-step",
      dominantReason: "Opportunité ouverte sans prochaine action planifiée",
      actionLabel: "Planifier la prochaine étape",
      whyNow: "Une opportunité est ouverte, mais aucun engagement futur n'est enregistré.",
      costOfInaction: "L'opportunité peut ralentir faute de prochaine étape explicite.",
    }
  }
  if (account.committeeRoleCount === 0) {
    return {
      key: "sponsor",
      dominantReason: "Aucun rôle comité critique n'est identifié",
      actionLabel: "Identifier un sponsor ou décideur",
      whyNow: "Le compte ne dispose pas encore de relais client clairement identifié.",
      costOfInaction: "Tout signal favorable retombera sans interlocuteur capable de le porter.",
    }
  }
  if (account.openOpportunityCount > 0 && account.reachScore < 45) {
    return {
      key: "committee",
      dominantReason: "Opportunité ouverte avec couverture encore fragile",
      actionLabel: "Consolider le buying committee",
      whyNow: "Une matière commerciale existe déjà, mais repose sur trop peu de relais.",
      costOfInaction: "L'opportunité peut dépendre d'un interlocuteur unique sans capacité d'arbitrage.",
    }
  }
  if (periodMetrics.activityCount > 0 && account.openOpportunityCount === 0) {
    return {
      key: "qualification",
      dominantReason: "Activité présente sans opportunité formalisée",
      actionLabel: "Formaliser la qualification",
      whyNow: "Les échanges existent déjà et peuvent être transformés en qualification exploitable.",
      costOfInaction: "L'activité s'accumule sans générer d'étape aval.",
    }
  }
  if (periodMetrics.plannedCount > 0) {
    return {
      key: "prepare-next",
      dominantReason: "Engagement commercial déjà planifié",
      actionLabel: "Préparer le prochain échange",
      whyNow: "La fenêtre de contact est ouverte ; le gain se joue dans la préparation.",
      costOfInaction: "Le prochain échange risque de ne pas faire progresser la relation.",
    }
  }
  if (periodMetrics.activityCount === 0) {
    return {
      key: "reactivate",
      dominantReason: "Aucune activité commerciale sur la période",
      actionLabel: "Relancer la relation",
      whyNow: "Aucune interaction récente ni action future n'est enregistrée.",
      costOfInaction: "La relation continuera de se refroidir.",
    }
  }
  return {
    key: "maintain",
    dominantReason: "Le compte est actif mais demande un prochain angle clair",
    actionLabel: "Décider du prochain angle de progression",
    whyNow: "Le compte bouge encore, mais le prochain mouvement n'est pas explicite.",
    costOfInaction: "Le momentum commercial peut s'éroder sans décision claire.",
  }
}

function buildSummarySentence(accounts: ProspectionPortfolioAccount[]) {
  const count = accounts.filter(isOpenOpportunityUndercovered).length
  if (count === 0) return "Aucune opportunité ouverte ne ressort actuellement comme sous-couverte."
  if (count === 1) return "1 compte avec opportunité ouverte reste sous-couvert."
  return `${count} comptes avec opportunité ouverte restent sous-couverts.`
}

function buildKpis(baseAccounts: ProspectionPortfolioAccount[], filters: ProspectionSummaryFilters) {
  const undercovered = baseAccounts.filter(isOpenOpportunityUndercovered).length
  const inactive = baseAccounts.filter((account) => isInactiveRelationship(account, filters.period)).length
  const noConversion = baseAccounts.filter((account) => isActivityWithoutConversion(account, filters.period)).length
  const plannedCount = baseAccounts.reduce((sum, account) => sum + getPortfolioPeriodMetrics(account, filters.period).plannedCount, 0)
  const plannedAccounts = baseAccounts.filter((account) => hasPlannedEngagement(account, filters.period)).length

  return [
    {
      id: "open-opportunity-undercovered",
      label: "Opportunités sous-couvertes",
      value: String(undercovered),
      context: "Opportunités ouvertes avec reach fragile",
      definition: "Comptes avec au moins une opportunité ouverte et un reach inférieur à 50.",
      active: filters.focus === "open-opportunity-undercovered",
    },
    {
      id: "inactive-relationship",
      label: "Relations inactives",
      value: String(inactive),
      context: "Aucune activité ni engagement planifié sur la période",
      definition: "Comptes sans activité commerciale réalisée et sans engagement futur sur la période choisie.",
      active: filters.focus === "inactive-relationship",
    },
    {
      id: "activity-no-conversion",
      label: "Activité sans conversion",
      value: String(noConversion),
      context: "Interactions présentes, aucune opportunité ouverte",
      definition: "Comptes ayant une activité commerciale sur la période, mais aucune opportunité ouverte en aval.",
      active: filters.focus === "activity-no-conversion",
    },
    {
      id: "planned-engagements",
      label: "Engagements planifiés",
      value: String(plannedCount),
      context: `${plannedAccounts} comptes concernés`,
      definition: "Nombre total d'engagements commerciaux planifiés dans la fenêtre sélectionnée.",
      active: filters.focus === "planned-engagements",
    },
  ] satisfies ProspectionSummaryKpi[]
}

function buildWeeklyFocus(accounts: ProspectionPortfolioAccount[], period: ProspectionPeriod) {
  const ordered = accounts.map((account) => {
    const metrics = getPortfolioPeriodMetrics(account, period)
    return {
      account,
      inactivityRisk: metrics.inactivityRiskScore,
      momentumScore: metrics.momentumScore,
      plannedCount: metrics.plannedCount,
      recommendation: getCommercialRecommendation(account, period),
    }
  }).sort((left, right) => {
    const leftOpportunityWithoutPlan = left.account.openOpportunityCount > 0 && left.plannedCount === 0
    const rightOpportunityWithoutPlan = right.account.openOpportunityCount > 0 && right.plannedCount === 0
    if (leftOpportunityWithoutPlan !== rightOpportunityWithoutPlan) return rightOpportunityWithoutPlan ? 1 : -1
    if (left.inactivityRisk !== right.inactivityRisk) return right.inactivityRisk - left.inactivityRisk
    return left.account.name.localeCompare(right.account.name, "fr") || left.account.id.localeCompare(right.account.id)
  })

  const focus: typeof ordered = []
  const seenRecommendations = new Set<string>()
  for (const item of ordered) {
    if (seenRecommendations.has(item.recommendation.key)) continue
    focus.push(item)
    seenRecommendations.add(item.recommendation.key)
    if (focus.length === 5) return focus
  }
  for (const item of ordered) {
    if (!focus.some((current) => current.account.id === item.account.id)) focus.push(item)
    if (focus.length === 5) break
  }
  return focus.slice(0, 5)
}

export function buildProspectionSummaryViewModel(params: {
  accounts: ProspectionPortfolioAccount[]
  filters: ProspectionSummaryFilters
  selectedAccountId: string | null
  trust: PortfolioTrustBundle
}): ProspectionSummaryViewModel {
  const { accounts, filters, selectedAccountId, trust } = params
  const baseAccounts = accounts.filter((account) => matchesBaseFilters(account, filters))
  const visibleAccounts = baseAccounts.filter((account) => matchesFocusPreset(account, filters))
  return {
    baseAccounts,
    visibleAccounts,
    selectedAccount: visibleAccounts.find((account) => account.id === selectedAccountId) ?? visibleAccounts[0] ?? null,
    summarySentence: buildSummarySentence(baseAccounts),
    focusLabel: filters.focus === "all" ? null : FOCUS_LABELS[filters.focus],
    kpis: buildKpis(baseAccounts, filters),
    weeklyFocus: buildWeeklyFocus(visibleAccounts.length > 0 ? visibleAccounts : baseAccounts, filters.period),
    trust,
  }
}

export function getAccountTrustBadges() {
  return ["OBSERVED", "PROXY"] as const
}
