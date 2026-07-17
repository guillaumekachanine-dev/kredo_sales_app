import {
  getPortfolioPeriodMetrics,
  type DataTrustMeta,
  type PortfolioTrustBundle,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

export type ProspectionSummaryFocusPreset =
  | "all"
  | "undercovered-high-potential"
  | "priority-inactive"
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
    priorityScore: number
    momentumScore: number
    plannedCount: number
    recommendation: CommercialRecommendation
  }>
  trust: PortfolioTrustBundle
}

const FOCUS_LABELS: Record<Exclude<ProspectionSummaryFocusPreset, "all">, string> = {
  "undercovered-high-potential": "Fort potentiel sous-couvert",
  "priority-inactive": "Prioritaires sans activité récente",
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
  if (filters.sector !== "all" && account.sector !== filters.sector) {
    return false
  }
  if (filters.lifecycle !== "all" && account.lifecycle !== filters.lifecycle) {
    return false
  }
  if (filters.priority !== "all" && account.priority !== filters.priority) {
    return false
  }
  return true
}

export function getLifecycleLabel(lifecycle: string) {
  return LIFECYCLE_LABELS[lifecycle] ?? lifecycle.replaceAll("_", " ")
}

export function getPriorityLabel(priority: string) {
  return PRIORITY_LABELS[priority] ?? priority
}

function isUndercoveredHighPotential(account: ProspectionPortfolioAccount) {
  return account.potentialScore >= 75 && account.reachScore < 50
}

function isPriorityInactive(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  return periodMetrics.actionPriorityScore >= 70 && periodMetrics.activityCount === 0
}

function isActivityWithoutConversion(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  return periodMetrics.activityCount > 0 && account.openOpportunityCount === 0
}

function hasPlannedEngagement(account: ProspectionPortfolioAccount, period: ProspectionPeriod) {
  return getPortfolioPeriodMetrics(account, period).plannedCount > 0
}

function matchesFocusPreset(account: ProspectionPortfolioAccount, filters: ProspectionSummaryFilters) {
  if (filters.focus === "undercovered-high-potential") {
    return isUndercoveredHighPotential(account)
  }
  if (filters.focus === "priority-inactive") {
    return isPriorityInactive(account, filters.period)
  }
  if (filters.focus === "activity-no-conversion") {
    return isActivityWithoutConversion(account, filters.period)
  }
  if (filters.focus === "planned-engagements") {
    return hasPlannedEngagement(account, filters.period)
  }
  return true
}

export function getConversionLabel(account: ProspectionPortfolioAccount) {
  if (account.openOpportunityCount === 0) {
    return "Aucune opportunité ouverte"
  }

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

  if (account.committeeRoleCount === 0) {
    return {
      key: "sponsor",
      dominantReason: "Aucun rôle comité critique n'est identifié",
      actionLabel: "Identifier un sponsor ou décideur",
      whyNow: "Le potentiel du compte reste théorique tant que personne n'est clairement engagé côté client.",
      costOfInaction: "Le reach restera artificiellement faible et tout signal favorable retombera sans relais.",
    }
  }

  if (account.potentialScore >= 75 && periodMetrics.activityCount === 0 && account.openOpportunityCount === 0) {
    return {
      key: "first-sequence",
      dominantReason: "Potentiel élevé sans activité commerciale récente",
      actionLabel: "Déclencher une première séquence ciblée",
      whyNow: "Le compte coche les marqueurs de potentiel, mais aucun mouvement commercial n'est visible sur la période.",
      costOfInaction: "Un compte à forte valeur restera hors radar commercial alors qu'il est déjà priorisable.",
    }
  }

  if (account.openOpportunityCount > 0 && account.reachScore < 45) {
    return {
      key: "committee",
      dominantReason: "Opportunité ouverte avec couverture encore fragile",
      actionLabel: "Consolider le buying committee",
      whyNow: "Il y a déjà une matière commerciale, mais trop peu de relais pour sécuriser la conversion.",
      costOfInaction: "L'opportunité peut ralentir ou dépendre d'un interlocuteur unique sans capacité d'arbitrage.",
    }
  }

  if (periodMetrics.activityCount > 0 && account.openOpportunityCount === 0) {
    return {
      key: "qualification",
      dominantReason: "Activité présente sans opportunité formalisée",
      actionLabel: "Formaliser la qualification",
      whyNow: "Les échanges existent déjà, ce qui permet de transformer un intérêt diffus en qualification exploitable.",
      costOfInaction: "L'activité commerciale s'accumule sans générer d'étape aval ni signal de conversion.",
    }
  }

  if (periodMetrics.plannedCount > 0) {
    return {
      key: "prepare-next",
      dominantReason: "Engagement commercial déjà planifié",
      actionLabel: "Préparer le prochain échange",
      whyNow: "La fenêtre de contact est ouverte; le gain se joue dans la préparation du prochain rendez-vous.",
      costOfInaction: "Le prochain échange risque de rester transactionnel et de ne pas faire progresser la couverture.",
    }
  }

  if ((account.lifecycle === "client" || account.lifecycle === "client_actif") && periodMetrics.momentumScore < 25) {
    return {
      key: "reactivate-client",
      dominantReason: "Client actif à dynamique commerciale faible",
      actionLabel: "Réactiver une conversation de développement",
      whyNow: "La relation existe déjà, mais l'intensité commerciale ne soutient plus de trajectoire d'expansion claire.",
      costOfInaction: "Le compte peut glisser vers une relation de maintenance sans nouvelle matière de développement.",
    }
  }

  if (account.potentialScore >= 75 && account.reachScore < 55) {
    return {
      key: "coverage-gap",
      dominantReason: "Le reach ne suit pas encore le niveau de potentiel",
      actionLabel: "Renforcer la couverture commerciale",
      whyNow: "La valeur du compte dépasse la profondeur actuelle de la relation.",
      costOfInaction: "Le portefeuille conservera un déficit de couverture sur ses comptes les plus prometteurs.",
    }
  }

  return {
    key: "maintain",
    dominantReason: "Le compte est actif mais demande un prochain angle clair",
    actionLabel: "Décider du prochain angle de progression",
    whyNow: "Le compte bouge encore, mais sans arbitrage précis le momentum peut s'éroder.",
    costOfInaction: "La priorité commerciale sera rapidement captée par des comptes plus lisibles.",
  }
}

