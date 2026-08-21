export function buildCompetitiveMapUrl(segmentId: string): string {
  const params = new URLSearchParams({
    tab: "competitive_env",
    segment: segmentId,
  })

  return `/intelligence?${params.toString()}`
}
