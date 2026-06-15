import type { Json } from './database'

// ─── Status unions (valeurs documentées en base) ───────────────────────────

export type CollaboratorStatus = 'actif' | 'inactif' | 'sortant' | 'en_formation'

export type MissionStatus = 'active' | 'paused' | 'ended' | 'cancelled'

export type MissionActivityReportStatus = 'draft' | 'submitted' | 'validated' | 'rejected'

// ─── Sous-interfaces (shapes des tables jointes) ───────────────────────────

/** Champs persons nécessaires au profil consultant (via collaborators.person_id) */
export interface ConsultantPerson {
  first_name: string | null
  last_name: string | null
  /** Colonne GENERATED côté Postgres : TRIM(first_name || ' ' || last_name) */
  full_name: string | null
}

/**
 * CRA mensuel (mission_activity_reports).
 * Jointure : mission_activity_reports.collaborator_id → collaborators.id
 *            mission_activity_reports.mission_id      → missions.id
 *
 * Note : employee_ref est une colonne STRING sur collaborators (identifiant RH),
 * pas une FK. La clé de jointure réelle est collaborator_id.
 */
export interface ConsultantActivityReport {
  id: string
  mission_id: string
  period_start: string
  period_end: string
  /** Jours ouvrés du mois (GENERATED en base) */
  business_days: number
  billable_days: number
  non_billable_days: number
  pto_days: number
  sick_days: number
  /** Snapshots financiers au moment de la validation */
  tjm_snapshot: number
  cjm_snapshot: number
  /** Taux d'activité en % (GENERATED : billable_days / business_days * 100) */
  activity_rate_percent: number | null
  status: MissionActivityReportStatus
  metadata: Json
}

/**
 * Mission d'un consultant (missions liée via missions.collaborator_id).
 * gross_margin_pct est une colonne GENERATED : ne jamais recalculer côté front.
 */
export interface ConsultantMission {
  id: string
  title: string
  status: MissionStatus
  start_date: string | null
  end_date: string | null
  /** TJM = Taux Journalier Moyen (vendu au client) */
  tjm: number
  /** CJM = Coût Journalier Moyen (coût interne chargé, ex-TACI) */
  cjm: number
  /** GENERATED : ROUND((tjm - cjm) / NULLIF(tjm, 0) * 100, 2) — lecture seule */
  gross_margin_pct: number | null
  activity_reports: ConsultantActivityReport[]
}

// ─── Interface principale ──────────────────────────────────────────────────

/**
 * Consultant — résultat de la jointure :
 *   collaborators
 *     ← persons            (via collaborators.person_id)
 *     ← missions           (via missions.collaborator_id)
 *         ← mission_activity_reports (via mission_activity_reports.mission_id + collaborator_id)
 */
export interface Consultant {
  // ── collaborators ──────────────────────────────
  id: string
  entry_date: string | null
  exit_date: string | null
  status: CollaboratorStatus
  current_title: string | null
  /** Identifiant RH interne (ex : matricule SIRH) — string, pas une FK */
  employee_ref: string | null
  metadata: Json

  // ── persons (via person_id) ────────────────────
  person: ConsultantPerson

  // ── missions (via collaborator_id) ─────────────
  missions: ConsultantMission[]
}
