import { RecruitmentInitiationButton } from "./RecruitmentInitiationDialog"
import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import { getPositioningHiringProcesses } from "@/types/assistance-case"

interface OpportunityRecruitmentTabProps {
  opportunity: AssistanceCaseOpportunity
  onOpenCandidateRecruitment: (positioning: AssistanceCasePositioning) => void
  onInitiateRecruitment: (positioning: AssistanceCasePositioning) => void
}

const STEP_LABELS: Record<string, string> = {
  prequalification: "Préqualification",
  entretien_manager: "Entretien manager",
  tests_techniques: "Tests techniques",
  proposition: "Proposition",
  signature: "Signature",
  integration: "Intégration",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  hired: "Recruté",
  rejected: "Refusé",
  withdrawn: "Retiré",
  cancelled: "Annulé",
}

const ACTIVE_STEP_ACCENT = "#004080"
const SUCCESS_ACCENT = "#00C853"
const DANGER_ACCENT = "#FF5252"
const WARNING_ACCENT = "#FFC107"
const NEUTRAL_ACCENT = "#607D8B"

function getCandidateName(positioning: AssistanceCasePositioning) {
  const person = positioning.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Profil sans nom"
  )
}

function getPrimaryProcess(positioning: AssistanceCasePositioning) {
  const processes = getPositioningHiringProcesses(positioning)
  return (
    processes.find((process) => process.status === "active") ??
    processes.slice().sort((left, right) =>
      right.started_at.localeCompare(left.started_at),
    )[0] ??
    null
  )
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatSalary(value: number | null) {
  if (value === null || value === undefined) return "—"

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getEmployabilityScore(positioning: AssistanceCasePositioning) {
  const candidate = positioning.candidate
  const seniority = candidate.seniority?.toLowerCase() ?? ""
  const experienceYears = candidate.experience_years ?? 0

  let score = 1

  if (
    experienceYears >= 8 ||
    /(senior|lead|manager|principal|expert|staff|direct)/.test(seniority)
  ) {
    score = 3
  } else if (
    experienceYears >= 4 ||
    /(confirm|interm|mid|consultant)/.test(seniority)
  ) {
    score = 2
  }

  return `${score}/3`
}

function getBadgeStyle(status: string) {
  switch (status) {
    case "active":
      return {
        borderColor: `${ACTIVE_STEP_ACCENT}2e`,
        backgroundColor: `${ACTIVE_STEP_ACCENT}14`,
        color: ACTIVE_STEP_ACCENT,
      }
    case "hired":
      return {
        borderColor: `${SUCCESS_ACCENT}2e`,
        backgroundColor: `${SUCCESS_ACCENT}14`,
        color: SUCCESS_ACCENT,
      }
    case "rejected":
      return {
        borderColor: `${DANGER_ACCENT}2e`,
        backgroundColor: `${DANGER_ACCENT}14`,
        color: DANGER_ACCENT,
      }
    case "withdrawn":
      return {
        borderColor: `${WARNING_ACCENT}2e`,
        backgroundColor: `${WARNING_ACCENT}18`,
        color: "#B7791F",
      }
    default:
      return {
        borderColor: `${NEUTRAL_ACCENT}2e`,
        backgroundColor: `${NEUTRAL_ACCENT}14`,
        color: NEUTRAL_ACCENT,
      }
  }
}

function RecruitmentProcessBadge({
  process,
}: {
  process: NonNullable<ReturnType<typeof getPrimaryProcess>>
}) {
  const label =
    process.status === "active"
      ? STEP_LABELS[process.current_step] ?? process.current_step
      : STATUS_LABELS[process.status] ?? process.status

  return (
    <div
      className="max-w-[10.5rem] rounded-[4px] border px-2.5 py-1 text-right text-[10px] font-bold leading-tight"
      style={getBadgeStyle(process.status)}
      title={label}
    >
      <span className="block truncate">{label}</span>
    </div>
  )
}

function InlineViewLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 align-middle text-[10px] font-bold text-primary transition-opacity hover:opacity-75 focus-visible:outline-none"
    >
      <span>voir</span>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-3"
        aria-hidden="true"
      >
        <path d="M3.5 8h8" strokeLinecap="round" />
        <path d="m8.5 3 4.5 5-4.5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function DataBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-heading">{value}</p>
    </div>
  )
}

export function OpportunityRecruitmentTab({
  opportunity,
  onOpenCandidateRecruitment,
  onInitiateRecruitment,
}: OpportunityRecruitmentTabProps) {
  const rows = opportunity.opportunity_candidates.map((positioning) => ({
    positioning,
    process: getPrimaryProcess(positioning),
  }))

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-large)] border border-dashed border-border py-12 text-center">
          <p className="text-sm font-semibold text-heading">Aucun recrutement lié</p>
          <p className="mt-1 text-xs text-muted">
            Aucun profil n&apos;est encore positionné sur ce besoin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ positioning, process }) => (
            <article
              key={positioning.id}
              className="border-b border-border/70 px-1 pb-3.5 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold text-heading">
                      {getCandidateName(positioning)}
                    </p>
                    {process ? (
                      <InlineViewLink
                        onClick={() => onOpenCandidateRecruitment(positioning)}
                      />
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-muted">
                    {positioning.candidate.current_title ?? "Intitulé non renseigné"}
                  </p>
                </div>
                {process ? (
                  <RecruitmentProcessBadge process={process} />
                ) : (
                  <RecruitmentInitiationButton
                    label="Initier"
                    onClick={() => onInitiateRecruitment(positioning)}
                    className="h-7 rounded-[9px] px-2.5 text-[10px] sm:h-7"
                  />
                )}
              </div>

              {process ? (
                <div className="mt-2.5 grid grid-cols-3 gap-3 pt-3">
                  <DataBlock
                    label="Séniorité"
                    value={positioning.candidate.seniority ?? "—"}
                  />
                  <DataBlock
                    label="Salaire"
                    value={formatSalary(positioning.candidate.expected_salary)}
                  />
                  <DataBlock
                    label="Employabilité"
                    value={getEmployabilityScore(positioning)}
                  />
                </div>
              ) : null}

              {process ? (
                <p className="mt-2 text-[10px] font-medium text-muted">
                  Démarré le {formatDate(process.started_at)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
