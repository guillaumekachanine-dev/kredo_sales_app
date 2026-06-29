"use client"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import type {
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import { getPositioningHiringProcesses } from "@/types/assistance-case"

interface OpportunityRecruitmentTabProps {
  opportunity: AssistanceCaseOpportunity
  onOpenCandidateRecruitment: (positioning: AssistanceCasePositioning) => void
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

const STATUS_VARIANTS: Record<
  string,
  "neutral" | "brand" | "info" | "success" | "warning" | "danger"
> = {
  active: "brand",
  hired: "success",
  rejected: "danger",
  withdrawn: "warning",
  cancelled: "neutral",
}

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

export function OpportunityRecruitmentTab({
  opportunity,
  onOpenCandidateRecruitment,
}: OpportunityRecruitmentTabProps) {
  const rows = opportunity.opportunity_candidates.map((positioning) => ({
    positioning,
    process: getPrimaryProcess(positioning),
  }))
  const activeCount = rows.filter((row) => row.process?.status === "active").length
  const hiredCount = rows.filter((row) => row.process?.status === "hired").length

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Positionnés</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
            {rows.length}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Process actifs</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Recrutés</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading tabular-nums">
            {hiredCount}
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-large)] border border-dashed border-border py-12 text-center">
          <p className="text-sm font-semibold text-heading">Aucun recrutement lié</p>
          <p className="mt-1 text-xs text-muted">
            Aucun profil n&apos;est encore positionné sur ce besoin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ positioning, process }) => (
            <article
              key={positioning.id}
              className="rounded-[var(--radius-large)] border border-border bg-surface p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-heading">
                    {getCandidateName(positioning)}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-muted">
                    {positioning.candidate.current_title ?? "Intitulé non renseigné"}
                  </p>
                </div>
                {process ? (
                  <Badge variant={STATUS_VARIANTS[process.status] ?? "neutral"} size="sm">
                    {STATUS_LABELS[process.status] ?? process.status}
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Non lancé</Badge>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                    Étape actuelle
                  </p>
                  <p className="mt-1 text-xs font-semibold text-heading">
                    {process ? STEP_LABELS[process.current_step] ?? process.current_step : "Processus à initialiser"}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {process
                      ? `Démarré le ${formatDate(process.started_at)}`
                      : "Le candidat peut être étudié sans recrutement actif."}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenCandidateRecruitment(positioning)}
                >
                  Voir le recrutement
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
