import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { Opportunity, OpportunitySkill, Contact, OpportunityEvent } from "@/types/database"
import {
  formatEuro,
  formatDate,
  formatDateTime,
  getStageLabel,
  getPriorityLabel,
  getOutcomeLabel,
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

interface OpportunityDesktopViewProps {
  data: OpportunityDetailData
}

export function OpportunityDesktopView({ data }: OpportunityDesktopViewProps) {
  const { opportunity, account } = data

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success border border-success/20 px-2 py-0.5 rounded bg-success/10">
              Opportunité
            </span>
            {account && (
              <span className="text-xs text-muted">{account.name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {opportunity.title}
          </h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-muted tracking-wider font-semibold">ACV Estimé</span>
            <span className="text-lg font-bold text-heading tabular-nums">
              {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Colonne Principale */}
        <div className="col-span-8 flex flex-col gap-6">
          {/* Besoin Client */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Besoin client
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Résumé du besoin</span>
                <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2.5 rounded border border-border/40">
                  {opportunity.need_summary || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Détail du besoin</span>
                <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                  {opportunity.need_detail || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Contexte client</span>
                <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                  {opportunity.client_context || "—"}
                </p>
              </div>
            </div>
          </SurfaceCard>

          {/* Engagement Commercial */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Engagement commercial
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Source</span>
                <p className="text-xs text-body mt-1 font-medium">
                  {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Prochaine action</span>
                <p className="text-xs text-body mt-1 font-medium">
                  {opportunity.next_action_label || "—"}
                  {opportunity.next_action_at && (
                    <span className="text-muted block text-[10px] mt-0.5">
                      Prévue le : {formatDateTime(opportunity.next_action_at)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Notes d&apos;engagement</span>
              <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                {opportunity.engagement_notes || "—"}
              </p>
            </div>
          </SurfaceCard>

          {/* Résultat */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Résultat
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Statut</span>
                <p className="text-xs text-body mt-1 font-medium capitalize">
                  {opportunity.outcome ? getOutcomeLabel(opportunity.outcome) : "En cours"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                  Raison de {opportunity.outcome === "gagnee" ? "gain" : "perte / abandon"}
                </span>
                <p className="text-xs text-body mt-1 italic">
                  {opportunity.outcome === "gagnee"
                    ? (opportunity.win_reason || "Non renseignée")
                    : (opportunity.loss_reason || "Non renseignée")}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Colonne Latérale */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Qualification */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Qualification
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Practice</span>
                <span className="text-xs font-semibold text-heading">{opportunity.practice || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Type</span>
                <span className="text-xs font-semibold text-heading capitalize">
                  {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Séniorité</span>
                <span className="text-xs font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Étape</span>
                <span className="text-xs font-semibold text-heading">{getStageLabel(opportunity.stage)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Priorité</span>
                <span className="text-xs font-semibold text-heading">{getPriorityLabel(opportunity.priority)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Confiance</span>
                <span className="text-xs font-semibold text-heading">{opportunity.conviction}%</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Économie */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Économie
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">TJM Cible</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Durée</span>
                <span className="text-xs font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">ACV</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.acv)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Gain Estimé</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Gain Pondéré</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Planning */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Planning
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Date de Début</span>
                <span className="text-xs font-semibold text-heading">{formatDate(opportunity.start_date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Clôture Cible</span>
                <span className="text-xs font-semibold text-heading">{formatDate(opportunity.target_close_date)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Dernière MaJ</span>
                <span className="text-xs font-semibold text-heading">{formatDate(opportunity.updated_at)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Contexte mission */}
          <SurfaceCard className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-heading text-heading border-b border-border/40 pb-2">
              Contexte mission
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">Localisation</span>
                <span className="text-xs font-semibold text-heading">{opportunity.location || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Télétravail</span>
                <span className="text-xs font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
