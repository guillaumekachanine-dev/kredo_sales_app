import React from "react"
import { MeetingVm } from "./cockpit-mobile-view-model"
import { IconCompany, IconContactCard } from "./icons"

interface CockpitMeetingCardProps {
  items: MeetingVm[]
  onPrepareClick: (client: string) => void
  onActionClick: (client: string, dateLabel: string, timeLabel: string) => void
  onCompanyClick: (companyId: string | null, label: string) => void
  onContactClick: (contactId: string | null, label: string) => void
}

export function CockpitMeetingCard({
  items,
  onPrepareClick,
  onActionClick,
  onCompanyClick,
  onContactClick,
}: CockpitMeetingCardProps) {
  return (
    <section className="module-panel">
      <div className="module-head">
        <h2>Rendez-vous clients</h2>
      </div>

      <div className="stack-list">
        {items.length === 0 ? (
          <div className="empty-state-card">
            <strong>Aucun rendez-vous planifié</strong>
            <p>Aucun rendez-vous client n'est enregistré pour cette semaine.</p>
          </div>
        ) : (
          items.map((meeting) => (
            <article key={meeting.id} className="stack-row compact-row meeting-row">
              <div className="stack-row-top">
                <div className="meeting-topline">
                  <div className="meeting-link-group">
                    <button
                      type="button"
                      className="inline-link text-heading font-bold"
                      aria-label={`Ouvrir la fiche entreprise ${meeting.companyDrawerLabel}`}
                      onClick={() => onCompanyClick(meeting.companyId, meeting.companyDrawerLabel)}
                    >
                      <span className="inline-link-illustration" aria-hidden="true">
                        <IconCompany />
                      </span>
                      <span>{meeting.client}</span>
                    </button>
                  </div>
                  
                  <div
                    className="meeting-schedule-block"
                    aria-label={`${meeting.dateLabel} ${meeting.timeLabel}`}
                  >
                    <span>{meeting.dateLabel}</span>
                    <strong>{meeting.timeLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="meeting-meta-row">
                <button
                  type="button"
                  className="inline-link inline-link-muted"
                  aria-label={`Ouvrir la fiche contact ${meeting.contactDrawerLabel}`}
                  onClick={() => onContactClick(meeting.contactId, meeting.contactDrawerLabel)}
                >
                  <span className="inline-link-illustration" aria-hidden="true">
                    <IconContactCard />
                  </span>
                  <span>{`${meeting.contact} - ${meeting.role}`}</span>
                </button>
              </div>

              <div className="meeting-body">
                <strong>Objet : {meeting.subject}</strong>
              </div>

              <div className="action-cluster meeting-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onPrepareClick(meeting.client)}
                >
                  Préparer
                </button>
                
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    onActionClick(meeting.client, meeting.dateLabel, meeting.timeLabel)
                  }
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
