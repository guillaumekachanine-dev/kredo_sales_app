"use client"

import dynamic from "next/dynamic"
import { useState, type ReactNode } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { IconButton } from "@/components/ui/IconButton"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { openCockpit } from "@/lib/intelligence/cockpit-navigation"
import { FinanceBriefHero } from "./mobile/FinanceBriefHero"
import { FinanceMonthlyPulse } from "./mobile/FinanceMonthlyPulse"

const AnnualRevenueSkyline = dynamic(() =>
  import("./mobile/AnnualRevenueSkyline").then((module) => module.AnnualRevenueSkyline),
  { loading: DetailLoading },
)
const RevenueContributionChart = dynamic(() =>
  import("./mobile/RevenueContributionChart").then((module) => module.RevenueContributionChart),
  { loading: DetailLoading },
)
const QuarterlyProductionGrid = dynamic(() =>
  import("./mobile/QuarterlyProductionGrid").then((module) => module.QuarterlyProductionGrid),
  { loading: DetailLoading },
)
const FinanceRiskSheet = dynamic(() =>
  import("./mobile/FinanceRiskSheet").then((module) => module.FinanceRiskSheet),
  { loading: DetailLoading },
)
const FinanceCockpitPanel = dynamic(() =>
  import("./mobile/FinanceCockpitPanel").then((module) => module.FinanceCockpitPanel),
  { loading: DetailLoading },
)
const FinancialModelingMobileFlow = dynamic(() =>
  import("@/features/financial-modeling/components/mobile/FinancialModelingMobileFlow").then(
    (module) => module.FinancialModelingMobileFlow,
  ),
  { loading: DetailLoading },
)

type FinanceDetail = "monthly" | "structure" | "production" | "risks"

const DETAIL_TITLES: Record<FinanceDetail, string> = {
  monthly: "CA mensuel",
  structure: "Structure du CA",
  production: "Production annuelle",
  risks: "Risques & écarts",
}

function DetailLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-[var(--radius-medium)] border border-dashed border-border text-xs text-muted" role="status">
      Chargement de l’analyse…
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.8 15.9 9 18.8l-.8-2.9a4.5 4.5 0 0 0-3.1-3.1L2.3 12l2.8-.8a4.5 4.5 0 0 0 3.1-3.1L9 5.3l.8 2.8a4.5 4.5 0 0 0 3.1 3.1l2.8.8-2.8.8a4.5 4.5 0 0 0-3.1 3.1ZM18.3 8.7 18 9.8l-.3-1.1a3.4 3.4 0 0 0-2.4-2.4L14.3 6l1-.3a3.4 3.4 0 0 0 2.4-2.4l.3-1 .3 1a3.4 3.4 0 0 0 2.4 2.4l1 .3-1 .3a3.4 3.4 0 0 0-2.4 2.4Z" />
    </svg>
  )
}

function StructureIcon() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h6" /><circle cx="18" cy="12" r="2" /><circle cx="14" cy="17" r="2" /></svg>
}

function ProductionIcon() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7" strokeLinecap="round" /></svg>
}

function RiskIcon() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2.8 19h18.4L12 3Zm0 5v5m0 3h.01" /></svg>
}

function CockpitBriefIcon() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
}

function FinanceEntry({
  title,
  description,
  metric,
  icon,
  onClick,
}: {
  title: string
  description: string
  metric: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[72px] w-full grid-cols-[44px_minmax(0,1fr)_auto_24px] items-center gap-3 border-b border-border px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-small)] border border-border bg-canvas text-primary" aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-heading">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-muted">{description}</span>
      </span>
      <span className="max-w-20 text-right font-mono text-[10px] font-bold text-heading">{metric}</span>
      <span className="inline-flex size-6 items-center justify-center text-primary" aria-hidden="true"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg></span>
    </button>
  )
}

