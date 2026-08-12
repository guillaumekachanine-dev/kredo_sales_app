import type { CompetitiveMapActor } from "../data/competitive-map-workspace-types"

export function resolveCompetitiveMapSelection(
  actors: CompetitiveMapActor[],
  requestedActorId: string | null,
): string | null {
  if (requestedActorId && actors.some((actor) => actor.id === requestedActorId)) return requestedActorId
  return actors.find((actor) => actor.isBenchmarkAccount)?.id ?? actors[0]?.id ?? null
}
