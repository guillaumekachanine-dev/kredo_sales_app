import type { SegmentResourceKey } from "../data/business-intelligence-workspace-types"

export type BiChapter =
  | "home"
  | "sector-analysis"
  | "competitive-environment"
  | "regulatory-calendar"
  | "value-chain"
  | "sector-news"

export type BiChapterDefinition = {
  id: BiChapter
  label: string
  mobileLabel: string
  resource: SegmentResourceKey | null
}

export const BI_CHAPTERS: readonly BiChapterDefinition[] = [
  { id: "home", label: "Accueil", mobileLabel: "Terrain", resource: null },
  { id: "sector-analysis", label: "Analyse sectorielle", mobileLabel: "Analyse", resource: "study" },
  { id: "competitive-environment", label: "Environnement concurrentiel", mobileLabel: "Concurrence", resource: "competitiveMap" },
  { id: "regulatory-calendar", label: "Calendrier réglementaire", mobileLabel: "Réglementation", resource: "regulatory" },
  { id: "value-chain", label: "Chaîne de valeur", mobileLabel: "Chaîne", resource: "valueChain" },
  { id: "sector-news", label: "Actualités sectorielles", mobileLabel: "Actualités", resource: "news" },
] as const

const CANONICAL_CHAPTERS = new Set<BiChapter>(BI_CHAPTERS.map((chapter) => chapter.id))

const LEGACY_CHAPTERS: Record<string, BiChapter> = {
  priorities: "home",
  sectors: "sector-analysis",
  competitive_env: "competitive-environment",
  windows: "regulatory-calendar",
  value_chain: "value-chain",
}

export function resolveBiChapter(value: string | null | undefined): BiChapter {
  if (value && CANONICAL_CHAPTERS.has(value as BiChapter)) return value as BiChapter
  if (value && LEGACY_CHAPTERS[value]) return LEGACY_CHAPTERS[value]
  return "home"
}

export function isCanonicalBiChapter(value: string | null | undefined): value is BiChapter {
  return Boolean(value && CANONICAL_CHAPTERS.has(value as BiChapter))
}

export function buildBusinessIntelligenceHref(segmentId: string, chapter: BiChapter): string {
  const params = new URLSearchParams({ segment: segmentId, tab: chapter })
  return `/intelligence?${params.toString()}`
}

export function replaceBiChapterInHref(
  currentHref: string,
  segmentId: string,
  chapter: BiChapter,
): string {
  const url = new URL(currentHref, "https://kredo.local")
  url.pathname = "/intelligence"
  url.searchParams.set("segment", segmentId)
  url.searchParams.set("tab", chapter)
  url.searchParams.delete("competitiveSegment")
  return `${url.pathname}?${url.searchParams.toString()}`
}
