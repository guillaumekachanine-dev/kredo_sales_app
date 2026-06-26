export type HiringKanbanStageKey =
  | "prequalification"
  | "entretien_manager"
  | "tests_techniques"
  | "proposition"
  | "signature"
  | "integration"

export interface HiringKanbanStageConfig {
  key: HiringKanbanStageKey
  label: string
  color: string
}

export const HIRING_KANBAN_STAGES: readonly HiringKanbanStageConfig[] = [
  { key: "prequalification", label: "Préqualification", color: "#8B5CF6" },
  { key: "entretien_manager", label: "Entretien manager", color: "var(--color-primary)" },
  { key: "tests_techniques", label: "Tests techniques", color: "#F59E0B" },
  { key: "proposition", label: "Proposition", color: "var(--color-info)" },
  { key: "signature", label: "Signature", color: "var(--color-success)" },
  { key: "integration", label: "Intégration", color: "#14B8A6" },
] as const

export type RecruitmentStageKey =
  | "identification"
  | "prequalification"
  | "cv_envoye"
  | "entretien_client"
  | "issue"

export interface RecruitmentStageConfig {
  key: RecruitmentStageKey
  label: string
  color: string
  statuses: readonly string[]
}

export const RECRUITMENT_STAGES: readonly RecruitmentStageConfig[] = [
  {
    key: "identification",
    label: "Identifié",
    color: "var(--color-primary)",
    statuses: ["identifie", "propose_interne"],
  },
  {
    key: "prequalification",
    label: "Préqualification",
    color: "#8B5CF6",
    statuses: ["preselectionne"],
  },
  {
    key: "cv_envoye",
    label: "CV envoyé",
    color: "var(--color-info)",
    statuses: ["envoye_client"],
  },
  {
    key: "entretien_client",
    label: "Entretien client",
    color: "#3B82F6",
    statuses: ["entretien_planifie", "entretien_realise"],
  },
  {
    key: "issue",
    label: "Issue",
    color: "var(--color-muted)",
    statuses: ["retenu", "gagne", "refuse_client", "refuse_candidat", "abandonne"],
  },
] as const

export const RECRUITMENT_TERMINAL_STATUSES = new Set(
  RECRUITMENT_STAGES.find((stage) => stage.key === "issue")?.statuses ?? [],
)

const STAGE_BY_STATUS = new Map<string, RecruitmentStageKey>(
  RECRUITMENT_STAGES.flatMap((stage) =>
    stage.statuses.map((status) => [status, stage.key] as const),
  ),
)

const STAGE_LABEL_BY_STATUS: Record<string, string> = {
  identifie: "Identifié",
  propose_interne: "Proposé interne",
  preselectionne: "Présélectionné",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien planifié",
  entretien_realise: "Entretien réalisé",
  retenu: "Retenu",
  gagne: "Gagné",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const CANONICAL_STATUS_BY_STAGE: Record<RecruitmentStageKey, string> = {
  identification: "identifie",
  prequalification: "preselectionne",
  cv_envoye: "envoye_client",
  entretien_client: "entretien_planifie",
  issue: "retenu",
}

export function mapRecruitmentStatusToStage(
  status: string | null | undefined,
): RecruitmentStageKey {
  return STAGE_BY_STATUS.get(normalizeRecruitmentKey(status)) ?? "issue"
}

export function getRecruitmentStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeRecruitmentKey(status)
  return (
    STAGE_LABEL_BY_STATUS[normalized] ??
    (normalized ? normalized.replaceAll("_", " ") : "Non renseigné")
  )
}

export function getRecruitmentStageColor(stage: RecruitmentStageKey): string {
  return (
    RECRUITMENT_STAGES.find((item) => item.key === stage)?.color ??
    "var(--color-muted)"
  )
}

export function getRecruitmentCanonicalStatus(stage: RecruitmentStageKey): string {
  return CANONICAL_STATUS_BY_STAGE[stage]
}

export function getRecruitmentSourceLabel(source: string | null | undefined): string {
  const normalized = normalizeRecruitmentKey(source)

  if (normalized === "collaborateur") return "Interne"
  if (normalized === "referral" || normalized === "cooptation") return "Cooptation"
  if (normalized === "linkedin") return "LinkedIn"
  if (normalized === "jobboard") return "Job board"
  if (normalized === "recrutement") return "Recrutement"
  if (normalized === "ai" || normalized === "ai_suggestion" || normalized === "suggestion_ia")
    return "IA"

  return normalized ? normalized.replaceAll("_", " ") : "—"
}

export function normalizeRecruitmentKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}
