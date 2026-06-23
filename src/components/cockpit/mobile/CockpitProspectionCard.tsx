import React from "react"
import { ProspectionMetricVm, ProspectionPriorityVm } from "./cockpit-mobile-view-model"
import { IconRadar } from "./icons"

interface CockpitProspectionCardProps {
  metrics: ProspectionMetricVm[]
  priorities: ProspectionPriorityVm[]
  onPitchClick: (company: string, companyId: string | null) => void
  onActionClick: (company: string) => void
  onBack?: () => void
}

export function CockpitProspectionCard({
  metrics,
  priorities,
  onPitchClick,
  onActionClick,
  onBack,
}: CockpitProspectionCardProps) {
  return (
    <section className="flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500 text-white shadow-sm shadow-violet-500/20 shrink-0">
          <IconRadar />
        </span>
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-heading flex-1">
          Prospection
        </h2>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[10px] font-bold text-violet-600 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2.5 py-1 hover:bg-violet-500/20 transition-all select-none focus:outline-none"
          >
            Revenir
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2" aria-label="Métriques prospection">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-surface border border-violet-500/10 rounded-xl p-2 flex flex-col justify-between min-h-[64px] text-center"
          >
            <span className="text-[8px] font-bold uppercase tracking-wider text-muted truncate">
              {metric.label}
            </span>
            <strong className="text-sm font-extrabold text-violet-600 my-0.5">
              {metric.value}
            </strong>
            <small className="text-[7px] text-body opacity-80 truncate">
              {metric.detail}
            </small>
          </div>
        ))}
      </div>

      {/* Priorities List */}
      {priorities.length === 0 ? (
        <div className="text-center py-6 text-muted bg-surface border border-border/50 rounded-xl">
          <strong className="text-xs font-bold text-heading">Aucune priorité de prospection</strong>
          <p className="text-[10px] mt-1">Toutes les priorités de la semaine sont traitées.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {priorities.map((priority) => (
            <article
              key={priority.id}
              className="bg-surface border border-border/50 rounded-xl p-3.5 flex flex-col gap-2.5 relative overflow-hidden"
            >
              <div className="flex flex-col min-w-0">
                <h3 className="text-xs font-bold text-heading truncate">{priority.company}</h3>
                <p className="text-[10px] text-body mt-0.5 truncate">{priority.reason}</p>
              </div>

              <div className="bg-canvas/30 rounded-lg p-2.5 text-[10px] leading-relaxed text-heading border border-border/20 mt-1">
                <span className="text-muted block text-[8px] font-bold uppercase tracking-wider mb-0.5">Prochaine action</span>
                <span className="font-semibold">{priority.nextMove}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none shadow-sm shadow-violet-500/10"
                  onClick={() => onPitchClick(priority.company, priority.companyId || null)}
                >
                  Pitch IA
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-surface border border-border/80 hover:bg-surface-hover text-heading text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none"
                  onClick={() => onActionClick(priority.company)}
                >
                  Action
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