function buildSummarySentence(accounts: ProspectionPortfolioAccount[]) {
  const undercoveredCount = accounts.filter(isUndercoveredHighPotential).length
  if (undercoveredCount === 0) {
    return "Aucun compte à fort potentiel ne ressort actuellement comme sous-couvert."
  }
  if (undercoveredCount === 1) {
    return "1 compte à fort potentiel reste sous-couvert."
  }
  return `${undercoveredCount} comptes à fort potentiel restent sous-couverts.`
}

function buildKpis(baseAccounts: ProspectionPortfolioAccount[], filters: ProspectionSummaryFilters) {
  const undercovered = baseAccounts.filter(isUndercoveredHighPotential).length
  const inactive = baseAccounts.filter((account) => isPriorityInactive(account, filters.period)).length
  const noConversion = baseAccounts.filter((account) => isActivityWithoutConversion(account, filters.period)).length
  const plannedCount = baseAccounts.reduce(
    (sum, account) => sum + getPortfolioPeriodMetrics(account, filters.period).plannedCount,
    0,
  )
  const plannedAccounts = baseAccounts.filter((account) => hasPlannedEngagement(account, filters.period)).length

  return [
    {
      id: "undercovered-high-potential",
      label: "Fort potentiel sous-couvert",
      value: String(undercovered),
      context: "Comptes à potentiel élevé avec reach encore fragile",
      definition: "Comptes dont le potentiel atteint 75 ou plus, avec un reach commercial inférieur à 50.",
      active: filters.focus === "undercovered-high-potential",
    },
    {
      id: "priority-inactive",
      label: "Prioritaires sans activité récente",
      value: String(inactive),
      context: "Score de priorité élevé, sans activité sur la période",
      definition: "Comptes dont la priorité d'action est de 70 ou plus, sans activité commerciale réalisée sur la période choisie.",
      active: filters.focus === "priority-inactive",
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
  const ranked = [...accounts]
    .map((account) => {
      const periodMetrics = getPortfolioPeriodMetrics(account, period)
      return {
        account,
        priorityScore: periodMetrics.actionPriorityScore,
        momentumScore: periodMetrics.momentumScore,
        plannedCount: periodMetrics.plannedCount,
        recommendation: getCommercialRecommendation(account, period),
      }
    })
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore
      }
      if (right.account.potentialScore !== left.account.potentialScore) {
        return right.account.potentialScore - left.account.potentialScore
      }
      return left.account.name.localeCompare(right.account.name)
    })

  const unique: typeof ranked = []
  const seen = new Set<string>()

  for (const item of ranked) {
    if (seen.has(item.recommendation.key)) continue
    unique.push(item)
    seen.add(item.recommendation.key)
    if (unique.length === 5) {
      return unique
    }
  }

  for (const item of ranked) {
    if (unique.some((current) => current.account.id === item.account.id)) continue
    unique.push(item)
    if (unique.length === 5) {
      break
    }
  }

  return unique.slice(0, 5)
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
  const selectedAccount = visibleAccounts.find((account) => account.id === selectedAccountId) ?? visibleAccounts[0] ?? null

  return {
    baseAccounts,
    visibleAccounts,
    selectedAccount,
    summarySentence: buildSummarySentence(baseAccounts),
    focusLabel: filters.focus === "all" ? null : FOCUS_LABELS[filters.focus],
    kpis: buildKpis(baseAccounts, filters),
    weeklyFocus: buildWeeklyFocus(visibleAccounts.length > 0 ? visibleAccounts : baseAccounts, filters.period),
    trust,
  }
}

export function getAccountTrustBadges(meta: DataTrustMeta, account: ProspectionPortfolioAccount) {
  const uniqueOrigins = new Set<DataTrustMeta["origins"][number]>([
    meta.primaryOrigin,
    ...account.potentialOrigin.origins,
  ])
  return Array.from(uniqueOrigins)
}
