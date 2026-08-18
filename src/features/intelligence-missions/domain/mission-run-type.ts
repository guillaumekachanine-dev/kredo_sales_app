const MISSION_RUN_TYPE_PREFIX = "mission:" as const

export type MissionRunType = `${typeof MISSION_RUN_TYPE_PREFIX}${string}`

export function buildMissionRunType(slug: string): MissionRunType {
  return `${MISSION_RUN_TYPE_PREFIX}${slug}`
}

export function isMissionRunType(
  runType: string | null | undefined,
): runType is MissionRunType {
  return typeof runType === "string" && runType.startsWith(MISSION_RUN_TYPE_PREFIX)
}
