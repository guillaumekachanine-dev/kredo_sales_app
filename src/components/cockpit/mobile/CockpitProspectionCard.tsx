import React from "react"
import { ProspectionMetricVm, ProspectionPriorityVm } from "./cockpit-mobile-view-model"

interface CockpitProspectionCardProps {
  metrics: ProspectionMetricVm[]
  priorities: ProspectionPriorityVm[]
  onPitchClick: (company: string, companyId: string | null) => void
  onActionClick: (company: string) => void
}

export function CockpitProspectionCard({
  metrics,
  priorities,
  onPitchClick,
  onActionClick,
}: CockpitProspectionCardProps) {
  return (
    <section className="module-panel">
      <div className="module-head">
        <h2>Prospection</h2>
      </div>

      <div className="metric-row" aria-label="Métriques prospection">
        {metrics.map((metric) => (
          <div key={metric.id} className="metric-cell">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </div>
        ))}
      </div>

      <div className="stack-list">
        {priorities.length === 0 ? (
          <div className="empty-state-card">
            <strong>Aucune priorité de prospection</strong>
            <p>Toutes les priorités de la semaine sont traitées.</p>
          </div>
        ) : (
          priorities.map((priority) => (
            <article key={priority.id} className="stack-row compact-row">
              <div className="stack-row-top">
                <div className="row-heading row-heading-compact">
                  <div>
                    <h3>{priority.company}</h3>
                    <p>{priority.reason}</p>
                  </div>
                </div>
              </div>

              <div className="meeting-body">
                <strong>{priority.nextMove}</strong>
              </div>

              <div className="action-cluster">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onPitchClick(priority.company, priority.companyId || null)}
                >
                  Pitch IA
                </button>
                
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onActionClick(priority.company)}
                >
                  Action
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
