import type { PrepareDayResult as PrepareDayResultData } from "@/lib/intelligence/actions/prepare-day"
import { formatDateNumeric } from "@/lib/formatters"

function formatTime(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value))
}

function preparednessLabel(value: PrepareDayResultData["events"][number]["preparedness"]) {
  if (value === "ready") return "Prêt"
  if (value === "needs_prep") return "À préparer"
  return "Sans contexte"
}

export function PrepareDayResult({ result }: { result: PrepareDayResultData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">Journée</p>
        <p className="mt-1 text-base font-bold text-primary-fg">{formatDateNumeric(`${result.date}T12:00:00.000Z`)}</p>
      </div>

      <section className="space-y-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-brass">Timeline</h3>
        {result.events.length === 0 ? (
          <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
            Aucun événement agenda aujourd&apos;hui.
          </p>
        ) : (
          <div className="space-y-2.5">
            {result.events.map((event) => (
              <article key={event.id} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 shrink-0 text-xs font-bold tabular-nums text-brand-brass">
                    {formatTime(event.startsAt)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary-fg/70">
                        {preparednessLabel(event.preparedness)}
                      </span>
                      <span className="text-[10px] text-primary-fg/45">{event.eventType}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{event.title}</p>
                    <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-primary-fg/55">
                      {event.context.companyName && <p>{event.context.companyName}</p>}
                      {event.context.contactName && <p>{event.context.contactName}{event.context.contactRole ? ` · ${event.context.contactRole}` : ""}</p>}
                      {event.context.candidateName && <p>{event.context.candidateName}{event.context.candidateStep ? ` · ${event.context.candidateStep}` : ""}</p>}
                      {event.context.linkedOpportunityTitle && <p>Opp. {event.context.linkedOpportunityTitle}</p>}
                      {event.context.lastInteractionDaysAgo !== undefined && <p>Dernière interaction il y a {event.context.lastInteractionDaysAgo} jours</p>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-brass">Tâches dues</h3>
        {result.tasksDue.length === 0 ? (
          <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">Aucune tâche due.</p>
        ) : (
          result.tasksDue.map((task) => (
            <div key={task.id} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold leading-snug text-primary-fg">{task.title}</p>
                <span className="shrink-0 rounded-full bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary-fg/65">
                  {task.priority}
                </span>
              </div>
              {task.entityLabel && <p className="mt-1 text-[11px] text-primary-fg/50">{task.entityLabel}</p>}
              {task.isOverdue && <p className="mt-1 text-[11px] font-semibold text-danger">En retard</p>}
            </div>
          ))
        )}
      </section>

      {result.alerts.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-brass">Alertes</h3>
          {result.alerts.map((alert) => (
            <a key={`${alert.type}:${alert.entityId}`} href={alert.link} className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs font-semibold text-primary-fg hover:bg-primary-fg/[0.07]">
              {alert.message}
            </a>
          ))}
        </section>
      )}

      {result.sourceIssues.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Données partielles : {result.sourceIssues.join(" ")}
        </div>
      )}
    </div>
  )
}
