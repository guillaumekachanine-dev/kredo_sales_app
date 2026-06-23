import React from "react"
import { StaffingNeedVm } from "./cockpit-mobile-view-model"

interface CockpitStaffingCardProps {
  items: StaffingNeedVm[]
  onPrimaryClick: (actionLabel: string, needId: string) => void
  onActionClick: (title: string, client: string) => void
}

export function CockpitStaffingCard({
  items,
  onPrimaryClick,
  onActionClick,
}: CockpitStaffingCardProps) {
  return (
    <section className="module-panel">
      <div className="module-head">
        <h2>Staffings & besoins</h2>
      </div>

      <div className="stack-list">
        {items.length === 0 ? (
          <div className="empty-state-card">
            <strong>Aucun besoin de staffing ouvert</strong>
            <p>Tous les besoins sont actuellement clos ou résolus.</p>
          </div>
        ) : (
          items.map((need) => (
            <article
              key={need.id}
              className="stack-row staffing-row"
              data-due={need.dueCompact}
            >
              <div className="stack-row-top">
                <div className="row-heading">
                  <span className="row-rank">{need.rank}</span>
                  <div className="row-heading-copy">
                    <h3>{need.title}</h3>
                    <p>{need.client}</p>
                  </div>
                </div>
              </div>

              <dl className="mini-facts mini-facts-staffing">
                <div>
                  <dt>Étape</dt>
                  <dd>{need.step}</dd>
                </div>
                <div>
                  <dt>Positionnés</dt>
                  <dd>{need.positioned}</dd>
                </div>
              </dl>

              <div className="action-cluster">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onPrimaryClick(need.primaryAction, need.id)}
                >
                  {need.primaryAction}
                </button>
                
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onActionClick(need.title, need.client)}
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
