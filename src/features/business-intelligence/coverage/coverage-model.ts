import type {
  SegmentResourceAvailability,
  SegmentResourceCoverage,
  SegmentResourceKey,
} from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"

export type CoverageItem = {
  key: SegmentResourceKey
  label: string
  chapter: BiChapter | null
  availability: SegmentResourceAvailability
}

const COVERAGE_DEFINITIONS: ReadonlyArray<Pick<CoverageItem, "key" | "label" | "chapter">> = [
  { key: "study", label: "Étude", chapter: "sector-analysis" },
  { key: "competitiveMap", label: "Concurrence", chapter: "competitive-environment" },
  { key: "regulatory", label: "Réglementation", chapter: "regulatory-calendar" },
  { key: "valueChain", label: "Chaîne de valeur", chapter: "value-chain" },
  { key: "news", label: "Actualités", chapter: "sector-news" },
  { key: "playbook", label: "Playbook", chapter: null },
]

export function buildCoverageItems(coverage: SegmentResourceCoverage): CoverageItem[] {
  return COVERAGE_DEFINITIONS.map((definition) => ({
    ...definition,
    availability: coverage[definition.key],
  }))
}

export function coverageDetail(availability: SegmentResourceAvailability): string | null {
  if (!availability.available || !availability.level) return null
  if (availability.level === "segment") return "Origine segment"
  if (availability.level === "macro") return "Origine macro"
  if (availability.level === "locked") return "Résolution verrouillée"
  return "Résolution estimée"
}

export function formatCoverageDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}
