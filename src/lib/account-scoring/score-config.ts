import type { LifecycleBucket, ScoreComponentKey } from "./types"

// ADR-0011 §4.1 — une seule grille V1, pas de score_profile multiple.
export const SCORE_VERSION = "v1.0"

export const BASE_WEIGHTS: Record<ScoreComponentKey, number> = {
  C1_fit: 20,
  C2_potential: 25,
  C3_signals: 20,
  C4_relational: 15,
  C5_momentum: 20,
  // Bonus additif, uniquement calculé pour les clients actifs (cf. compute-account-score.ts).
  C6_active_value: 15,
}

// ADR-0011 §4.1 — un lifecycle_multiplier par composant plutôt que 4 grilles séparées.
export const LIFECYCLE_MULTIPLIERS: Record<LifecycleBucket, Record<ScoreComponentKey, number>> = {
  prospect: {
    C1_fit: 1.0,
    C2_potential: 1.0,
    C3_signals: 1.0,
    C4_relational: 1.0,
    C5_momentum: 1.0,
    C6_active_value: 0,
  },
  active: {
    C1_fit: 0.8,
    C2_potential: 0.7,
    C3_signals: 1.0,
    C4_relational: 0.8,
    C5_momentum: 1.2,
    C6_active_value: 1.0,
  },
  dormant: {
    C1_fit: 0.8,
    C2_potential: 0.8,
    C3_signals: 1.2,
    C4_relational: 0.6,
    C5_momentum: 1.0,
    C6_active_value: 0,
  },
}

export function getLifecycleBucket(lifecycleStatus: string): LifecycleBucket {
  if (lifecycleStatus === "client_actif") return "active"
  if (lifecycleStatus === "client_dormant" || lifecycleStatus === "ancien_client") return "dormant"
  return "prospect"
}

// ADR-0011 §3 — règle UX de bandes. U ("Unqualified") prime sur tout le reste :
// sous ce seuil de confiance, le chiffre ne doit jamais être pris au sérieux.
export const CONFIDENCE_UNQUALIFIED_THRESHOLD = 40

export const SCORE_BAND_THRESHOLDS = {
  A: { minScore: 75, minConfidence: 70 },
  B: { minScore: 60, minConfidence: 50 },
  C: { minScore: 40, minConfidence: 0 },
} as const
