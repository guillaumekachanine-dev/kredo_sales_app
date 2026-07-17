"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/formatters"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { OpportunityTimelinePanel } from "./OpportunityTimelinePanel"

interface OpportunityTimelineTabProps {
  data: OpportunityDetailData
  isMobile: boolean
  onRefresh: () => void
  onCreateTask: () => void
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/70 py-3 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-1 text-xs font-semibold leading-5 text-heading">{value}</dd>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  note: "Note commerciale",
  appel: "Appel",
  email: "Email",
  rdv_client: "Rendez-vous client",
  relance: "Relance",
  envoi_cv: "CV envoyé au client",
  entretien_client: "Entretien client",
  changement_etape: "Changement d’étape",
  proposition: "Proposition commerciale",
  signature: "Contractualisation",
  perte: "Opportunité perdue",
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value))
}

function TimelineGlyph({ type }: { type: string }) {
  if (type === "changement_etape") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === "envoi_cv" || type === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 5h16v14H4zM4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === "entretien_client" || type === "rdv_client") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c.5-3.2 2.2-5 5-5s4.5 1.8 5 5m-1.5-4.2c1-.6 2-.8 3-.8 2.8 0 4.5 1.8 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CompactTimeline({ data, onAdd }: { data: OpportunityDetailData; onAdd: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-heading">Timeline commerciale</h2>
          <p className="mt-0.5 text-[11px] text-body">Qualification et closing</p>
        </div>
        <button type="button" onClick={onAdd} className="flex size-10 items-center justify-center rounded-[var(--radius-medium)] border border-primary/40 bg-surface text-xl font-medium text-primary" aria-label="Ajouter un événement">
          +
        </button>
      </div>

      {data.events.length === 0 ? (
        <p className="py-5 text-xs italic text-muted">Aucun événement renseigné.</p>
      ) : (
        <ol className="relative before:absolute before:bottom-4 before:left-[4.65rem] before:top-4 before:w-px before:bg-border">
          {data.events.map((event) => {
            const upcoming = new Date(event.occurred_at).getTime() > new Date(data.opportunity.updated_at).getTime()
            return (
              <li key={event.id} className="grid min-h-[3.7rem] grid-cols-[3.75rem_1.75rem_minmax(0,1fr)] items-start gap-3 border-b border-border/60 py-2 last:border-b-0">
                <time className="pt-1 text-[10px] font-semibold text-body">{formatTimelineDate(event.occurred_at)}</time>
                <span className={`relative z-10 flex size-7 items-center justify-center rounded-[var(--radius-medium)] border bg-canvas ${upcoming ? "border-warning/40 text-warning" : "border-primary/25 text-primary"}`}>
                  <span className="size-3.5"><TimelineGlyph type={event.event_type} /></span>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-heading">{EVENT_LABELS[event.event_type] ?? event.event_type.replaceAll("_", " ")}</p>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold ${upcoming ? "border-warning/25 bg-warning/10 text-warning" : "border-success/20 bg-success/10 text-success"}`}>
                      {upcoming ? "À venir" : "Terminé"}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-body">{event.body ?? "Aucun détail additionnel."}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export function OpportunityTimelineTab({
  data,
  isMobile,
  onRefresh,
  onCreateTask,
}: OpportunityTimelineTabProps) {
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const { opportunity } = data
  const nextMilestone = opportunity.next_action_label ?? "Prochain jalon à qualifier"
  const nextMilestoneDate = opportunity.next_action_at
    ? formatDate(opportunity.next_action_at)
    : "Échéance non renseignée"

  if (isMobile) {
    return showMobileEditor ? (
      <section>
        <button type="button" onClick={() => setShowMobileEditor(false)} className="mb-4 text-xs font-semibold text-primary">← Retour à la timeline</button>
        <OpportunityTimelinePanel
          opportunityId={opportunity.id}
          events={data.events}
          onRefresh={onRefresh}
          title="Nouvel événement"
          initiallyAdding
          embedded
        />
      </section>
    ) : <CompactTimeline data={data} onAdd={() => setShowMobileEditor(true)} />
  }

  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">03 — Activité commerciale</p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Timeline commerciale</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
        Les échanges, jalons et changements d’étape restent contenus dans cette vue dédiée.
      </p>

      <div className="mt-7 grid gap-10 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <OpportunityTimelinePanel
          opportunityId={opportunity.id}
          events={data.events}
          onRefresh={onRefresh}
          title="Historique détaillé"
          embedded
        />
        <aside className="border-l border-border pl-8">
          <div className="border-l-[3px] border-warning pl-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-status-warning-ink)]">Prochain jalon</p>
            <p className="mt-1 text-sm font-bold text-heading">{nextMilestone}</p>
            <p className="mt-0.5 text-xs text-body">{nextMilestoneDate}</p>
          </div>
          <dl className="mt-6 border-t border-border">
            <ContextRow label="Dernière mise à jour" value={formatDate(opportunity.updated_at)} />
            <ContextRow label="Prochaine action" value={opportunity.next_action_label ?? "À qualifier"} />
            <ContextRow label="Échéance cible" value={opportunity.target_close_date ? formatDate(opportunity.target_close_date) : "Non renseignée"} />
          </dl>
          <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={onCreateTask}>
            Créer une tâche
          </Button>
        </aside>
      </div>
    </section>
  )
}
