"use client"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import { cn } from "@/lib/utils"

interface OpportunityStaffingTabProps {
  opportunity: AssistanceCaseOpportunity
  activePositioningId: string | null
  onOpenCandidate: (positioning: AssistanceCasePositioning) => void
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

const STATUS_VARIANTS: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  identifie: "neutral",
  preselectionne: "info",
  propose_interne: "brand",
  envoye_client: "brand",
  entretien_planifie: "warning",
  entretien_realise: "warning",
  retenu: "success",
  refuse_client: "danger",
  refuse_candidat: "danger",
  abandonne: "neutral",
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

export function OpportunityStaffingTab({
  opportunity,
  activePositioningId,
  onOpenCandidate,
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
        <div className="space-y-2">
          {opportunity.opportunity_candidates.map((positioning) => {
            const candidate = positioning.candidate
            const isActive = activePositioningId === positioning.id
            const topSkills = (candidate.person?.person_skills ?? [])
              .filter((item) => item.profile_rank !== null)
              .sort((left, right) => (left.profile_rank ?? 99) - (right.profile_rank ?? 99))
              .slice(0, 3)

            return (
              <article
                key={positioning.id}
                className={cn(
                  "rounded-[var(--radius-large)] border bg-surface p-3.5 transition-colors",
                  isActive ? "border-primary/45 bg-primary/[0.035]" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-heading">
                        {getCandidateName(positioning)}
                      </p>
                      <Badge variant={STATUS_VARIANTS[positioning.status] ?? "neutral"} size="sm">
                        {STATUS_LABELS[positioning.status] ?? positioning.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-muted">
                      {candidate.current_title ?? "Intitulé non renseigné"}
                    </p>
                  </div>
                  <Button
                    variant={isActive ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => onOpenCandidate(positioning)}
                  >
                    Voir côté candidat
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[10px]">
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
                    <p className="font-bold uppercase tracking-wider text-muted">Prochaine action</p>
                    <p className="mt-1 line-clamp-2 font-semibold text-body">
                      {positioning.next_action ?? "À définir"}
                    </p>
                  </div>
                </div>

                {topSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topSkills.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-1 text-[10px] font-semibold text-primary"
                      >
                        #{item.profile_rank} {item.skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
