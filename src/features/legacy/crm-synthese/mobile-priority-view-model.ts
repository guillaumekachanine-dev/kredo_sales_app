import {
  getCommercialRecommendation,
  getLifecycleLabel,
  getPriorityLabel,
  type CommercialRecommendation,
  type ProspectionSummaryFilters,
} from "./synthese-view-model"
import {
  getPortfolioPeriodMetrics,
  type PortfolioPeriodMetrics,
  type PortfolioTrustBundle,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"

function relativeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return "à venir"
  if (days === 0) return "aujourd'hui"
  if (days === 1) return "hier"
  if (days < 7) return `il y a ${days} jours`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`
}

// ── Types ────────────────────────────────────────────────────────────────────

export type MobileLensKey = "all" | "cibler" | "couvrir" | "engager" | "decider"

export type DataConfidence = {
  level: "high" | "medium" | "low"
  isPartial: boolean
  reasons: string[]
}

export type FactualEvidence = {
  key: string
  label: string
}

export type MobilePrimaryAction = {
  key: string
  label: string
  icon: "calendar" | "task" | "opportunity" | "advance" | "contact"
  disabled: boolean
  disabledReason?: string
}

export type MobileSecondaryAction = {
  key: string
  label: string
  description: string
  icon: "task" | "contact" | "account" | "interaction" | "opportunity"
  available: boolean
  unavailableReason?: string
}

export type MobilePriorityItem = {
  accountId: string
  accountName: string
  sector: string
  lifecycleStatus: string
  lifecycleLabel: string
  priority: string
  priorityLabel: string
  potentialScore: number
  reachScore: number
  momentumScore: number
  actionPriorityScore: number
  openOpportunityCount: number
  contactCount: number
  hasActionableContact: boolean
  hasDecisionMaker: boolean
  recommendation: CommercialRecommendation
  evidence: FactualEvidence[]
  lenses: MobileLensKey[]
  dataConfidence: DataConfidence
  primaryAction: MobilePrimaryAction
  secondaryActions: MobileSecondaryAction[]
}

export type MobileLensCount = {
  key: MobileLensKey
  label: string
  count: number
}

export type MobilePriorityViewModel = {
  items: MobilePriorityItem[]
  totalForLens: number
  totalPortfolio: number
  activeLens: MobileLensKey
  periodLabel: string
  lenses: MobileLensCount[]
  trust: PortfolioTrustBundle
}

const MAX_MOBILE_ITEMS = 15

// ── Lens Labels ──────────────────────────────────────────────────────────────

const LENS_LABELS: Record<MobileLensKey, string> = {
  all: "Toutes",
  cibler: "Cibler",
  couvrir: "Couvrir",
  engager: "Engager",
  decider: "Décider",
}

const PERIOD_LABELS: Record<ProspectionPeriod, string> = {
  "30d": "30 jours",
  "90d": "90 jours",
  "180d": "180 jours",
}

// ── Lens Assignment ──────────────────────────────────────────────────────────

function assignLenses(
  account: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
): MobileLensKey[] {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  const lenses: MobileLensKey[] = []

  if (account.potentialScore >= 60 && periodMetrics.activityCount === 0 && account.openOpportunityCount === 0) {
    lenses.push("cibler")
  }

  if (account.reachScore < 50 || account.committeeRoleCount === 0) {
    lenses.push("couvrir")
  }

  if (periodMetrics.activityCount > 0 || (account.openOpportunityCount > 0 && account.reachScore >= 50)) {
    lenses.push("engager")
  }

  if (account.openOpportunityCount > 0 && periodMetrics.momentumScore >= 30) {
    lenses.push("decider")
  }

  return lenses
}

// ── Data Confidence ──────────────────────────────────────────────────────────

function computeDataConfidence(
  account: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
): DataConfidence {
  const reasons: string[] = []
  const periodMetrics = getPortfolioPeriodMetrics(account, period)

  if (account.legacyFolioScore === null) {
    reasons.push("Score de potentiel calculé par proxy")
  }

  if (account.contactCount === 0) {
    reasons.push("Aucun contact identifié")
  }

  if (account.committeeRoleCount === 0 && account.contactCount > 0) {
    reasons.push("Aucun rôle comité identifié")
  }

  if (periodMetrics.activityCount === 0) {
    reasons.push("Aucune activité commerciale sur la période")
  }

  const isPartial = reasons.length > 0

  let level: DataConfidence["level"]
  if (account.legacyFolioScore !== null && account.contactCount > 0 && periodMetrics.activityCount > 0) {
    level = "high"
  } else if (account.legacyFolioScore !== null || account.contactCount > 0) {
    level = "medium"
  } else {
    level = "low"
  }

  return { level, isPartial, reasons }
}

// ── Factual Evidence ─────────────────────────────────────────────────────────

function buildFactualEvidence(
  account: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
): FactualEvidence[] {
  const evidence: FactualEvidence[] = []
  const periodMetrics = getPortfolioPeriodMetrics(account, period)

  if (account.latestCommercialActivityAt) {
    evidence.push({
      key: "last-interaction",
      label: `Dernière interaction : ${relativeLabel(account.latestCommercialActivityAt)}`,
    })
  } else {
    evidence.push({ key: "no-interaction", label: "Aucune interaction enregistrée" })
  }

  if (account.openOpportunityCount > 0) {
    evidence.push({
      key: "open-opps",
      label: `${account.openOpportunityCount} opportunité${account.openOpportunityCount > 1 ? "s" : ""} ouverte${account.openOpportunityCount > 1 ? "s" : ""}`,
    })
  }

  if (account.committeeRoleCount === 0) {
    evidence.push({ key: "no-decision-maker", label: "Aucun décideur identifié" })
  } else {
    evidence.push({
      key: "committee",
      label: `${account.committeeRoleCount} rôle${account.committeeRoleCount > 1 ? "s" : ""} comité identifié${account.committeeRoleCount > 1 ? "s" : ""}`,
    })
  }

  if (account.contactCount === 0) {
    evidence.push({ key: "no-contacts", label: "Aucun contact exploitable" })
  } else if (account.reachScore < 35) {
    evidence.push({ key: "low-reach", label: "Couverture contact fragile" })
  }

  if (periodMetrics.plannedCount > 0) {
    evidence.push({
      key: "planned",
      label: `${periodMetrics.plannedCount} engagement${periodMetrics.plannedCount > 1 ? "s" : ""} planifié${periodMetrics.plannedCount > 1 ? "s" : ""}`,
    })
  }

  if (periodMetrics.activityCount > 0 && account.openOpportunityCount === 0) {
    evidence.push({ key: "activity-no-conversion", label: "Activité sans qualification formalisée" })
  }

  return evidence.slice(0, 5)
}

// ── Primary Action Resolution ────────────────────────────────────────────────

export function hasQualificationSignal(
  account: ProspectionPortfolioAccount,
  periodMetrics: PortfolioPeriodMetrics,
): boolean {
  return (
    periodMetrics.activityCount >= 2
    && account.committeeRoleCount > 0
    && account.potentialScore >= 65
    && periodMetrics.interactionsCount >= 1
  )
}

export function resolveMobilePrimaryAction(
  account: ProspectionPortfolioAccount,
  recommendation: CommercialRecommendation,
  period: ProspectionPeriod,
): MobilePrimaryAction {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  const hasActionableContact = account.contactCount > 0
  const hasDecisionMaker = account.committeeRoleCount > 0
  const hasPlannedEngagement = periodMetrics.plannedCount > 0

  // 1. Aucun contact exploitable → tâche d'identification
  if (!hasActionableContact) {
    return {
      key: "create-contact-task",
      label: "Créer une tâche de prise de contact",
      icon: "task",
      disabled: false,
    }
  }

  // 2. Opportunité ouverte → consulter ou faire avancer
  if (account.openOpportunityCount > 0) {
    if (recommendation.key === "committee") {
      return {
        key: "consolidate-committee",
        label: "Consolider le buying committee",
        icon: "contact",
        disabled: false,
      }
    }
    return {
      key: "advance-opportunity",
      label: "Faire avancer l'opportunité",
      icon: "advance",
      disabled: false,
    }
  }

  // 3. Engagement déjà planifié → préparer, ne pas en planifier un autre
  if (hasPlannedEngagement) {
    return {
      key: "prepare-next-meeting",
      label: "Préparer le prochain rendez-vous",
      icon: "calendar",
      disabled: false,
    }
  }

  // 4. Qualification réellement démontrée → créer une opportunité
  if (hasQualificationSignal(account, periodMetrics) && account.openOpportunityCount === 0) {
    return {
      key: "create-opportunity",
      label: "Créer une opportunité",
      icon: "opportunity",
      disabled: false,
    }
  }

  // 5. Contact exploitable, aucune activité → planifier une prise de contact
  if (periodMetrics.activityCount === 0) {
    return {
      key: "schedule-contact",
      label: "Planifier une prise de contact",
      icon: "calendar",
      disabled: false,
    }
  }

  // 6. Contexte mature (momentum), pas d'événement planifié → planifier un RDV
  if (periodMetrics.momentumScore >= 30 && !hasPlannedEngagement) {
    return {
      key: "schedule-meeting",
      label: "Planifier un rendez-vous",
      icon: "calendar",
      disabled: false,
    }
  }

  // 7. Fallback → tâche de qualification (jamais un RDV automatique)
  return {
    key: "create-qualification-task",
    label: "Qualifier le prochain angle commercial",
    icon: "task",
    disabled: false,
  }
}

// ── Secondary Actions ────────────────────────────────────────────────────────

function buildSecondaryActions(
  account: ProspectionPortfolioAccount,
  primaryAction: MobilePrimaryAction,
  period: ProspectionPeriod,
): MobileSecondaryAction[] {
  const periodMetrics = getPortfolioPeriodMetrics(account, period)
  const actions: MobileSecondaryAction[] = []

  if (primaryAction.key !== "schedule-meeting" && primaryAction.key !== "schedule-contact" && account.contactCount > 0) {
    actions.push({
      key: "schedule-event",
      label: "Planifier un échange",
      description: `${account.contactCount} contact${account.contactCount > 1 ? "s" : ""} exploitable${account.contactCount > 1 ? "s" : ""}`,
      icon: "contact",
      available: true,
    })
  }

  if (primaryAction.key !== "create-contact-task") {
    actions.push({
      key: "create-task",
      label: "Créer une tâche",
      description: "Suivi, relance ou rappel",
      icon: "task",
      available: true,
    })
  }

  actions.push({
    key: "log-interaction",
    label: "Logger une interaction",
    description: "Enregistrer un échange réalisé",
    icon: "interaction",
    available: true,
  })

  if (account.contactCount > 0) {
    actions.push({
      key: "explore-contacts",
      label: "Explorer les contacts",
      description: `${account.contactCount} contact${account.contactCount > 1 ? "s" : ""} · ${account.committeeRoleCount} décideur${account.committeeRoleCount > 1 ? "s" : ""}`,
      icon: "contact",
      available: true,
    })
  }

  if (
    primaryAction.key !== "create-opportunity"
    && account.openOpportunityCount === 0
    && periodMetrics.activityCount > 0
    && account.committeeRoleCount > 0
    && account.potentialScore >= 65
  ) {
    actions.push({
      key: "create-opportunity",
      label: "Créer une opportunité",
      description: "Formaliser la qualification",
      icon: "opportunity",
      available: true,
    })
  }

  actions.push({
    key: "open-account",
    label: "Fiche compte",
    description: "Hub intelligence complet",
    icon: "account",
    available: true,
  })

  return actions
}

// ── Coverage Indicator ───────────────────────────────────────────────────────

export function getCoverageIndicator(reachScore: number): {
  label: string
  tone: "danger" | "warning" | "success"
} {
  if (reachScore < 35) return { label: "Fragile", tone: "danger" }
  if (reachScore < 65) return { label: "Partielle", tone: "warning" }
  return { label: "Solide", tone: "success" }
}

// ── Build Full ViewModel ─────────────────────────────────────────────────────

type LightProjection = {
  account: ProspectionPortfolioAccount
  actionPriorityScore: number
  potentialScore: number
  sector: string
  lifecycle: string
  priority: string
  lenses: MobileLensKey[]
}

export function buildMobilePriorityViewModel(params: {
  accounts: ProspectionPortfolioAccount[]
  filters: ProspectionSummaryFilters
  lens: MobileLensKey
  trust: PortfolioTrustBundle
}): MobilePriorityViewModel {
  const { accounts, filters, lens, trust } = params
  const period = filters.period

  // Passe 1 — projection légère (96 comptes) : scoring + lenses seulement
  const lightItems: LightProjection[] = accounts.map((account) => {
    const periodMetrics = getPortfolioPeriodMetrics(account, period)
    return {
      account,
      actionPriorityScore: periodMetrics.actionPriorityScore,
      potentialScore: account.potentialScore,
      sector: account.sector,
      lifecycle: account.lifecycle,
      priority: account.priority,
      lenses: assignLenses(account, period),
    }
  })

  // 1. Filtre base (sector, lifecycle, priority)
  const filteredByBase = lightItems.filter((item) => {
    if (filters.sector !== "all" && item.sector !== filters.sector) return false
    if (filters.lifecycle !== "all" && item.lifecycle !== filters.lifecycle) return false
    if (filters.priority !== "all" && item.priority !== filters.priority) return false
    return true
  })

  // 2. Compteurs de lentilles (sur le total filtré base, AVANT lentille)
  const lensKeys: MobileLensKey[] = ["all", "cibler", "couvrir", "engager", "decider"]
  const lenses: MobileLensCount[] = lensKeys.map((key) => ({
    key,
    label: LENS_LABELS[key],
    count: key === "all"
      ? filteredByBase.length
      : filteredByBase.filter((item) => item.lenses.includes(key)).length,
  }))

  // 3. Filtre par lentille active
  const filteredByLens = lens === "all"
    ? filteredByBase
    : filteredByBase.filter((item) => item.lenses.includes(lens))

  // 4. Classement
  const sorted = [...filteredByLens].sort((a, b) => {
    if (b.actionPriorityScore !== a.actionPriorityScore) {
      return b.actionPriorityScore - a.actionPriorityScore
    }
    if (b.potentialScore !== a.potentialScore) {
      return b.potentialScore - a.potentialScore
    }
    return a.account.name.localeCompare(b.account.name)
  })

  // 5. Troncature top N
  const topN = sorted.slice(0, MAX_MOBILE_ITEMS)

  // Passe 2 — projection détaillée (≤15 comptes) : recommendation, evidence, CTA
  const items: MobilePriorityItem[] = topN.map((light) => {
    const account = light.account
    const periodMetrics = getPortfolioPeriodMetrics(account, period)
    const recommendation = getCommercialRecommendation(account, period)
    const primaryAction = resolveMobilePrimaryAction(account, recommendation, period)

    return {
      accountId: account.id,
      accountName: account.name,
      sector: account.sector,
      lifecycleStatus: account.lifecycle,
      lifecycleLabel: getLifecycleLabel(account.lifecycle),
      priority: account.priority,
      priorityLabel: getPriorityLabel(account.priority),
      potentialScore: account.potentialScore,
      reachScore: account.reachScore,
      momentumScore: periodMetrics.momentumScore,
      actionPriorityScore: periodMetrics.actionPriorityScore,
      openOpportunityCount: account.openOpportunityCount,
      contactCount: account.contactCount,
      hasActionableContact: account.contactCount > 0,
      hasDecisionMaker: account.committeeRoleCount > 0,
      recommendation,
      evidence: buildFactualEvidence(account, period),
      lenses: light.lenses,
      dataConfidence: computeDataConfidence(account, period),
      primaryAction,
      secondaryActions: buildSecondaryActions(account, primaryAction, period),
    }
  })

  return {
    items,
    totalForLens: filteredByLens.length,
    totalPortfolio: filteredByBase.length,
    activeLens: lens,
    periodLabel: PERIOD_LABELS[period],
    lenses,
    trust,
  }
}

export function parseLens(value: string | null): MobileLensKey {
  if (value === "cibler" || value === "couvrir" || value === "engager" || value === "decider") {
    return value
  }
  return "all"
}
