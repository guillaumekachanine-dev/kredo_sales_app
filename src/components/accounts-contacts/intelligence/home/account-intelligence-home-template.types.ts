export type AccountIntelligenceAvailability = "available" | "partial" | "empty"

export type AccountIntelligenceHomeAccount = {
  name: string
  sector: string
  segment: string
  website?: string | null
  logoPath?: string | null
  location: string
  lifecycle: string
}

export type AccountIntelligenceHomeProcessStep = {
  id: string
  label: string
  state: AccountIntelligenceAvailability
  href?: string
}

export type AccountIntelligenceHomeFact = {
  label: string
  value: string
}

export type AccountIntelligenceHomeMetric = {
  value: string
  label: string
  secondary?: string
  tone: "dark" | "light"
}

export type AccountIntelligenceHomeReview = {
  title: string
  subtitle: string
  available: boolean
  href?: string
}

export type AccountIntelligenceHomeSignal = {
  title: string
  dateLabel: string
  importanceLabel: string
  implication: string
}

export type AccountIntelligenceHomeWatch = {
  enabled: boolean
  label: string
}

export type AccountIntelligenceHomeToolboxItem = {
  title: string
  description: string
  icon: "contacts" | "documents" | "playbook"
  href?: string
}

export type AccountIntelligenceHomeTemplateProps = {
  account: AccountIntelligenceHomeAccount
  processSteps: readonly AccountIntelligenceHomeProcessStep[]
  companySummary: string
  facts: readonly [
    AccountIntelligenceHomeFact,
    AccountIntelligenceHomeFact,
    AccountIntelligenceHomeFact,
    AccountIntelligenceHomeFact,
  ]
  review: AccountIntelligenceHomeReview
  metrics: readonly [
    AccountIntelligenceHomeMetric,
    AccountIntelligenceHomeMetric,
    AccountIntelligenceHomeMetric,
    AccountIntelligenceHomeMetric,
  ]
  recentSignal: AccountIntelligenceHomeSignal | null
  watch: AccountIntelligenceHomeWatch
  toolbox: readonly [
    AccountIntelligenceHomeToolboxItem,
    AccountIntelligenceHomeToolboxItem,
    AccountIntelligenceHomeToolboxItem,
  ]
}
