// ADR-0011 — Score de Priorité Commerciale KREDO.
// Contrat exact du RPC get_account_score_context (Lot 3) + types du moteur pur.

export type ScoreComponentKey =
  | "C1_fit"
  | "C2_potential"
  | "C3_signals"
  | "C4_relational"
  | "C5_momentum"
  | "C6_active_value"

export type LifecycleBucket = "prospect" | "active" | "dormant"

export type FreshnessStatus = "fresh" | "aging" | "stale" | "missing"

export type ScoreBand = "A" | "B" | "C" | "D" | "U"

export type ScoreTriggerSource = "manual" | "weekly_brief" | "signal_update" | "import" | "system"

export interface AccountScoreSignal {
  id: string
  category: string
  type: string
  title: string
  confidenceScore: number
  relevanceScore: number
  urgencyScore: number
  detectedAt: string | null
  expiresAt: string | null
  eventAt: string | null
}

export interface AccountScoreContext {
  company: {
    id: string
    name: string
    lifecycleStatus: string
    sector: string | null
    sectorId: string | null
    segment: string | null
    revenue: string | null
    employeeCount: number | null
    sizeBand: string | null
    priority: string | null
  }
  sector: {
    slug: string
    attractivenessScore: number | null
    practicesFit: Record<string, number> | null
  } | null
  contacts: {
    totalCount: number
    decisionMakerCount: number
    priorityCount: number
    strongRelationshipCount: number
  }
  opportunities: {
    openCount: number
    openWeightedGain: number
    wonCount: number
    lostCount: number
    hasOverdueNextAction: boolean
    hasUpcomingNextAction: boolean
  }
  missions: {
    activeCount: number
    avgGrossMarginPct: number | null
  }
  interactions: {
    recentCount90d: number
    lastInteractionAt: string | null
  }
  signals: AccountScoreSignal[]
  dataCutoffAt: string
}

export interface EvidenceRef {
  table: string
  id: string
}

// Sortie brute d'un compute-cX : ce que dit le composant, avant pondération.
export interface RawScoreComponent {
  componentKey: ScoreComponentKey
  componentLabel: string
  rawValueJson: Record<string, unknown>
  normalizedScore: number // 0-100
  confidence: number // 0-100
  freshnessStatus: FreshnessStatus
  explanation: string
  evidenceRefs: EvidenceRef[]
}

// Sortie finale après application du poids et du lifecycle_multiplier (orchestrateur).
export interface ScoreComponentResult extends RawScoreComponent {
  weight: number
  lifecycleMultiplier: number
  weightedContribution: number
}

export interface AccountScoreSummary {
  topPositiveDrivers: string[]
  topNegativeDrivers: string[]
  caveats: string[]
}

export interface AccountScoreResult {
  scoreValue: number
  scoreBand: ScoreBand
  confidenceScore: number
  lifecycleContext: string
  components: ScoreComponentResult[]
  summary: AccountScoreSummary
}
