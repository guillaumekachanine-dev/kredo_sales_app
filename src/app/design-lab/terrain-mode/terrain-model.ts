export type TerrainSurface = "home" | "stories" | "revision" | "top-accounts" | "essentials"

export type TerrainRegulatoryTiming =
  | { kind: "exact"; date: string }
  | { kind: "window"; label: string }
  | { kind: "unavailable" }

export type TerrainRegulatoryItem = {
  name: string
  timing: TerrainRegulatoryTiming
  urgency?: "high" | "medium" | "low"
}

export type TerrainMarketThesis = {
  title: string
  text: string
  commercialAngle?: string
  sourceIds: number[]
}

export type TerrainRiskOpportunity = {
  risk: string
  opportunity: string
  sourceIds: number[]
}

export type TerrainDailyAngle =
  | { kind: "market"; title: string; text: string; copyText: string; sourceIds: number[] }
  | { kind: "risk"; title: string; text: string; copyText: string; sourceIds: number[] }
  | { kind: "unavailable"; title: "Angle indisponible"; text: ""; copyText: ""; sourceIds: [] }

export type TerrainTopAccount = {
  name: string
  category: string
  commercialAngle: string
  confidence: string
  appetenceScore: number
  commercialEligibility?: "eligible" | "non_prospectable" | "unknown"
  isBenchmarkAccount?: boolean
}

export type TerrainValueChainStep = {
  id: string
  stageLabel: string
  activityLabel: string
  description: string
}

export type TerrainDependency = {
  name: string
  criticality: "haute" | "moyenne" | "faible" | null
  risk: string | null
  openService: string | null
}

const criticalityOrder: Record<NonNullable<TerrainDependency["criticality"]>, number> = {
  haute: 3,
  moyenne: 2,
  faible: 1,
}

export function resolveRegulatoryTiming(
  item: TerrainRegulatoryItem,
  now: Date = new Date(),
): { dateLabel: string | null; countdown: string | null; windowLabel: string | null } {
  if (item.timing.kind === "window") {
    return { dateLabel: null, countdown: null, windowLabel: item.timing.label }
  }

  if (item.timing.kind === "unavailable") {
    return { dateLabel: null, countdown: null, windowLabel: null }
  }

  const target = new Date(`${item.timing.date}T00:00:00`)
  const dateLabel = Number.isNaN(target.getTime())
    ? null
    : target.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Number.isNaN(target.getTime()) ? null : Math.ceil((target.getTime() - today.getTime()) / 86_400_000)

  return {
    dateLabel,
    countdown: days === null || days < 0 ? null : `J-${days}`,
    windowLabel: null,
  }
}

function dayInParis(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0")
  const utc = Date.UTC(value("year"), value("month") - 1, value("day"))
  return Math.floor((utc - Date.UTC(value("year"), 0, 0)) / 86_400_000)
}

export function getTerrainDailyAngle(
  marketTheses: TerrainMarketThesis[],
  riskOpportunities: TerrainRiskOpportunity[],
  now: Date = new Date(),
): TerrainDailyAngle {
  const day = dayInParis(now)
  const wantsMarket = day % 2 === 0
  const preferred = wantsMarket ? marketTheses : riskOpportunities
  const fallback = wantsMarket ? riskOpportunities : marketTheses
  const list = preferred.length > 0 ? preferred : fallback

  if (list.length === 0) {
    return { kind: "unavailable", title: "Angle indisponible", text: "", copyText: "", sourceIds: [] }
  }

  const item = list[day % list.length]
  if ("risk" in item) {
    const copyText = `RISQUE\n${item.risk}\n\nOPPORTUNITÉ\n${item.opportunity}`
    return { kind: "risk", title: "Risque × opportunité", text: item.risk, copyText, sourceIds: item.sourceIds }
  }

  return {
    kind: "market",
    title: item.title,
    text: item.text,
    copyText: item.text,
    sourceIds: item.sourceIds,
  }
}

export function rankTerrainAccounts(accounts: TerrainTopAccount[]): TerrainTopAccount[] {
  return accounts
    .filter((account) => account.commercialEligibility !== "non_prospectable")
    .toSorted((left, right) => right.appetenceScore - left.appetenceScore)
    .slice(0, 3)
}

export function selectTerrainEndpoints(steps: TerrainValueChainStep[]): TerrainValueChainStep[] {
  if (steps.length <= 1) return steps
  return [steps[0], steps[steps.length - 1]]
}

export function selectTerrainDependencies(dependencies: TerrainDependency[]): TerrainDependency[] {
  return dependencies
    .map((dependency, index) => ({ dependency, index }))
    .toSorted((left, right) => {
      const score = criticalityOrder[right.dependency.criticality ?? "faible"] - criticalityOrder[left.dependency.criticality ?? "faible"]
      return score === 0 ? left.index - right.index : score
    })
    .slice(0, 2)
    .map(({ dependency }) => dependency)
}
