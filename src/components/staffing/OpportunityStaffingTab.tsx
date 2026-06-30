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

function getMcoStaffing(positioning: AssistanceCasePositioning) {
  return positioning.comment ?? positioning.client_feedback ?? positioning.positioning_origin ?? "Non renseigné"
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
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Profils</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
            {opportunity.opportunity_candidates.length}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Envoyés</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">{sent}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Retenus</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
            {retained} / {opportunity.required_headcount}
          </p>
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
                  isActive && "border-primary/35",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-block h-0 w-0 shrink-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-primary"
                      />
                      <p className="truncate text-sm font-bold text-heading">
                        {getCandidateName(positioning)}
                        <span className="ml-1.5 inline-block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                          - {STATUS_LABELS[positioning.status] ?? positioning.status}
                        </span>
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-muted">
                      {candidate.current_title ?? "Intitulé non renseigné"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenCandidate(positioning)}
                    className="h-7 px-2.5 text-[10px] border-primary/50 text-primary hover:bg-primary/5 hover:border-primary focus-visible:ring-primary"
                    leftIcon={<ChangeArrowIcon />}
                  >
                    candidat
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-border/70 pt-3 text-[10px]">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-muted">Disponibilité</p>
                    <p className="mt-1 font-semibold text-body">{getAvailability(positioning)}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-muted">Prétentions</p>
                    <p className="mt-1 font-semibold text-body">
                      {formatSalary(candidate.expected_salary)}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-muted">MCO staffing</p>
                    <p className="mt-1 font-semibold text-body">
                      {(() => {
                        const expectedSalary = candidate.expected_salary
                        const targetDailyRate = opportunity.target_daily_rate
                        if (!expectedSalary || !targetDailyRate) return "—"
                        const yearlyCost = expectedSalary * 1.45
                        const dailyCost = yearlyCost / 210
                        const margin = (targetDailyRate - dailyCost) / targetDailyRate
                        const marginPct = Math.round(margin * 100)
                        return `${marginPct}%`
                      })()}
                    </p>
                  </div>
                </div>

                <div className="mt-4.5 text-[10px]">
                  <p className="font-bold uppercase tracking-wider text-muted">Prochaine action</p>
                  <p className="mt-1 font-semibold text-body flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0">
                      {positioning.next_action ?? "À définir"}
                    </span>
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
