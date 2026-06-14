export type SectorStatus = 'active' | 'development' | 'watch'
export type PracticeKey = 'data_ai' | 'cloud_eng' | 'product' | 'cyber'
export type Urgency = 'critical' | 'high' | 'medium' | 'low'
export type EventType =
  | 'regulatory' | 'market' | 'competitor'
  | 'appointment' | 'tender' | 'report' | 'other'

export interface KeyPlayer { name: string; note: string; size: string }

export interface Persona { role: string; enjeu: string; peur: string }
export interface Objection { objection: string; reponse: string }
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
  revenue: string | null
  lifecycle_status: string
  ai_score: number | null
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
