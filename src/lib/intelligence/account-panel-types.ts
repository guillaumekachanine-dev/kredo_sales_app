export type PanelDataSource = "supabase" | "engine" | "legacy_folio" | "none"

export type PanelResourceStatusCounts = {
  succeeded: number
  needsReview: number
  failed: number
  available: number
}

export type PanelResourceCounter = {
  engine: PanelResourceStatusCounts & {
    latestResultAt: string | null
    resultTypes: string[]
  }
  legacy: {
    available: boolean
    count: number
    source: "folio_metadata" | "phase4_legacy" | null
    note: string | null
  }
}

export type PanelResourceCounts = {
  analyses: PanelResourceCounter
  communications: PanelResourceCounter
  reports: PanelResourceCounter
  roadmaps: PanelResourceCounter
}

export type PanelOpportunity = {
  id: string
  title: string
  stage: string
  stageLabel: string
  priority: string
  nextActionLabel: string | null
  nextActionAt: string | null
  targetCloseDate: string | null
  createdAt: string
}

export type PanelEvent = {
  id: string
  title: string
  eventType: string
  status: string
  startsAt: string
  endsAt: string
  contactId: string | null
  opportunityId: string | null
}

export type PanelActivityItem =
  | {
      type: "opportunity"
      id: string
      sortAt: string | null
      priorityRank: number
      opportunity: PanelOpportunity
    }
  | {
      type: "event"
      id: string
      sortAt: string
      priorityRank: number
      event: PanelEvent
    }

export type PanelContact = {
  id: string
  personId: string
  fullName: string
  initials: string
  jobTitle: string | null
  relationshipRole: "decideur" | "dsi" | "direction_metier"
  isPriority: boolean
  email: string | null
}

export type PanelRunSummary = {
  id: string
  runType: string
  status: string
  needsReview: boolean
  currentPhase: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  errorMessage: string | null
}

export type AccountIntelligencePanelData = {
  company: {
    id: string
    name: string
    sector: string | null
    sectorId: string | null
    segment: string | null
    priority: string
    lifecycleStatus: string
    aiScore: number | null
    website: string | null
    logoPath: string | null
  }
  resources: PanelResourceCounts
  sector: {
    hasStructuredSector: boolean
    structuredSectorId: string | null
    structuredSectorName: string | null
    structuredSectorSlug: string | null
    structuredSectorStatus: string | null
    hasLegacySectorAnalysis: boolean
    source: PanelDataSource
  }
  opportunities: PanelOpportunity[]
  events: PanelEvent[]
  activity: PanelActivityItem[]
  contacts: PanelContact[]
  runs: PanelRunSummary[]
  provenance: {
    loadedAt: string
    sources: {
      company: PanelDataSource
      resources: PanelDataSource | "mixed"
      sector: PanelDataSource
      opportunities: PanelDataSource
      events: PanelDataSource
      contacts: PanelDataSource
      runs: PanelDataSource
    }
  }
}

export type AccountIntelligencePanelDataResult =
  | { data: AccountIntelligencePanelData; error: null }
  | { data: null; error: string }
