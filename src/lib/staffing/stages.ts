export type StaffingStageKey = 'identifie' | 'prequal' | 'cv_envoye' | 'entretien_client' | 'issue';

export interface StaffingStageConfig {
  key: StaffingStageKey;
  label: string;
  color: string;
}

export const STAFFING_STAGES: StaffingStageConfig[] = [
  { key: 'identifie', label: 'Identifié', color: 'var(--color-primary)' },
  { key: 'prequal', label: 'Préqualification', color: '#8B5CF6' },
  { key: 'cv_envoye', label: 'CV envoyé', color: 'var(--color-info)' },
  { key: 'entretien_client', label: 'Entretien client', color: '#3B82F6' },
  { key: 'issue', label: 'Issue', color: 'var(--color-muted)' },
];

export function mapDbStatusToStaffingStage(status: string): StaffingStageKey {
  switch (status) {
    case 'identifie':
    case 'propose_interne':
      return 'identifie';
    case 'preselectionne':
      return 'prequal';
    case 'envoye_client':
      return 'cv_envoye';
    case 'entretien_planifie':
    case 'entretien_realise':
      return 'entretien_client';
    case 'retenu':
    case 'gagne':
    case 'refuse_client':
    case 'refuse_candidat':
    case 'abandonne':
    default:
      return 'issue';
  }
}
