/**
 * ADR-0019 — l'axe unique de profondeur d'un compte : mapped → noted →
 * qualified → active. Monotone croissant, ne redescend jamais automatiquement
 * (D-1). Module pur, testable sans Supabase ; l'écriture en base vit dans
 * `actions/promote-account-depth.ts`, seul point d'écriture autorisé (D-2).
 */
export const ACCOUNT_DEPTH_LEVELS = ["mapped", "noted", "qualified", "active"] as const
export type AccountDepthLevel = (typeof ACCOUNT_DEPTH_LEVELS)[number]

const DEPTH_RANK: Record<AccountDepthLevel, number> = {
  mapped: 0,
  noted: 1,
  qualified: 2,
  active: 3,
}

export function isAccountDepthLevel(value: string): value is AccountDepthLevel {
  return (ACCOUNT_DEPTH_LEVELS as readonly string[]).includes(value)
}

/**
 * Une promotion n'est jamais une démotion : renvoie false si `target` est égal
 * ou inférieur à `current`. La transition est alors un no-op volontaire, pas
 * une erreur — `promoteAccountDepth` doit pouvoir être appelée en aveugle
 * (ex. après chaque application de scan) sans jamais faire régresser un compte.
 */
export function isPromotion(current: AccountDepthLevel, target: AccountDepthLevel): boolean {
  return DEPTH_RANK[target] > DEPTH_RANK[current]
}
