export interface StageItem {
  value: string
  label: string
  color: string
}

export interface TimelineConfig {
  nominal: StageItem[]
  terminal: StageItem[]
}

export const NEED_TIMELINE_CONFIG: TimelineConfig = {
  nominal: [
    { value: "qualification", label: "Qualification", color: "var(--color-case-need-border, #FFC107)" },
    { value: "recherche_profil", label: "Recherche profils", color: "var(--color-case-need-border, #FFC107)" },
    { value: "cv_envoyes", label: "CV envoyés", color: "var(--color-case-need-border, #FFC107)" },
    { value: "entretien_client", label: "Entretien client", color: "var(--color-case-need-border, #FFC107)" },
    { value: "contractualisation", label: "Contractualisation", color: "var(--color-case-need-border, #FFC107)" },
    { value: "gagne", label: "Gagné", color: "var(--color-case-need-border, #FFC107)" },
  ],
  terminal: [
    { value: "perdu", label: "Perdu", color: "var(--color-danger, #EF4444)" },
    { value: "abandonne", label: "Abandonné", color: "var(--color-warning, #F59E0B)" },
    { value: "non_traitee", label: "Non traitée", color: "var(--color-muted, #6B7280)" },
  ],
}

export const STAFFING_TIMELINE_CONFIG: TimelineConfig = {
  nominal: [
    { value: "identifie", label: "Identifié", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "propose_interne", label: "Proposé en interne", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "preselectionne", label: "Présélectionné", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "envoye_client", label: "CV envoyé", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "entretien_planifie", label: "Entretien planifié", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "entretien_realise", label: "Entretien réalisé", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "retenu", label: "Retenu", color: "var(--color-case-candidate-border, #9C27B0)" },
    { value: "gagne", label: "Gagné", color: "var(--color-case-candidate-border, #9C27B0)" },
  ],
  terminal: [
    { value: "refuse_client", label: "Refus client", color: "var(--color-danger, #EF4444)" },
    { value: "refuse_candidat", label: "Refus candidat", color: "var(--color-danger, #EF4444)" },
    { value: "abandonne", label: "Abandonné", color: "var(--color-warning, #F59E0B)" },
  ],
}
