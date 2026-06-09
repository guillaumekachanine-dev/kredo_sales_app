import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { Opportunity, OpportunitySkill, Contact, OpportunityEvent } from "@/types/database"
import {
  formatEuro,
  formatDateTime,
  getStageLabel,
  getPriorityLabel,
} from "./opportunity-detail-utils"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
  } | null
  skills: OpportunitySkill[]
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  events: OpportunityEvent[]
}

interface OpportunityMobileViewProps {
  data: OpportunityDetailData
}

export function OpportunityMobileView({ data }: OpportunityMobileViewProps) {
  const { opportunity, account } = data

  return (
    <div className="w-full px-4 py-6 flex flex-col gap-5">
      {/* Title & metadata */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-wider text-success border border-success/20 px-1.5 py-0.5 rounded bg-success/10">
            Opportunité
          </span>
          {account && (
            <span className="text-xs font-semibold text-muted">{account.name}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-heading leading-snug">
          {opportunity.title}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span>{getStageLabel(opportunity.stage)}</span>
          <span>•</span>
          <span>{getPriorityLabel(opportunity.priority)}</span>
        </div>
      </div>

      {/* Synthèse */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
          Synthèse
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">ACV</span>
            <p className="text-sm font-bold text-heading tabular-nums mt-0.5">
              {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
            </p>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Confiance</span>
            <p className="text-sm font-bold text-heading mt-0.5">
              {opportunity.conviction}%
            </p>
          </div>
        </div>
        {opportunity.need_summary && (
          <div className="mt-1">
            <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Résumé du besoin</span>
            <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2 rounded border border-border/40">
              {opportunity.need_summary}
            </p>
          </div>
        )}
      </SurfaceCard>

      {/* Qualification */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
          Qualification
        </h2>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Practice</span>
            <span className="font-semibold text-heading">{opportunity.practice || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Type d&apos;opportunité</span>
            <span className="font-semibold text-heading capitalize">
              {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Séniorité</span>
            <span className="font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Priorité</span>
            <span className="font-semibold text-heading">{getPriorityLabel(opportunity.priority)}</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Économie */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
          Économie
        </h2>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">TJM Cible</span>
            <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Durée</span>
            <span className="font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Gain estimé</span>
            <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Gain pondéré</span>
            <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Prochaine Action */}
      {(opportunity.next_action_label || opportunity.next_action_at) && (
        <SurfaceCard className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
            Prochaine action
          </h2>
          <div className="text-xs">
            <p className="font-semibold text-heading">{opportunity.next_action_label || "—"}</p>
            {opportunity.next_action_at && (
              <p className="text-[10px] text-muted mt-1">
                Prévue le : {formatDateTime(opportunity.next_action_at)}
              </p>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* Contexte mission */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-1.5">
          Contexte mission
        </h2>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Localisation</span>
            <span className="font-semibold text-heading">{opportunity.location || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Télétravail</span>
            <span className="font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
