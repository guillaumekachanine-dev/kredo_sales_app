"use client"

import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { fetchAgendaLight } from "@/lib/agenda/agenda-light-client-queries"
import { ModuleLoadingDrawer } from "./ModuleLoadingDrawer"
import { useModuleSnapshot } from "./use-module-snapshot"

const TITLE = "Agenda light"

/**
 * Module « Agenda light » : les rendez-vous à venir, en lecture seule, pour les
 * pages qui ne sont pas l'Agenda. Aucune planification ici — pour créer ou
 * déplacer un événement, on va sur /agenda, et le module y renvoie.
 */
export function AgendaLightModule({ onClose }: { onClose: () => void }) {
  const state = useModuleSnapshot(fetchAgendaLight)

  if (state.status !== "ready") {
    return (
      <ModuleLoadingDrawer
        open
        onOpenChange={(next) => { if (!next) onClose() }}
        title={TITLE}
        isError={state.status === "error"}
        message={state.status === "error" ? state.message : "Chargement des prochains rendez-vous…"}
      />
    )
  }

  const { days, summary, horizonDays } = state.data

  return (
    <AppDrawer
      open
      onOpenChange={(next) => { if (!next) onClose() }}
      title={TITLE}
      description={`Prochains rendez-vous sur ${horizonDays} jours`}
      side="right"
      width="wide"
      showMobileCloseButton
      headerClassName="border-b border-edito-brass/70 bg-edito-navy pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
      contentClassName="bg-edito-canvas p-4"
    >
      <div className="space-y-4">
        <p className="text-[11px] leading-relaxed text-edito-muted">
          {summary.totalEvents} rendez-vous à venir, dont {summary.todayCount} aujourd&apos;hui.
        </p>

        {days.length === 0 ? (
          <p className="rounded-[var(--radius-medium)] border border-edito-border px-4 py-6 text-xs text-edito-muted">
            Aucun rendez-vous dans les {horizonDays} prochains jours.
          </p>
        ) : (
          days.map((day) => (
            <section key={day.dateKey} className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-edito-muted">
                {day.isToday ? `Aujourd'hui · ${day.dayLabel}` : day.dayLabel}
              </h4>
              <ul className="divide-y divide-edito-border">
                {day.events.map((event) => (
                  <li key={event.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="w-14 shrink-0 text-[11px] font-bold tabular-nums text-edito-body">
                      {event.timeLabel}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-edito-body">
                        {event.title}
                        {event.isInProgress && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-primary">
                            en cours
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] leading-snug text-edito-muted">
                        {[event.typeLabel, event.companyName, event.location].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <Link
          href="/agenda"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-medium)] bg-brand-primary px-4 text-sm font-bold text-primary-fg transition-colors hover:bg-brand-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Ouvrir l&apos;Agenda
        </Link>
      </div>
    </AppDrawer>
  )
}
