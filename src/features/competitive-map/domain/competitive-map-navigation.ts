export function buildCompetitiveMapUrl(segmentId: string): string {
  const params = new URLSearchParams({
    tab: "competitive_env",
    competitiveSegment: segmentId,
  })

  return `/intelligence?${params.toString()}`
}
