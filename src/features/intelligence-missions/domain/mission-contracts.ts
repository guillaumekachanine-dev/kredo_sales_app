export type CorpusKind =
  | "veille_period"
  | "intelligence_document"
  | "account_context"

export type CorpusSelector =
  | { kind: "veille_period"; periodStart: string; periodEnd: string }
  | { kind: "intelligence_document"; ids: string[] }
  | { kind: "account_context"; companyId: string }

export type CorpusItem = {
  ref: { kind: CorpusKind; table: string; id: string }
  title: string
  date: string | null
  provenance: string
  content: string
  chars: number
}

export type CorpusBudget = {
  maxTotalChars: number
  maxCharsPerItem: number
  maxItems: number
}

export type ResolvedCorpus = {
  items: CorpusItem[]
  stats: {
    requested: number
    kept: number
    dropped: number
    totalChars: number
  }
  trace: Array<{
    ref: CorpusItem["ref"]
    title: string
    kept: boolean
    reason?: "budget_total" | "budget_items" | "truncated"
  }>
}

export type CorpusResolveContext = {
  workspaceId: string
}

export type CorpusProvider<S extends CorpusSelector = CorpusSelector> = {
  kind: CorpusKind
  execution: "user_rls" | "service_role"
  resolve(ctx: CorpusResolveContext, selector: S): Promise<CorpusItem[]>
  weight: number
}

export type MissionConstraintSpec = {
  rules: string[]
}

export type SourceRef = {
  ref: CorpusItem["ref"]
  title: string
  provenance: string
}

export type Finding = {
  category:
    | "tendance"
    | "signal_faible"
    | "reglementaire"
    | "opportunite"
    | "risque"
    | "autre"
  statement: string
  evidence: SourceRef[]
}

export type Recommendation = {
  action: string
  rationale: string
  evidence: SourceRef[]
}

export type MissionReportV1 = {
  schemaVersion: 1
  title: string
  executiveSummary: string
  findings: Finding[]
  recommendations: Recommendation[]
  sourceRefs: SourceRef[]
}

export type MissionSpec = {
  slug: string
  version: number
  label: string
  description: string
  corpus: {
    base: CorpusSelector[]
    userAddition: { allowed: boolean; kinds: CorpusKind[] }
    budget: CorpusBudget
  }
  intent: {
    preset: string
    userEditable: boolean
  }
  constraints: MissionConstraintSpec
  promptTemplate: string
  model: {
    provider: "anthropic"
    model: string
    maxOutputTokens: number
  }
}
