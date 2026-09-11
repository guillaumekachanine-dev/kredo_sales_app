"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { useState } from "react"
import { loadEngagementsOverview } from "@/app/(app)/missions/_actions/load-engagements-overview"
import { MobileOverviewKpiCard } from "@/components/layout/MobileOverviewKpiCard"
import { MobileOverviewKpiGrid } from "@/components/layout/MobileOverviewKpiGrid"
import { MobileOverviewShell } from "@/components/layout/MobileOverviewShell"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import type { EngagementsPortfolioViewModel } from "@/components/missions/dashboard/engagements-portfolio-types"
import { AppDialog } from "@/components/ui/AppDialog"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { RevenueContributionChart } from "./mobile/RevenueContributionChart"
import styles from "./FinanceMobileDashboard.module.css"

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
const AnnualRevenueSkyline = dynamic(
  () => import("./mobile/AnnualRevenueSkyline").then((module) => module.AnnualRevenueSkyline),
  { ssr: false, loading: DetailLoading },
)
const PortfolioAtlasDialog = dynamic(
  () => import("@/components/missions/dashboard/PortfolioAtlasDialog").then((module) => module.PortfolioAtlasDialog),
  { ssr: false, loading: DetailLoading },
)

export function buildFinanceMobileKpis(data: FinanceMobileDashboardData) {
  return {
    actualRevenue: data.summary.actualRevenue,
    actualGrossMarginPct: data.summary.actualGrossMarginPct,
  }
}

function DetailLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-[var(--radius-medium)] border border-dashed border-border text-xs text-muted" role="status">
      Chargement de l’analyse…
    </div>
  )
}

function CockpitBriefIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function FinanceMobileDashboard({ data }: { data: FinanceMobileDashboardData }) {
  const [cockpitOpen, setCockpitOpen] = useState(false)
  const [modelingOpen, setModelingOpen] = useState(false)
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false)
  const [atlasOpen, setAtlasOpen] = useState(false)
  const [atlasState, setAtlasState] = useState<
    | { status: "idle" | "loading" }
    | { status: "ready"; data: EngagementsPortfolioViewModel }
    | { status: "error"; message: string }
  >({ status: "idle" })
  const kpis = buildFinanceMobileKpis(data)

  function openMarginAtlas() {
    setAtlasOpen(true)
    if (atlasState.status === "ready" || atlasState.status === "loading") return

    setAtlasState({ status: "loading" })
    void loadEngagementsOverview()
      .then((overview) => setAtlasState({ status: "ready", data: overview }))
      .catch((reason: unknown) => {
        setAtlasState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Chargement du portefeuille impossible.",
        })
      })
  }

  return (
    <>
      <MobileOverviewShell
        tone="finance"
        heroLabel="Finance"
        surfaceLabel="Vue d’ensemble analytique Finance"
        className={styles.shell}
        artworkClassName={styles.artwork}
        icon={getNavigationIcon("finance", "size-11 text-heading", 1.8)}
        artwork={(
          <Image
            src="/illustrations/finance-mobile-line-art.png"
            alt=""
            width={1536}
            height={1024}
            sizes="316px"
            priority
          />
        )}
        heroContent={(
          <>
            <h1 className="sr-only">Finance</h1>
            <button
              type="button"
              className={styles.heroAction}
              onClick={() => setCockpitOpen(true)}
              aria-label="Ouvrir le Brief Cockpit Finance"
            >
              <CockpitBriefIcon />
            </button>
          </>
        )}
      >
        <MobileOverviewKpiGrid label="Indicateurs Finance">
          <MobileOverviewKpiCard
            label="CA facturé"
            value={formatEuroCompact(kpis.actualRevenue)}
            icon={getNavigationIcon("finance", "size-5", 1.8)}
            tone="primary"
            onClick={() => setRevenueDialogOpen(true)}
            ariaLabel="Voir le détail du chiffre d’affaires facturé"
          />
          <MobileOverviewKpiCard
            label="Marge moyenne"
            value={formatPct(kpis.actualGrossMarginPct, 1)}
            icon={getNavigationIcon("margin", "size-5", 1.8)}
            tone="brass"
            onClick={openMarginAtlas}
            ariaLabel="Voir l’Atlas du portefeuille sur la marge moyenne"
          />
        </MobileOverviewKpiGrid>

        <section className={styles.analysis} aria-label="Analyses Finance">
          <RevenueContributionChart data={data} />
        </section>
      </MobileOverviewShell>

      {revenueDialogOpen ? (
        <AppDialog
          open={revenueDialogOpen}
          onOpenChange={setRevenueDialogOpen}
          title="CA facturé"
          description="Réalisé mensuel, projection et cible de l’exercice."
        >
          <AnnualRevenueSkyline data={data} />
        </AppDialog>
      ) : null}

      {atlasOpen && atlasState.status !== "ready" ? (
        <AppDialog
          open={atlasOpen}
          onOpenChange={setAtlasOpen}
          title="Atlas du portefeuille"
          description={atlasState.status === "error" ? atlasState.message : "Chargement du portefeuille…"}
        >
          <p role={atlasState.status === "error" ? "alert" : "status"} className="text-xs text-body">
            {atlasState.status === "error" ? "Le portefeuille ne peut pas être affiché pour le moment." : "Préparation de la vue Marge…"}
          </p>
        </AppDialog>
      ) : null}

      {atlasOpen && atlasState.status === "ready" ? (
        <PortfolioAtlasDialog
          open={atlasOpen}
          onOpenChange={setAtlasOpen}
          overview={atlasState.data}
          initialView="margin"
        />
      ) : null}

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
