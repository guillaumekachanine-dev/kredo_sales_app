// ─── Intelligence sectorielle — contrat d'artefact ──────────────────────────
// Lot 0. `result_type = "sector_intelligence_analysis"`, `schema_version: 1`.
//
// Rattachement : SECTEUR, jamais compte. Un artefact sectoriel est mutualisé
// entre tous les comptes du secteur — y glisser une analyse propre au compte
// ouvert le rendrait faux pour les 20 autres comptes qui le lisent.
// La vérification mécanique de ce rattachement vit dans les validateurs
// (validateSectorArtifactBinding).
//
// Distinct de `SECTOR_SNAPSHOT_RESULT_TYPE` (account-intelligence-contracts.ts),
// qui est un cache déterministe minimal (top pain points, prochaine échéance)
// calculé en TypeScript sans LLM. Les deux coexistent : le snapshot répond
// « quoi de chaud maintenant », cet artefact-ci porte l'étude de fond.

import type { Claim, DeterministicIndicator, QualitySummary } from "./intelligence-common-contracts"

export const SECTOR_INTELLIGENCE_ANALYSIS_RESULT_TYPE = "sector_intelligence_analysis" as const

// ─── Références vers l'existant ─────────────────────────────────────────────
// Les pain points et fenêtres commerciales sont déjà des entités opérationnelles
// (tables `sector_pain_points`, `sector_regulatory_items`, `sector_events`).
// L'artefact les RÉFÉRENCE au lieu de les recopier : dupliquer leur libellé ici
// garantirait une divergence dès la première correction en base.

export type SectorPainPointRef = {
  /** UUID de `sector_pain_points.id`. */
  pain_point_id: string
}

/**
 * Une fenêtre commerciale provient soit d'une échéance réglementaire, soit d'un
 * événement sectoriel — deux tables distinctes, d'où la discrimination
 * explicite plutôt qu'un UUID nu qu'on ne saurait pas résoudre.
 */
export type SectorCommercialWindowRef = {
  source_table: "sector_regulatory_items" | "sector_events"
  id: string
}

// ─── Sections ───────────────────────────────────────────────────────────────

export type SectorMarket = {
  france_size: Claim | null
  europe_size: Claim | null
  growth: Claim | null
  trends: Claim[]
  growth_drivers: Claim[]
  threats: Claim[]
}

/**
 * Température structurelle du secteur. Échelle volontairement courte : trois
 * paliers qu'un commercial peut trancher sans ambiguïté, plutôt qu'un score
 * continu qu'aucune donnée actuelle ne permet de justifier.
 */
export type SectorTemperature = "cold" | "warm" | "hot"

export type SectorStructuralSignals = {
  temperature: SectorTemperature
  summary: Claim | null
  major_signals: Claim[]
}

export type SectorCompetitor = {
  name: string
  /** Chaîne libre (« ~15 % »), telle que sourcée — pas de conversion numérique. */
  market_share_estimate: string | null
  note: Claim | null
}

export type SectorCompetitiveEnvironment = {
  leaders: SectorCompetitor[]
  challengers: SectorCompetitor[]
  emerging: SectorCompetitor[]
  outsiders: SectorCompetitor[]
}

export type SectorValueChainArchetype = {
  description: Claim | null
  links: Claim[]
  dependencies: Claim[]
  vulnerabilities: Claim[]
}

export type SectorRegulation = {
  current_regulations: Claim[]
  certifications: Claim[]
  compliance_risks: Claim[]
}

export interface SectorIntelligenceAnalysisContent {
  schema_version: 1
  /** UUID de `sector_intelligence.id`. Clé de rattachement de l'artefact. */
  sector_id: string
  sector_summary: Claim | null
  market: SectorMarket
  structural_signals: SectorStructuralSignals
  competitive_environment: SectorCompetitiveEnvironment
  value_chain_archetype: SectorValueChainArchetype
  regulation: SectorRegulation
  pain_points: SectorPainPointRef[]
  commercial_windows: SectorCommercialWindowRef[]
  /**
   * Indicateurs déterministes optionnels (0 token) : concentration du parc,
   * pression réglementaire… Absents tant qu'aucune méthode n'est calibrée —
   * mieux vaut le champ vide qu'un score inventé.
   */
  indicators?: DeterministicIndicator[]
  source_coverage: QualitySummary
  generated_at: string
}
