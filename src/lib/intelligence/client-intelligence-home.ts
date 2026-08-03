import { VEILLE_RUNS_PER_MONTH } from "@/lib/automations/veille-cadence"
import type { SectorSnapshotRegulatoryItem } from "@/lib/intelligence/sector-snapshot-data"

export type AccountWatchSourceFlags = {
  includeOfficialSite: boolean
  includeNews: boolean
  includePublicRecords: boolean
  includeTenders: boolean
  includeSocialManual: boolean
}

const WATCH_SOURCE_LABELS: ReadonlyArray<{
  key: keyof AccountWatchSourceFlags
  label: string
}> = [
  { key: "includeOfficialSite", label: "Site officiel" },
  { key: "includeNews", label: "Actualités" },
  { key: "includePublicRecords", label: "Registres publics" },
  { key: "includeTenders", label: "Appels d’offres" },
  { key: "includeSocialManual", label: "Réseaux sociaux — manuel" },
]

const URGENCY_RANK: Readonly<Record<string, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function toDayTimestamp(value: string | null): number | null {
  if (!value) return null
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) ? timestamp : null
}

function urgencyRank(value: string): number {
  return URGENCY_RANK[value.toLowerCase()] ?? Number.MAX_SAFE_INTEGER
}

export function getMonitoredSourceLabels(flags: AccountWatchSourceFlags): string[] {
  return WATCH_SOURCE_LABELS.flatMap(({ key, label }) => flags[key] ? [label] : [])
}

export function estimateMonthlyWatchCost(
  averageCostPerRun: number | null,
  cadence: string,
): number | null {
  if (averageCostPerRun === null || !Number.isFinite(averageCostPerRun)) return null
  if (!(cadence in VEILLE_RUNS_PER_MONTH)) return null
  return averageCostPerRun * VEILLE_RUNS_PER_MONTH[cadence as keyof typeof VEILLE_RUNS_PER_MONTH]
}

export function selectPrimaryCommercialWindow(
  items: readonly SectorSnapshotRegulatoryItem[],
  now: Date = new Date(),
): SectorSnapshotRegulatoryItem | null {
  const windows = items.filter((item) => item.isCommercialWindow)
  if (windows.length === 0) return null

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const future = windows
    .map((item) => ({ item, deadline: toDayTimestamp(item.deadlineDate) }))
    .filter((entry): entry is { item: SectorSnapshotRegulatoryItem; deadline: number } =>
      entry.deadline !== null && entry.deadline >= today,
    )
    .sort((a, b) => {
      const urgencyDelta = urgencyRank(a.item.urgency) - urgencyRank(b.item.urgency)
      return urgencyDelta !== 0 ? urgencyDelta : a.deadline - b.deadline
    })

  if (future[0]) return future[0].item

  const undated = windows.find((item) => toDayTimestamp(item.deadlineDate) === null)
  if (undated) return undated

  const past = windows
    .map((item) => ({ item, deadline: toDayTimestamp(item.deadlineDate) }))
    .filter((entry): entry is { item: SectorSnapshotRegulatoryItem; deadline: number } =>
      entry.deadline !== null && entry.deadline < today,
    )
    .sort((a, b) => b.deadline - a.deadline)

  return past[0]?.item ?? null
}

export function isCommercialWindowExpired(
  item: SectorSnapshotRegulatoryItem,
  now: Date = new Date(),
): boolean {
  const deadline = toDayTimestamp(item.deadlineDate)
  if (deadline === null) return false
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return deadline < today
}
