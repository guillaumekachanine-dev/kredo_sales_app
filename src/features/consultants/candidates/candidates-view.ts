// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Candidats : helpers de présentation (Lot 8)
//
//  Libellés et petites dérivations d'affichage partagés entre les vues Desktop
//  et Mobile. Aucune logique métier (elle vit dans le builder du Lot 7).
// ─────────────────────────────────────────────────────────────────────────────

import type { StatusPillVariant } from "@/components/ui/StatusPill"
import { HIRING_PROCESS_STAGES } from "@/lib/recruitment/recruitment-stages"
import { CANDIDATE_LIFECYCLE_STATUSES } from "@/lib/recruitment/candidate-lifecycle"
import type {
  CandidateAvailabilityBucket,
  CandidatePipelineState,
} from "@/features/consultants/candidates/data/consultants-candidates.types"

export const PIPELINE_STATE_META: Record<
  CandidatePipelineState,
  { label: string; short: string; variant: StatusPillVariant }
> = {
  in_process: { label: "En process", short: "Process", variant: "inProgress" },
  pool: { label: "Vivier actif", short: "Vivier", variant: "info" },
  closed: { label: "Clôturé", short: "Clos", variant: "neutral" },
}

export const AVAILABILITY_BUCKET_META: Record<
  CandidateAvailabilityBucket,
  { label: string; variant: StatusPillVariant }
> = {
  immediate: { label: "Disponible", variant: "success" },
  scheduled: { label: "À venir", variant: "warning" },
  unknown: { label: "À préciser", variant: "neutral" },
}

export const HIRING_STEP_LABEL: Record<string, string> = Object.fromEntries(
  HIRING_PROCESS_STAGES.map((stage) => [stage.key, stage.label]),
)

/** Options du sélecteur inline de lifecycle — aligné sur le legacy `RecruitmentListView`. */
export const LIFECYCLE_EDIT_OPTIONS = [
  "qualifie",
  "vivier",
  "en_process",
  "recrute",
  "ko_manager",
  "refuse",
  "indisponible",
  "archive",
] as const

export const LIFECYCLE_LABEL: Record<string, string> = Object.fromEntries(
  CANDIDATE_LIFECYCLE_STATUSES.map((entry) => [entry.key, entry.label]),
)

export function candidateInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return `${first}${last}`.toUpperCase() || "?"
}

const AVATAR_TONES = [
  "bg-primary/[0.12] text-primary",
  "bg-success/[0.12] text-success",
  "bg-info/[0.12] text-info",
  "bg-accent/[0.12] text-accent",
]

export function candidateAvatarTone(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_TONES[code % AVATAR_TONES.length]
}

/** `12000` → `"12k"`, `12500` → `"12,5k"`, `null` → `"—"`. */
export function formatSalaryK(value: number | null | undefined): string {
  if (!value) return "—"
  const k = Math.round((value / 1000) * 10) / 10
  return k % 1 === 0 ? `${k.toFixed(0)}k` : `${k.toFixed(1).replace(".", ",")}k`
}
