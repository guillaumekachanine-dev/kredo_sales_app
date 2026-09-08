export const COCKPIT_MODULE_IDS = [
  "priorities",
  "meetings",
  "opportunities",
  "weeklyBrief",
  "signals",
] as const

export type CockpitModuleId = (typeof COCKPIT_MODULE_IDS)[number]
