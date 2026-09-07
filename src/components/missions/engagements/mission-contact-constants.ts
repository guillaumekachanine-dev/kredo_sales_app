export const MISSION_CONTACT_ROLES = [
  "Manager opérationnel",
  "Direction métier",
  "Décideur",
  "Valideur CRA",
  "Facturation",
] as const

export type MissionContactRole = (typeof MISSION_CONTACT_ROLES)[number]
