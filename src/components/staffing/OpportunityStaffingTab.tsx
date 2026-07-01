"use client"

import { Button } from "@/components/ui/Button"
import type {
  AssistanceCaseEvent,
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import { cn } from "@/lib/utils"

interface OpportunityStaffingTabProps {
  opportunity: AssistanceCaseOpportunity
  events: AssistanceCaseEvent[]
  activePositioningId: string | null
  onOpenCandidate: (positioning: AssistanceCasePositioning) => void
  onOpenNextActionEvent: (eventId: string) => void
  onCreateNextActionEvent: (positioning: AssistanceCasePositioning) => void
}

const STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  preselectionne: "Présélectionné",
  propose_interne: "Proposé en interne",
  envoye_client: "CV envoyé",
  entretien_planifie: "Entretien planifié",
  entretien_realise: "Entretien réalisé",
  retenu: "Retenu",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const CANDIDATE_ACCENT = "#9C27B0"

function getCandidateName(positioning: AssistanceCasePositioning) {
  const person = positioning.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Profil sans nom"
  )
}

function getAvailability(positioning: AssistanceCasePositioning) {
  const candidate = positioning.candidate
  if (candidate.available_from) {
    return new Date(candidate.available_from).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
  return candidate.availability_notes ?? candidate.availability ?? "Non renseignée"
}

function formatSalary(value: number | null) {
  if (value === null) return "—"
  return `${Math.round(value / 1000)} k€`
}

function getMcoStaffing(
  positioning: AssistanceCasePositioning,
  opportunity: AssistanceCaseOpportunity,
) {
  const expectedSalary = positioning.candidate.expected_salary
  const targetDailyRate = opportunity.target_daily_rate

  if (!expectedSalary || !targetDailyRate) return "—"

  const yearlyCost = expectedSalary * 1.45
  const dailyCost = yearlyCost / 210
  const margin = (targetDailyRate - dailyCost) / targetDailyRate
  const marginPct = Math.round(margin * 100)

  return `${String(Math.max(0, marginPct)).padStart(2, "0")}%`
}

function getNextActionEvent(
  positioning: AssistanceCasePositioning,
  events: AssistanceCaseEvent[],
) {
  const relatedEvents = events.filter((event) => {
    if (event.opportunity_candidate_id) return event.opportunity_candidate_id === positioning.id
    return event.candidate_id === positioning.candidate.id
  })

  if (relatedEvents.length === 0) return null

  const now = Date.now()
  const upcomingEvents = relatedEvents
    .filter((event) => new Date(event.starts_at).getTime() >= now)
    .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())

  if (upcomingEvents.length > 0) return upcomingEvents[0]

  return relatedEvents
    .slice()
    .sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime())[0]
}

function ChangeArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M16 8.25A6.25 6.25 0 0 0 5.28 5.03L4 6.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 3.75v2.5h2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 11.75a6.25 6.25 0 0 0 10.72 3.22L16 13.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 13.75H16v2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ActionArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 8h8" strokeLinecap="round" />
      <path d="m8.5 3 4.5 5-4.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function OpportunityStaffingTab({
  opportunity,
  events,
  activePositioningId,
  onOpenCandidate,
  onOpenNextActionEvent,
  onCreateNextActionEvent,
}: OpportunityStaffingTabProps) {
  const retained = opportunity.opportunity_candidates.filter(
    (positioning) => positioning.status === "retenu",
  ).length
  const sent = opportunity.opportunity_candidates.filter((positioning) =>
    ["envoye_client", "entretien_planifie", "entretien_realise", "retenu"].includes(
      positioning.status,
    ),
  ).length

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden px-1 py-1 sm:grid sm:grid-cols-3 sm:gap-2 sm:px-0 sm:py-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-1 top-1 h-10 w-14 -skew-x-[22deg] rounded-sm opacity-70 sm:hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,84,184,0.18) 0%, rgba(37,84,184,0.03) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-2 h-7 w-8 -skew-x-[22deg] rounded-sm opacity-80 sm:hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(198,146,20,0.24) 0%, rgba(198,146,20,0.04) 100%)",
          }}
        />

        <div className="grid grid-cols-3 gap-3 pt-1 sm:contents">
          <div className="min-w-0 px-1 sm:rounded-[var(--radius-medium)] sm:border sm:border-border sm:bg-surface sm:px-3 sm:py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted">Profils</p>
            <p className="mt-1 font-heading text-[1.1rem] font-bold leading-none text-heading tabular-nums sm:text-lg">
              {opportunity.opportunity_candidates.length}
            </p>
          </div>
          <div className="min-w-0 border-l border-border/35 px-1.5 sm:rounded-[var(--radius-medium)] sm:border sm:border-border sm:bg-surface sm:px-3 sm:py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted">Envoyés</p>
            <p className="mt-1 font-heading text-[1.1rem] font-bold leading-none text-heading tabular-nums sm:text-lg">{sent}</p>
          </div>
          <div className="min-w-0 border-l border-border/35 px-1.5 sm:rounded-[var(--radius-medium)] sm:border sm:border-border sm:bg-surface sm:px-3 sm:py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted">Retenus</p>
            <p className="mt-1 font-heading text-[1.1rem] font-bold leading-none text-heading tabular-nums sm:text-lg">
              {retained} / {opportunity.required_headcount}
            </p>
          </div>
        </div>
      </section>

      {opportunity.opportunity_candidates.length === 0 ? (
        <div className="rounded-[var(--radius-large)] border border-dashed border-border py-12 text-center">
          <p className="text-sm font-semibold text-heading">Aucun profil positionné</p>
          <p className="mt-1 text-xs text-muted">
            Le staffing doit encore être initialisé pour ce besoin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunity.opportunity_candidates.map((positioning) => {
            const candidate = positioning.candidate
            const isActive = activePositioningId === positioning.id
            const nextActionEvent = getNextActionEvent(positioning, events)
            const nextActionLinkLabel = nextActionEvent ? "Voir" : "Créer"

            return (
              <article
                key={positioning.id}
                className={cn(
                  "border-b border-border/70 px-1 pb-3.5 transition-colors last:border-b-0",
                  isActive && "bg-[color:var(--color-candidate-accent)]/[0.03]",
                )}
                style={{ ["--color-candidate-accent" as string]: CANDIDATE_ACCENT }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 grid-cols-[8px_minmax(0,1fr)] gap-x-2">
                      <span
                        aria-hidden="true"
                        className="mt-[0.38rem] inline-block h-0 w-0 shrink-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-primary"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-heading">
                          {getCandidateName(positioning)}
                          <span className="ml-1.5 inline-block text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                            - {STATUS_LABELS[positioning.status] ?? positioning.status}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-heading">
                          {candidate.current_title ?? "Intitulé non renseigné"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenCandidate(positioning)}
                    className="h-6 min-w-0 rounded-[9px] px-2 text-[9px] hover:bg-[color:var(--color-candidate-accent)]/6 focus-visible:ring-[color:var(--color-candidate-accent)]"
                    style={{
                      borderColor: CANDIDATE_ACCENT,
                      color: CANDIDATE_ACCENT,
                      ["--color-candidate-accent" as string]: CANDIDATE_ACCENT,
                    }}
                    leftIcon={<ChangeArrowIcon />}
                  >
                    candidat
                  </Button>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-3 pl-[10px] text-[10px]">
                  <div className="min-w-0">
                    <p className="font-bold uppercase tracking-wider text-muted">Disponibilité</p>
                    <p className="mt-1 font-semibold text-body">{getAvailability(positioning)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold uppercase tracking-wider text-muted">Prétentions</p>
                    <p className="mt-1 font-semibold text-body">
                      {formatSalary(candidate.expected_salary)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold uppercase tracking-wider text-muted">MCO staffing</p>
                    <p className="mt-1 font-semibold text-body">{getMcoStaffing(positioning, opportunity)}</p>
                  </div>
                </div>

                <div className="mt-4.5 pl-[10px] text-[10px]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-bold uppercase tracking-wider text-muted">
                      Prochaine action
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        nextActionEvent
                          ? onOpenNextActionEvent(nextActionEvent.id)
                          : onCreateNextActionEvent(positioning)
                      }
                      className="inline-flex shrink-0 items-center gap-1 font-bold text-primary transition-opacity hover:opacity-80 focus-visible:outline-none"
                    >
                      <span>{nextActionLinkLabel}</span>
                      <span className="size-3" aria-hidden="true">
                        <ActionArrowIcon />
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 font-semibold text-body">
                    {positioning.next_action ?? "À définir"}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
