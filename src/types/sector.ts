export type SectorStatus = 'active' | 'development' | 'watch'
export type PracticeKey = 'data_ai' | 'cloud_eng' | 'product' | 'cyber'
export type Urgency = 'critical' | 'high' | 'medium' | 'low'
export type EventType =
  | 'regulatory' | 'market' | 'competitor'
  | 'appointment' | 'tender' | 'report' | 'other'

export interface KeyPlayer { name: string; note: string; size: string }

export interface Persona { role: string; enjeu: string; peur: string }
export interface Objection { objection: string; reponse: string }

/**
 * Transparence d'une étude : ce qu'elle ne prouve pas.
 *
 * Ce n'est pas un aveu de faiblesse, c'est ce qui rend le reste défendable —
 * en rendez-vous, ça dit au commercial ce qu'il peut affirmer et ce qu'il doit
 * formuler au conditionnel. Toutes les clés sont optionnelles : une étude peut
 * n'avoir de réserve que sur un seul axe.
 */
export interface SectorCaveats {
  /** Les verbatims sont-ils réels, ou absents du corpus ? */
  verbatims?: string
  /** Les fréquences sont-elles un comptage tracé, ou invérifiables ? */
  frequences?: string
  /** Taille et nature du corpus ayant servi à l'étude. */
  corpus?: string
  /** Provenance et fraîcheur des chiffres de marché. */
  marche?: string
  /** URLs consultées en recherche externe. */
  sources?: string[]
}
export interface SectorPlaybook {
  personas: Persona[]
  roi_arguments: string[]
  objections: Objection[]
  entry_points: string[]
}

export interface SectorIntelligence {
  id: string
  name: string
  slug: string
  description: string | null
  status: SectorStatus
  attractiveness_score: number | null
  market_size_eur_bn: number | null
  market_growth_pct: number | null
  digital_maturity: 'low' | 'medium' | 'high' | null
  practices_fit: Record<PracticeKey, number>
  key_players_paca: KeyPlayer[]
  key_players_national: KeyPlayer[]
  avg_tjm_min: number | null
  avg_tjm_max: number | null
  playbook: SectorPlaybook
  /** NULL = aucune réserve déclarée, ce qui est en soi un signal. */
  caveats: SectorCaveats | null
  created_at: string
  updated_at: string
}

export interface SectorPainPoint {
  id: string
  title: string
  description: string | null
  frequency_count: number
  kredo_practice: PracticeKey | 'multi' | null
  verbatim: string | null
}

export interface SectorRegulatoryItem {
  id: string
  name: string
  authority: string | null
  description: string | null
  deadline_date: string | null
  urgency: Urgency
  kredo_practice: PracticeKey | 'multi' | null
  commercial_angle: string | null
  is_commercial_window: boolean
  /**
   * Source officielle confirmant `deadline_date` (EUR-Lex, Legifrance, régulateur).
   * NULL alors que `deadline_date` est renseignée = date non vérifiée : à citer
   * comme « échéance à confirmer », jamais comme un fait.
   */
  source_url: string | null
}

export interface SectorEvent {
  id: string
  title: string
  event_type: EventType
  description: string | null
  event_date: string | null
  commercial_opportunity: string | null
  status: 'pending' | 'acted' | 'dismissed'
}

export interface SectorCompany {
  id: string
  name: string
  website: string | null
  revenue: string | null
  lifecycle_status: string
}

export interface SectorWithRelations extends SectorIntelligence {
  pain_points: SectorPainPoint[]
  regulatory_items: SectorRegulatoryItem[]
  events: SectorEvent[]
  companies: SectorCompany[]
  errors?: {
    pain_points?: boolean
    regulatory_items?: boolean
    events?: boolean
    companies?: boolean
  }
}
