// ─────────────────────────────────────────────────────────────────────────────
//  Référentiel canonique du lifecycle candidat (`candidates.status`).
//
//  Source de vérité unique du chantier Consultants Workspace (Lot 7, C-26 /
//  PRODUCT-3). La whitelist reproduit exactement celle de la Server Action
//  `src/app/(app)/recruitment/_actions/update-candidate-status.ts`
//  (`VALID_STATUSES`) — toute évolution se fait des deux côtés.
//
//  Les libellés FR étaient dupliqués dans trois composants recrutement
//  (`CandidateProfileEditor`, `CandidateReferenceProfile`, `RecruitmentListView`) ;
//  ils convergent vers ce module au Lot 8 (dette CAND-3).
// ─────────────────────────────────────────────────────────────────────────────

export type CandidateLifecycleStatus =
  | "nouveau"
  | "qualifie"
  | "vivier"
  | "propose"
  | "en_process"
  | "recrute"
  | "refuse"
  | "indisponible"
  | "archive"
  | "ko_manager"

export interface CandidateLifecycleStatusConfig {
  key: CandidateLifecycleStatus
  label: string
  /** `true` quand le candidat n'est plus un profil travaillable (fin de cycle). */
  terminal: boolean
}

export const CANDIDATE_LIFECYCLE_STATUSES: readonly CandidateLifecycleStatusConfig[] = [
  { key: "nouveau", label: "Nouveau", terminal: false },
  { key: "qualifie", label: "Qualifié", terminal: false },
  { key: "vivier", label: "Vivier", terminal: false },
  { key: "propose", label: "Proposé", terminal: false },
  { key: "en_process", label: "En process", terminal: false },
  { key: "indisponible", label: "Indisponible", terminal: false },
  { key: "recrute", label: "Recruté", terminal: true },
  { key: "refuse", label: "Refusé", terminal: true },
  { key: "ko_manager", label: "KO manager", terminal: true },
  { key: "archive", label: "Archivé", terminal: true },
] as const

const CONFIG_BY_KEY = new Map<string, CandidateLifecycleStatusConfig>(
  CANDIDATE_LIFECYCLE_STATUSES.map((entry) => [entry.key, entry]),
)

export const CANDIDATE_LIFECYCLE_STATUS_KEYS: ReadonlySet<string> = new Set(
  CANDIDATE_LIFECYCLE_STATUSES.map((entry) => entry.key),
)

export const CANDIDATE_TERMINAL_LIFECYCLE_STATUSES: ReadonlySet<string> = new Set(
  CANDIDATE_LIFECYCLE_STATUSES.filter((entry) => entry.terminal).map((entry) => entry.key),
)

export function isCandidateLifecycleStatus(
  value: string | null | undefined,
): value is CandidateLifecycleStatus {
  return typeof value === "string" && CANDIDATE_LIFECYCLE_STATUS_KEYS.has(value)
}

export function getCandidateLifecycleLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return CONFIG_BY_KEY.get(value)?.label ?? value.replaceAll("_", " ")
}

export function isTerminalCandidateLifecycle(value: string | null | undefined): boolean {
  return typeof value === "string" && CANDIDATE_TERMINAL_LIFECYCLE_STATUSES.has(value)
}
