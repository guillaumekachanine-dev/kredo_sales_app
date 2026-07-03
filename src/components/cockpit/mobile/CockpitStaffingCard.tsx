import React from "react"
import { StaffingNeedVm } from "./cockpit-mobile-view-model"
import { IconStage } from "./icons"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"

interface CockpitStaffingCardProps {
  items: StaffingNeedVm[]
  onPrimaryClick: (actionLabel: string, needId: string) => void
  onActionClick: (title: string, client: string) => void
  onBack?: () => void
}

function shouldOpenComposer(label: string) {
  const value = label.toLowerCase()
  return value.includes("envoyer") || value.includes("relancer") || value.includes("accélérer")
}

function composeForNeed(need: StaffingNeedVm) {
  const value = need.primaryAction.toLowerCase()
  const submission = value.includes("envoyer")
  const followUp = value.includes("relancer")

  openCommunicationComposer({
    origin: "staffing_primary_action",
    companyId: need.companyId,
    companyName: need.client,
    primaryEntity: { type: "opportunity", id: need.id },
    preset: {
      scenario: submission ? "profile_submission" : followUp ? "follow_up_no_reply" : "offer_introduction",
      objective: submission ? "submit_profile" : followUp ? "get_feedback" : "get_reply",
      mustInclude: `Besoin : ${need.title}. Étape : ${need.step}. Profils : ${need.positioned}. Échéance : ${need.due}.`,
      refs: { opportunityRef: need.id },
    },
  })
}

export function CockpitStaffingCard({
  items,
  onPrimaryClick,
  onActionClick,
  onBack,
}: CockpitStaffingCardProps) {
  return (
    <section className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-2 px-1">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 shrink-0">
          <IconStage />
        </span>
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-heading flex-1">
          Staffings &amp; besoins
        </h2>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 hover:bg-emerald-500/20 transition-all select-none focus:outline-none"
          >
            Revenir
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-muted bg-surface border border-border/50 rounded-xl">
          <strong className="text-xs font-bold text-heading">Aucun besoin de staffing ouvert</strong>
          <p className="text-[10px] mt-1">Tous les besoins sont actuellement clos ou résolus.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((need) => (
            <article
              key={need.id}
              className="bg-surface border border-border/50 rounded-xl p-3.5 flex flex-col gap-3 relative overflow-hidden"
            >
              <span className="absolute top-3 right-3 text-[10px] font-bold text-muted bg-canvas border border-border/40 px-2 py-0.5 rounded-md">
                {need.dueCompact}
              </span>

              <div className="flex items-start gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold shrink-0">
                  {need.rank}
                </span>
                <div className="min-w-0 pr-16">
                  <h3 className="text-xs font-bold text-heading truncate">{need.title}</h3>
                  <p className="text-[10px] text-body mt-0.5">{need.client}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-canvas/30 rounded-lg p-2 text-[10px]">
                <div>
                  <span className="text-muted block text-[8px] font-bold uppercase tracking-wider">Étape</span>
                  <span className="font-semibold text-heading">{need.step}</span>
                </div>
                <div>
                  <span className="text-muted block text-[8px] font-bold uppercase tracking-wider">Positionnés</span>
                  <span className="font-semibold text-heading">{need.positioned}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none"
                  onClick={() => {
                    if (shouldOpenComposer(need.primaryAction)) {
                      composeForNeed(need)
                    } else {
                      onPrimaryClick(need.primaryAction, need.id)
                    }
                  }}
                >
                  {need.primaryAction}
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-surface border border-border/80 hover:bg-surface-hover text-heading text-[10px] font-bold transition-all cursor-pointer text-center focus:outline-none"
                  onClick={() => onActionClick(need.title, need.client)}
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
