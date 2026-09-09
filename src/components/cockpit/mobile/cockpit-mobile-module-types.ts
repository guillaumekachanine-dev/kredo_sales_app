export const COCKPIT_MODULE_IDS = [
  "priorities",
  "meetings",
  "opportunities",
  "weeklyBrief",
  "signals",
] as const

export type CockpitModuleId = (typeof COCKPIT_MODULE_IDS)[number]

export const COCKPIT_WEEK_MODULE_IDS = ["weeklyBrief", "priorities", "opportunities"] as const
export type CockpitWeekModuleId = (typeof COCKPIT_WEEK_MODULE_IDS)[number]
