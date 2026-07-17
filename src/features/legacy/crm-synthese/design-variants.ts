export const SYNTHESE_DESIGN_VARIANTS = [
  "editorial",
  "intelligence-map",
  "control-room",
] as const

export type SyntheseDesignVariant = (typeof SYNTHESE_DESIGN_VARIANTS)[number]

export function parseSyntheseDesignVariant(value: string | null | undefined): SyntheseDesignVariant | null {
  if (value === "editorial" || value === "intelligence-map" || value === "control-room") {
    return value
  }

  return null
}
