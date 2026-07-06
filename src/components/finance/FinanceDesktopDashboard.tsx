"use client"

import { useState } from "react"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { InsightCard } from "@/components/ui/InsightCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { PageQuickActions } from "@/components/ui/PageQuickActions"
import { AppDialog } from "@/components/ui/AppDialog"
import { FinancialModelingDesktopDialog } from "@/features/financial-modeling"
import type { PageQuickAction } from "@/components/ui/page-quick-actions"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { formatEuroCompact } from "@/lib/formatters"
import { PnlBarChart } from "./PnlBarChart"

// Nouveaux composants de la refonte
import { FinanceTabs, type FinanceTabId } from "./FinanceTabs"
import { FinanceExecutiveHero } from "./FinanceExecutiveHero"
import { FinanceWaterfallChart } from "./FinanceWaterfallChart"
import { PipelineForecastChart } from "./PipelineForecastChart"
import { FinanceScenarioCards } from "./FinanceScenarioCards"
import { PracticeContributionGrid } from "./PracticeContributionGrid"
import { MissionProfitabilityTable } from "./MissionProfitabilityTable"

import type {
  FinanceDashboardData,
  FinanceAlert,
} from "@/lib/finance/finance-data"

const IconAlert = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const IconSimulation = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14M7 16V9M12 16V5M17 16v-7" />
  </svg>
)

const IconSummary = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h7.5L19 9.25v10A1.75 1.75 0 0117.25 21h-10.5A1.75 1.75 0 015 19.25V6.5A1.75 1.75 0 016.75 4.75H7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.75v4.5h4.5M8 12h8M8 15.5h5" />
  </svg>
)