export function FinanceMobileDashboard({ data }: { data: FinanceMobileDashboardData }) {
  const [activeDetail, setActiveDetail] = useState<FinanceDetail | null>(null)
  const [cockpitOpen, setCockpitOpen] = useState(false)
  const [modelingOpen, setModelingOpen] = useState(false)
  const riskCount = data.risksAndGaps.filter((risk) => risk.severity !== "info").length
  const topClient = data.distributions.clients.items.find((item) => item.id !== "non-attribue")

  return (
    <>
      <MobileActionPage
        header={
          <MobilePageHeader
            title={<span className="text-base font-black uppercase tracking-[0.16em]">Finance</span>}
            actions={
              <div className="flex items-center gap-2">
                <IconButton
                  aria-label="Ouvrir Cockpit Intelligence"
                  variant="secondary"
                  size="md"
                  onClick={openCockpit}
                  className="size-11 rounded-[var(--radius-small)] border-brand-brass/35 text-primary"
                >
                  <SparkleIcon />
                </IconButton>
                <IconButton
                  aria-label="Ouvrir le Brief Cockpit Finance"
                  variant="secondary"
                  size="md"
                  onClick={() => setCockpitOpen(true)}
                  className="size-11 rounded-[var(--radius-small)] border-brand-brass/35 text-primary"
                >
                  <CockpitBriefIcon />
                </IconButton>
              </div>
            }
          />
        }
        hero={<FinanceBriefHero data={data} />}
        contentClassName="gap-3"
      >
        <FinanceMonthlyPulse rows={data.revenueByMonth} onOpen={() => setActiveDetail("monthly")} />

        <nav aria-label="Analyses Finance" className="rounded-[var(--radius-large)] border border-border bg-surface px-3">
          <FinanceEntry
            title="Structure du CA"
            description="Clients, practices, engagement"
            metric={topClient ? `${topClient.sharePct.toFixed(0)}% top client` : "—"}
            icon={<StructureIcon />}
            onClick={() => setActiveDetail("structure")}
          />
          <FinanceEntry
            title="Production annuelle"
            description="Q1 · Q2 · Q3 · Q4P"
            metric={`${data.productionByClient.length} clients`}
            icon={<ProductionIcon />}
            onClick={() => setActiveDetail("production")}
          />
          <FinanceEntry
            title="Risques & écarts"
            description="Bridge forecast et repères"
            metric={riskCount > 0 ? `${riskCount} alertes` : "Sous contrôle"}
            icon={<RiskIcon />}
            onClick={() => setActiveDetail("risks")}
          />
        </nav>
      </MobileActionPage>

      <AppDrawer
        open={activeDetail !== null}
        onOpenChange={(open) => {
          if (!open) setActiveDetail(null)
        }}
        side="bottom"
        title={activeDetail ? DETAIL_TITLES[activeDetail] : "Analyse Finance"}
        eyebrow={`Finance · ${data.period.fiscalYear}`}
        showMobileCloseButton
        className="sm:hidden"
        contentClassName="bg-surface"
      >
        {activeDetail === "monthly" ? <AnnualRevenueSkyline data={data} /> : null}
        {activeDetail === "structure" ? <RevenueContributionChart data={data} /> : null}
        {activeDetail === "production" ? <QuarterlyProductionGrid data={data} /> : null}
        {activeDetail === "risks" ? <FinanceRiskSheet data={data} /> : null}
      </AppDrawer>

      <AppDrawer
        open={cockpitOpen}
        onOpenChange={setCockpitOpen}
        side="bottom"
        title={<span className="text-base font-bold leading-7 tracking-tight text-white">Cockpit Intelligence — Brief Finance</span>}
        eyebrow={`Finance · ${data.period.fiscalYear}`}
        showMobileCloseButton
        className="sm:hidden border-t border-white/15 bg-primary text-white"
        headerClassName="border-b border-white/15 text-white [--color-muted:rgba(255,255,255,0.72)] [&_button]:text-white/70 [&_button]:hover:text-white [&_[aria-hidden=true]]:bg-white/15 [&_[aria-hidden=true]]:text-white"
        contentClassName="bg-primary text-white [--drawer-header-fade-start:transparent] [--drawer-header-fade-end:transparent]"
      >
        {cockpitOpen ? (
          <FinanceCockpitPanel
            data={data}
            onOpenModeling={() => {
              setCockpitOpen(false)
              setModelingOpen(true)
            }}
          />
        ) : null}
      </AppDrawer>

      {modelingOpen ? <FinancialModelingMobileFlow open={modelingOpen} onOpenChange={setModelingOpen} /> : null}
    </>
  )
}
