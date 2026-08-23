import type { BusinessIntelligenceCatalog, BusinessIntelligenceCatalogSegment } from "../data/business-intelligence-workspace-types"

export type FlatCatalogSegment = {
  segment: BusinessIntelligenceCatalogSegment
  macroName: string
  macroSlug: string
}

export type SplitCatalogSegments = {
  available: FlatCatalogSegment[]
  upcoming: FlatCatalogSegment[]
}

export function splitCatalogSegmentsByAvailability(catalog: BusinessIntelligenceCatalog): SplitCatalogSegments {
  const flat: FlatCatalogSegment[] = catalog.macros.flatMap((macro) =>
    macro.segments.map((segment) => ({ segment, macroName: macro.name, macroSlug: macro.slug })),
  )
  const byName = (a: FlatCatalogSegment, b: FlatCatalogSegment) => a.segment.name.localeCompare(b.segment.name, "fr")
  const available = flat.filter((entry) => entry.segment.coverage.study.available).sort(byName)
  const upcoming = flat.filter((entry) => !entry.segment.coverage.study.available).sort(byName)
  return { available, upcoming }
}
