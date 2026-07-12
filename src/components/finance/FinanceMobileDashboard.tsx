"use client"

import { useState } from "react"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { FinancialModelingMobileFlow } from "@/features/financial-modeling"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import {
  buildCommunicationEntryPreset,
  type CommunicationEntryIntent,
} from "@/lib/communication/communication-entry-intents"
import type { FinanceDashboardData, FinanceAlert } from "@/lib/finance/finance-data"

const IconAlert = () => (
  <svg className="size-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const IconSummary = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h7.5L19 9.25v10A1.75 1.75 0 0117.25 21h-10.5A1.75 1.75 0 015 19.25V6.5A1.75 1.75 0 016.75 4.75H7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.75v4.5h4.5M8 12h8M8 15.5h5" />
  </svg>
)

export function FinanceMobileDashboard({ data }: { data: FinanceDashboardData }) {
  const { executive, monthlyPnl, practiceContribution, pipelineForecast, alerts } = data

  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<"risks" | "pipe" | null>(null)

  const margePct = executive.grossMarginPctYtd
  const heroTone =
    executive.messageTone === "danger"
      ? "danger"
      : executive.messageTone === "warning"
        ? "warning"
        : "brand"

  // 4 derniers mois pour le mini graphique CA
  const trendRows = monthlyPnl.slice(-4)
  const trendMax = Math.max(...trendRows.map((r) => r.revenue_total), 1)

  // Top practices (max 2)
  const topPractices = practiceContribution.slice(0, 2)

  // Risques de marge
  const marginRisks = alerts.filter((a) => a.type === "margin" || a.type === "activity")
  const financeSummary = [
    `CA YTD : ${formatEuroCompact(executive.revenueYtd)}`,
    `Marge YTD : ${formatEuroCompact(executive.grossMarginYtd)}`,
    `Pipe pondéré : ${formatEuroCompact(executive.weightedPipe)}`,
    `Atterrissage projeté : ${formatEuroCompact(executive.projectedLanding)}`,
  ].join("\n")

  function openFinanceIntent(intent: CommunicationEntryIntent, alert?: FinanceAlert | null) {
    const isDirectionIntent = intent === "direction_summary" || intent === "finance_investment_arbitrage"
    const isManagerIntent = intent === "manager_status_update" || intent === "manager_arbitrage"
    const result = buildCommunicationEntryPreset(intent, {
      origin: "finance",
      missionId: alert?.metadata?.missionId ?? undefined,
      internalRole: isDirectionIntent ? "executive_management" : isManagerIntent ? "manager_n1" : "finance_admin",
      internalRelationship: isDirectionIntent ? "executive_committee" : isManagerIntent ? "hierarchical_up" : "cross_functional",
      internalDomain: "finance",
      mustInclude: [
        "[FINANCE_CONTEXT]",
        financeSummary,
        alert ? `Alerte : ${alert.title}\n${alert.message}` : null,
        alert?.metadata?.practice ? `Practice : ${alert.metadata.practice}` : null,
      ].filter(Boolean).join("\n"),
    })
    if (result.ok) {
      openCommunicationComposer(result.request)
      setActiveModal(null)
    }
  }

  return (
    <>
      <MobileActionPage
        header={
          <MobilePageHeader
            title="Finance"
          />
        }
        hero={
          <MobileHeroInsight
            eyebrow="Atterrissage projeté"
            title="Trajectoire financière"
            value={formatEuroCompact(executive.projectedLanding)}
            summary={executive.message}
            confidence={`Marge YTD : ${formatPct(margePct, 1)}`}
            sourceLabel="pnl_monthly"
            tone={heroTone}
          />
        }
      >
        {/* Actions principales tactiles (Targets >= 44px) */}
        <div className="shrink-0 space-y-2">
          {/* Action 1 : Simuler une mission */}
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setIsSimulationOpen(true)}
            className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14M7 16V9M12 16V5M17 16v-7" />
            </svg>
            <span>Simuler une mission</span>
          </Button>

          {/* Action 2 : Voir les risques de marge */}
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setActiveModal("risks")}
            className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer"
          >
            <svg className="size-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Voir les risques marge ({marginRisks.length})</span>
          </Button>

          {/* Action 3 : Analyser le pipe */}
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setActiveModal("pipe")}
            className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer"
          >
            <svg className="size-4 text-brand-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18.75" />
            </svg>
            <span>Analyser le pipe commercial</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => openFinanceIntent("manager_arbitrage")}
            className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer"
          >
            <svg className="size-4 text-brand-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h5M8 17h8M5 7h.01M5 12h.01M5 17h.01" />
            </svg>
            <span>Arbitrage N+1 IA</span>
          </Button>
        </div>

        {/* Tendance CA (Mini barres de tendance) */}
        <SurfaceCard padding="default" radius="xl" className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">CA mensuel — 4 dernières périodes</p>
          <div className="flex items-end gap-3 h-12" style={{ height: "48px" }}>
            {trendRows.map((r) => {
              const pct = Math.max(15, (r.revenue_total / trendMax) * 100)
              const formattedMonth = new Date(r.period_month).toLocaleDateString("fr-FR", { month: "short" })
              return (
                <div key={r.period_month} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t bg-primary opacity-85"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-medium text-muted uppercase">
                    {formattedMonth.slice(0, 3)}
                  </span>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        {/* Jauge Couverture / Pipe vs Target */}
        <SurfaceCard padding="default" radius="xl" className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Couverture Objectif Annuel</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-bold text-heading">
              {((executive.projectedLanding / 2_400_000) * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-muted">
              {formatEuroCompact(executive.projectedLanding)} / 2.4 M€
            </span>
          </div>
          <div className="h-2 w-full bg-border rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-success rounded-full"
              style={{ width: `${Math.min(100, (executive.projectedLanding / 2_400_000) * 100)}%` }}
            />
          </div>
        </SurfaceCard>

        {/* Top Practices */}
        <SurfaceCard padding="default" radius="xl" className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Top Practices par CA</p>
          <div className="space-y-3">
            {topPractices.map((practice) => (
              <div key={practice.practice} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <h4 className="text-xs font-bold text-heading">{practice.practice}</h4>
                  <span className="text-[10px] text-muted">Marge : {formatPct(practice.grossMarginPct)}</span>
                </div>
                <span className="text-xs font-semibold text-heading">{formatEuroCompact(practice.revenue)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Action secondaire : Rapport Financier */}
        <div className="mt-4">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => openFinanceIntent("direction_summary")}
            className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold cursor-pointer"
          >
            <IconSummary />
            <span>Synthèse direction IA</span>
          </Button>
        </div>
      </MobileActionPage>

      {/* Dialogues tactiles pour les actions de risques et d'analyse */}

      {/* 1. Modal Risques Marge */}
      <AppDialog
        open={activeModal === "risks"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null)
        }}
        title="Risques Marge & Staffing"
        footer={
          <Button variant="secondary" size="md" fullWidth onClick={() => setActiveModal(null)}>
            Fermer
          </Button>
        }
      >
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {marginRisks.length > 0 ? (
            marginRisks.map((alert) => (
              <div key={alert.id} className="p-3 bg-surface border border-border rounded-lg flex items-start gap-3">
                <div className="mt-0.5"><IconAlert /></div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-heading">{alert.title}</h4>
                  <p className="text-[11px] text-body mt-0.5 leading-relaxed">{alert.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFinanceIntent("finance_resource_arbitrage", alert)}
                    className="mt-2 min-h-10 px-0 text-primary hover:bg-transparent"
                  >
                    Préparer avec l’IA
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-muted py-6">Aucun risque de marge détecté.</p>
          )}
        </div>
      </AppDialog>

      {/* 2. Modal Analyse Pipe */}
      <AppDialog
        open={activeModal === "pipe"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null)
        }}
        title="Analyse du Pipe CRM"
        footer={
          <Button variant="secondary" size="md" fullWidth onClick={() => setActiveModal(null)}>
            Fermer
          </Button>
        }
      >
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {pipelineForecast.map((stage) => (
            <div key={stage.stage} className="p-3 bg-surface border border-border rounded-lg">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-heading">{stage.stageLabel}</span>
                <StatusPill label={`${stage.count} opp.`} variant="neutral" />
              </div>
              <div className="flex justify-between text-[11px] text-muted">
                <span>Brut : {formatEuroCompact(stage.estimatedTotal)}</span>
                <span className="font-semibold text-heading">Pondéré : {formatEuroCompact(stage.weightedTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </AppDialog>

      {/* Simulation flow existant */}
      <FinancialModelingMobileFlow
        open={isSimulationOpen}
        onOpenChange={setIsSimulationOpen}
      />
    </>
  )
}
