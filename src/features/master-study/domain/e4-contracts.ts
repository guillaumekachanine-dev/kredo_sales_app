/**
 * Contrats TypeScript pour l'étude sectorielle E4 et le payload RPC d'ingestion.
 * Dérivés de `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json` et de l'ADR-0021.
 *
 * Écrits à la main conformément aux règles du projet (pas de générateur).
 */

export interface E4Meta {
  segment_slug: string
  macro_slug?: string
  date_snapshot: string
  acces_web: 'complet' | 'recherche_seule' | 'aucun' | 'conversion'
  confiance_plafond: 'haute' | 'moyenne' | 'faible'
  auteur?: string
  version?: string
}

export interface E4Perimetre {
  definition: string
  hors_champ: string[]
  regle_comparabilite: string
}

export interface E4These {
  id: number
  these: string
  src_ids: number[]
  donc_commercialement: string
}

export type E4MarketMetricStatus = 'published' | 'not_published' | 'not_applicable'

export interface E4Marche {
  taille_eur_bn?: number | null
  taille_statut?: E4MarketMetricStatus
  croissance_pct?: number | null
  croissance_statut?: E4MarketMetricStatus
  perimetre: string
  exercice?: number | null
  src_ids: number[]
  lecture?: string
  donc_commercialement?: string
}

export interface E4BlocClient {
  nom: string
  qui_finance: string
  cycle_budgetaire: string
  src_ids: number[]
}

export interface E4ModeleEconomique {
  nom: string
  description: string
  qui_signe: string
  quand_le_budget_est_engage?: string
  implication_achat_prestation: string
  src_ids: number[]
}

export interface E4Maillon {
  rang: number
  nom: string
  contenu: string
  acteurs_types?: string[]
  position_compte_etalon?: string | null
  ou_lesn_se_branche: string
  qui_y_est_deja?: string[]
  src_ids: number[]
}

export interface E4FrontTechnologique {
  nom: string
  etat: string
  zone_de_transition: boolean
  src_ids: number[]
}

export interface E4DependanceCritique {
  nom: string
  criticite: 'haute' | 'moyenne' | 'faible'
  situation?: string
  risque: string
  prestation_ouverte: string
  practice_kredo: string
  src_ids: number[]
}

export interface E4RegulatoryItem {
  reg_item_id?: string | null
  libelle: string
  statut: 'acquis' | 'proposition'
  deadline_date?: string | null
  authority: string
  source_url: string
  commercial_angle: string
  kredo_practice?: string | null
  portee?: 'segment' | 'macro'
}

export interface E4ChronologieItem {
  date: string
  fait: string
  portee?: string
  src_ids: number[]
}

export interface E4RisqueOpportunite {
  risque: string
  opportunite: string
  src_ids: number[]
}

export interface E4PainPoint {
  libelle: string
  frequency_count: number
  acteurs_nommes: string[]
  source_company_ids?: string[]
  src_ids: number[]
}

export interface E4Playbook {
  personas: Record<string, unknown>[]
  objections: Record<string, unknown>[]
  entry_points: Record<string, unknown>[]
  roi_arguments: Record<string, unknown>[]
  market_thesis?: Record<string, unknown>[]
  economic_models?: Record<string, unknown>[]
  tech_fronts?: Record<string, unknown>[]
  risks?: Record<string, unknown>[]
}

export interface E4Source {
  src_id: number
  publisher: string
  url: string
  tier: number
  atteste: string
  consulted_at: string
  corroboration_de?: number | null
}

export interface E4Trou {
  rubrique: string
  motif: string
  recherche_effectuee: string
}

export interface E4SectorKnowledgeOutput {
  meta: E4Meta
  perimetre: E4Perimetre
  theses: E4These[]
  message_sectoriel: string
  incertitudes?: string[]
  marche: E4Marche
  blocs_clients?: E4BlocClient[]
  modeles_economiques: E4ModeleEconomique[]
  maillons: E4Maillon[]
  fronts_technologiques?: E4FrontTechnologique[]
  dependances_critiques?: E4DependanceCritique[]
  regulation: E4RegulatoryItem[]
  chronologie?: E4ChronologieItem[]
  risques_opportunites?: E4RisqueOpportunite[]
  pain_points?: E4PainPoint[]
  playbook: E4Playbook
  sources: E4Source[]
  trous?: E4Trou[]
  compteurs: Record<string, number>
}

// ─── Types pour le payload de la RPC private.ingest_master_study_e4 ─────────

export interface MasterStudyEventPayload {
  title: string
  description: string
  event_type: 'regulatory' | 'market' | 'competitor' | 'appointment' | 'tender' | 'report' | 'other'
  event_date: string
  source_url: string | null
  commercial_opportunity: string | null
}

export interface MasterStudyPainPointPayload {
  title: string
  frequency_count: number
  source_company_ids: string[]
}

export interface MasterStudyRegulatoryItemPayload {
  name: string
  authority: string
  deadline_date: string | null
  source_url: string
  commercial_angle: string
  kredo_practice: string | null
  is_commercial_window: boolean
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

export interface MasterStudyValueChainNodePayload {
  maillon: number
  label: string
  description: string
}

export interface MasterStudySectorPatchPayload {
  description?: string | null
  market_size_eur_bn?: number | null
  market_growth_pct?: number | null
  resolution_locks?: Record<string, string>
  playbook_patch?: Record<string, unknown>
  caveats_patch?: Record<string, unknown>
}

export interface MasterStudyE4RpcPayload {
  segment_id: string
  study_snapshot_date: string
  run: {
    input_snapshot: unknown
    config: Record<string, unknown>
  }
  document: {
    title: string
    content_text: string | null
    content_json: unknown
    scope_json: Record<string, unknown>
  }
  sector_patch: MasterStudySectorPatchPayload
  events: MasterStudyEventPayload[]
  pain_points: MasterStudyPainPointPayload[]
  regulatory_items: MasterStudyRegulatoryItemPayload[]
  value_chain_nodes: MasterStudyValueChainNodePayload[]
}
