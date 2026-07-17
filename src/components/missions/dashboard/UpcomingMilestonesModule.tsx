import Link from "next/link"
import { formatDateNumeric } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { EngagementMilestone, EngagementsOverviewViewModel } from "./engagements-overview-types"

interface UpcomingMilestonesModuleProps {
  milestones: EngagementsOverviewViewModel["milestones"]
  embedded?: boolean
}

function milestoneTypeLabel(item: EngagementMilestone): string {
  switch (item.sourceType) {
    case "mission_start": return "Début mission"
    case "mission_end": return "Fin mission"
    case "project_start": return "Début projet"
    case "project_end": return "Fin projet"
    case "project_phase": return "Phase"
    case "billing_milestone": return "Facturation"
    case "calendar_event": return "Agenda"
  }
}

export function UpcomingMilestonesModule({ milestones, embedded = false }: UpcomingMilestonesModuleProps) {
  const visible = [...milestones.overdue, ...milestones.next30Days].slice(0, 6)
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-heading">Échéances des 30 prochains jours</h2>
          <p className="mt-0.5 text-[10px] font-semibold text-body">
            {milestones.endingWithin60Days} engagement{milestones.endingWithin60Days > 1 ? "s" : ""} arrive{milestones.endingWithin60Days > 1 ? "nt" : ""} à échéance sous 60 jours
          </p>
        </div>
        <Link href="/agenda" className="shrink-0 text-[10px] font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          Agenda
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-center text-xs text-muted">
          Aucune échéance à 30 jours ni engagement à clôturer.
        </div>
      ) : (
        <ol className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-hidden">
          {visible.map((item) => (
            <li key={item.id} className="grid grid-cols-[68px_8px_minmax(0,1fr)] items-center gap-2">
              <div className="text-right">
                <p className={cn("font-mono text-[10px] font-bold", item.urgency === "overdue" ? "text-danger" : "text-heading")}>{formatDateNumeric(item.date).slice(0, 5)}</p>
                <p className="text-[8px] uppercase tracking-wide text-muted">{milestoneTypeLabel(item)}</p>
              </div>
              <span className={cn(
                "h-2 w-2 rounded-full border-2",
                item.urgency === "overdue" && "border-danger bg-danger/15",
                item.urgency === "soon" && "border-warning bg-warning/15",
                item.urgency === "normal" && "border-primary bg-primary/15",
              )} aria-hidden="true" />
              <div className="min-w-0 border-l border-border pl-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className={cn("text-[10px] font-semibold text-heading", embedded ? "break-words" : "truncate")} title={item.title}>{item.title}</p>
                  {item.urgency === "overdue" && (
                    <span className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[8px] font-bold text-danger">Dépassée</span>
                  )}
                </div>
                <p className={cn("text-[9px] text-muted", embedded ? "break-words" : "truncate")} title={`${item.companyName} · ${item.detail ?? ""}`}>
                  {item.companyName}{item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )

  if (embedded) return <div className="flex min-h-0 flex-col">{content}</div>
  return (
    <section className="col-span-5 flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface p-4" aria-label="Échéances des engagements">
      {content}
    </section>
  )
}