export function FinanceDesktopDashboard({ data }: { data: FinanceDashboardData }) {
  const {
    executive,
    monthlyPnl,
    practiceContribution,
    missionProfitability,
    pipelineForecast,
    alerts,
  } = data

  const [activeTab, setActiveTab] = useState<FinanceTabId>("synthesis")
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [activeAlert, setActiveAlert] = useState<FinanceAlert | null>(null)

  // Filtres P&L Combo Chart
  const [viewWindow, setViewWindow] = useState<string>("6")

  const quickActions: PageQuickAction[] = [
    {
      id: "report",
      label: "Rapport financier",
      variant: "secondary",
      icon: <IconSummary />,
      onClick: () => openReportGeneration({ origin: "global", reportType: "financial" }),
    },
    {
      id: "simulation",
      label: "Simulation",
      variant: "secondary",
      icon: <IconSimulation />,
      onClick: () => setIsSimulationOpen(true),
    },
  ]

  const handleAlertAction = (alert: FinanceAlert) => {
    setActiveAlert(alert)
  }

  const confirmAlertAction = () => {
    if (!activeAlert) return
    setActiveAlert(null)
    if (activeAlert.type === "margin" || activeAlert.type === "practice") {
      setIsSimulationOpen(true)
    }
  }

  // Sidebar Rail : Liste des alertes calculées
  const railContent = (
    <div className="flex flex-col gap-4">
      <InsightCard
        eyebrow="Cockpit — Analyse des Risques"
        title={
          alerts.length > 0
            ? `${alerts.length} point${alerts.length > 1 ? "s" : ""} d'arbitrage`
            : "Aucune alerte"
        }
        summary={
          alerts.length > 0
            ? "Indicateurs financiers sous vigilance (marge, staffing ou activité)."
            : "Tous les indicateurs opérationnels sont dans les cibles."
        }
        recommendation={
          alerts.length > 0
            ? "Veuillez examiner les alertes ci-dessous et simuler des arbitrages."
            : undefined
        }
        sourceLabel="kredo · cockpit audit"
      />

      {alerts.map((alert) => (
        <AlertBlock
          key={alert.id}
          variant={alert.level === "critical" ? "danger" : "warning"}
          title={alert.title}
          description={alert.message}
          icon={<IconAlert />}
          action={
            <Button variant="ghost" size="sm" onClick={() => handleAlertAction(alert)}>
              {alert.actionLabel}
            </Button>
          }
        />
      ))}
    </div>
  )

  return (
    <>
      <DesktopAnalyticalPage
        title="Cockpit Financier & Rentabilité"
        maxWidth="wide"
        actions={<PageQuickActions actions={quickActions} />}
        rail={railContent}
      >
        {/* En-tête : Onglets de navigation */}
        <FinanceTabs activeTab={activeTab} onChange={setActiveTab} />

        {/* CONTENU ONGLETS */}

        {/* 1. Onglet Synthèse */}
        {activeTab === "synthesis" && (
          <div className="flex flex-col gap-6">
            {/* Executive Hero */}
            <FinanceExecutiveHero executive={executive} />

            {/* P&L Bar Chart (Combo Chart existant) */}
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-heading">
                    Évolution P&L mensuel
                  </h2>
                  <div className="mt-2 flex items-center gap-5">
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="inline-block size-2.5 rounded-sm bg-dataviz-1 opacity-80" />
                      CA
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="inline-block size-2.5 rounded-sm bg-dataviz-4 opacity-80" />
                      Marge brute
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="inline-block size-2.5 rounded-full bg-dataviz-2" />
                      Résultat op. (ligne)
                    </span>
                  </div>
                </div>

                {/* Filtre de fenêtre temporelle */}
                <div className="flex border border-border rounded-lg overflow-hidden text-xs">
                  <button
                    onClick={() => setViewWindow("6")}
                    className={`px-3 py-1 cursor-pointer transition-colors ${viewWindow === "6" ? "bg-primary text-primary-fg font-semibold" : "bg-surface hover:bg-surface-hover text-muted"}`}
                  >
                    6 mois
                  </button>
                  <button
                    onClick={() => setViewWindow("12")}
                    className={`px-3 py-1 cursor-pointer transition-colors ${viewWindow === "12" ? "bg-primary text-primary-fg font-semibold" : "bg-surface hover:bg-surface-hover text-muted"}`}
                  >
                    12 mois
                  </button>
                </div>
              </div>
              <div className="p-5">
                <PnlBarChart rows={monthlyPnl} window={Number(viewWindow)} />
              </div>
            </SurfaceCard>

            {/* Waterfall P&L Chart */}
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-heading">
                  Cascade de rentabilité YTD (Waterfall)
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Du chiffre d'affaires consolidé au résultat opérationnel final
                </p>
              </div>
              <div className="p-5">
                <FinanceWaterfallChart
                  revenue={executive.revenueYtd}
                  salaries={monthlyPnl
                    .filter((r) => new Date(r.period_month).getFullYear() === data.period.year)
                    .reduce((sum, r) => sum + r.direct_costs_salaries, 0)}
                  subcontracting={monthlyPnl
                    .filter((r) => new Date(r.period_month).getFullYear() === data.period.year)
                    .reduce((sum, r) => sum + r.direct_costs_subcontractors, 0)}
                  structural={monthlyPnl
                    .filter((r) => new Date(r.period_month).getFullYear() === data.period.year)
                    .reduce((sum, r) => sum + (r.structural_costs_it + r.structural_costs_mgmt + r.structural_costs_rent), 0)}
                  operatingProfit={executive.operatingProfitYtd}
                />
              </div>
            </SurfaceCard>

            {/* Contribution par Practice */}
            <div className="flex flex-col gap-3">
              <div className="px-1">
                <h2 className="text-sm font-bold text-heading">Contribution par Practice</h2>
                <p className="text-xs text-muted">Répartition du CA et rentabilité brute par practice technique</p>
              </div>
              <PracticeContributionGrid metrics={practiceContribution} />
            </div>
          </div>
        )}

        {/* 2. Onglet Rentabilité missions */}
        {activeTab === "profitability" && (
          <div className="flex flex-col gap-6">
            {/* Table des missions */}
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-heading">
                  Suivi de rentabilité par mission (YTD)
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Chiffres réels cumulés basés sur les comptes d'activité (CRA) validés
                </p>
              </div>
              <MissionProfitabilityTable rows={missionProfitability} />
            </SurfaceCard>
          </div>
        )}

        {/* 3. Onglet Prévision & simulation */}
        {activeTab === "forecast" && (
          <div className="flex flex-col gap-6">
            {/* Prévisions / Atterrissage */}
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-heading">
                  Atterrissage de CA & Simulation de scénarios
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Atterrissage calculé par rapport à l'objectif annuel
                </p>
              </div>
              <div className="p-5 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="pb-4 md:pb-0 md:pr-4">
                    <span className="text-xs text-muted block font-medium uppercase">RÉALISÉ YTD</span>
                    <span className="text-2xl font-bold text-heading mt-1 block">{formatEuroCompact(executive.revenueYtd)}</span>
                  </div>
                  <div className="py-4 md:py-0 md:px-4">
                    <span className="text-xs text-muted block font-medium uppercase">PIPE CRM PONDÉRÉ</span>
                    <span className="text-2xl font-bold text-brand-brass mt-1 block">+{formatEuroCompact(executive.weightedPipe)}</span>
                  </div>
                  <div className="pt-4 md:pt-0 md:pl-4">
                    <span className="text-xs text-muted block font-medium uppercase">ATTERRISSAGE PROJETÉ</span>
                    <span className="text-2xl font-bold text-primary mt-1 block">{formatEuroCompact(executive.projectedLanding)}</span>
                  </div>
                </div>
              </div>
            </SurfaceCard>

            {/* Funnel entonnoir de CRM */}
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-heading">
                  Volume du pipe financier par étape
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Répartition des gains estimés vs pondérés dans le cycle de vente
                </p>
              </div>
              <div className="p-5">
                <PipelineForecastChart stages={pipelineForecast} />
              </div>
            </SurfaceCard>

            {/* Cartes de scénarios et bouton de simulation */}
            <FinanceScenarioCards
              revenueYtd={executive.revenueYtd}
              weightedPipe={executive.weightedPipe}
              onSimulate={() => setIsSimulationOpen(true)}
            />
          </div>
        )}
      </DesktopAnalyticalPage>

      {/* Confirmation de l'action sur une alerte */}
      <AppDialog
        open={Boolean(activeAlert)}
        onOpenChange={(open) => {
          if (!open) setActiveAlert(null)
        }}
        title={activeAlert?.title ?? ""}
        footer={
          activeAlert ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveAlert(null)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmAlertAction}
              >
                {(activeAlert.type === "margin" || activeAlert.type === "practice") ? "Lancer la simulation" : "Confirmer"}
              </Button>
            </>
          ) : null
        }
      >
        <div className="space-y-3">
          <p className="leading-relaxed text-sm text-body">{activeAlert?.message}</p>
          {(activeAlert?.type === "margin" || activeAlert?.type === "practice") && (
            <p className="text-xs text-muted italic">
              Cette action va ouvrir l'outil de simulation financière interactive pour vous permettre d'ajuster le TJM, le CJM ou d'ajouter une opportunité.
            </p>
          )}
        </div>
      </AppDialog>

      {/* Boîte de dialogue de modélisation existante */}
      <FinancialModelingDesktopDialog
        open={isSimulationOpen}
        onOpenChange={setIsSimulationOpen}
      />
    </>
  )
}
