import React from "react"
import { MeetingVm } from "./cockpit-mobile-view-model"
import { IconCompany, IconContactCard, IconContact } from "./icons"

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
    <section className="flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white shadow-sm shadow-amber-500/20 shrink-0">
          <IconContact />
        </span>
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-heading flex-1">
          Rendez-vous clients
        </h2>
      </div>

      {/* List / Cards */}
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted bg-surface border border-border/50 rounded-xl">
          <strong className="text-xs font-bold text-heading">Aucun rendez-vous planifié</strong>
          <p className="text-[10px] mt-1">Aucun rendez-vous client n&apos;est enregistré pour cette semaine.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((meeting) => (
            <article
              key={meeting.id}
              className="bg-surface border border-border/50 rounded-xl p-3.5 flex flex-col gap-2 relative overflow-hidden"
            >
              {/* Topline: Company + Date/Time */}
              <div className="flex items-center justify-between gap-3 min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-bold text-heading hover:text-amber-600 transition-colors text-left min-w-0"
                  onClick={() => onCompanyClick(meeting.companyId, meeting.companyDrawerLabel)}
                >
                  <span className="text-muted shrink-0">
                    <IconCompany />
                  </span>
                  <span className="truncate">{meeting.client}</span>
                </button>
                
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                  {meeting.dateCompact} - {meeting.timeLabel}
                </span>
              </div>

              {/* Contact Information (Moved Up) */}
              <div className="flex items-center">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[10px] text-body hover:text-amber-600 transition-colors text-left min-w-0"
                  onClick={() => onContactClick(meeting.contactId, meeting.contactDrawerLabel)}
                >
                  <span className="text-muted shrink-0">
                    <IconContactCard />
                  </span>
                  <span className="truncate">{`${meeting.contact} · ${meeting.role}`}</span>
                </button>
              </div>

              {/* Subject */}
              <div className="bg-canvas/30 rounded-lg p-2.5 text-[10px] leading-relaxed text-heading border border-border/20 mt-1">
                <span className="text-muted block text-[8px] font-bold uppercase tracking-wider mb-0.5">Objet</span>
                <span className="font-semibold">{meeting.subject}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none shadow-sm shadow-amber-500/10"
                  onClick={() => onPrepareClick(meeting.client)}
                >
                  Préparer
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-surface border border-border/80 hover:bg-surface-hover text-heading text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none"
                  onClick={() => onActionClick(meeting.client, meeting.dateLabel, meeting.timeLabel)}
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
