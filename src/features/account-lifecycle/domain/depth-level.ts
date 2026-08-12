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

/** Libellé cockpit (étape 0 « Socle ») — cf. ADR-0019 D-1, tableau des paliers. */
export const ACCOUNT_DEPTH_LEVEL_LABELS: Record<AccountDepthLevel, string> = {
  mapped: "Citation cartographie",
  noted: "Pense-bête CRM",
  qualified: "Socle vérifié",
  active: "Chaîne de décision engagée",
}

/**
 * Vocabulaire visuel du badge de palier — partagé entre l'étape 0 du cockpit
 * (Lot 3, `ClientIntelligenceSocleTab`) et la liste comptes / le drawer
 * minimal (Lot 6), pour éviter la divergence que l'ADR redoute explicitement
 * (§ Conséquences négatives, D-3).
 */
export const ACCOUNT_DEPTH_BADGE_TONE: Record<AccountDepthLevel, string> = {
  mapped: "bg-surface-hover text-muted border-border",
  noted: "bg-warning/10 text-warning border-warning/25",
  qualified: "bg-success/10 text-success border-success/25",
  active: "bg-primary/10 text-primary border-primary/20",
}

/** `companies.origin` — ce qui a fait naître la fiche (ADR-0019 D-1). */
export const ACCOUNT_ORIGIN_LABELS: Record<string, string> = {
  manual: "Créé manuellement",
  competitive_map: "Cartographie concurrentielle",
  scan: "Scan",
  import: "Import",
  folio: "Import FOLIO",
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
