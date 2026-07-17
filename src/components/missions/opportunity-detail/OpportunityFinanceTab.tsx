"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { FinancialReferenceDesktopCard } from "@/components/finance/FinancialReferenceDesktopCard"
import { FinancialReferenceMobileCard } from "@/components/finance/FinancialReferenceMobileCard"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  FinancialModelingDesktopDialog,
  FinancialModelingMobileFlow,
} from "@/features/financial-modeling"
import type { FinancialModelingLaunchPreset } from "@/features/financial-modeling"
import { formatEuro, formatPct } from "@/lib/formatters"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"

interface OpportunityFinanceTabProps {
  data: OpportunityDetailData
  isMobile: boolean
}

function FinanceMetric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border-b border-border/70 py-3 last:border-b-0">
      <dt className="text-xs font-medium text-body">{label}</dt>
      <dd className={`mt-1 font-mono text-base font-bold tabular-nums ${strong ? "text-primary" : "text-heading"}`}>{value}</dd>
    </div>
  )
}

export function OpportunityFinanceTab({ data, isMobile }: OpportunityFinanceTabProps) {
  const { opportunity, financialReference } = data
  const [simulationOpen, setSimulationOpen] = useState(false)
  const weightedGain = opportunity.weighted_gain ?? (
    opportunity.acv === null ? null : opportunity.acv * opportunity.conviction / 100
  )
  const simulationPreset = useMemo<FinancialModelingLaunchPreset>(() => ({
    mode: "full",
    title: `Simulation financière — ${opportunity.title}`,
    companyId: opportunity.company_id,
    opportunityId: opportunity.id,
    salesDailyRate: opportunity.target_daily_rate,
  }), [opportunity.company_id, opportunity.id, opportunity.target_daily_rate, opportunity.title])

  return (
    <section>
      {!isMobile ? (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">04 — Finance</p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Valeur projetée</h2>
        </>
      ) : (
        <h2 className="font-heading text-lg font-bold text-heading">Finance</h2>
      )}

      <div className={isMobile ? "" : "mt-5 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]"}>
        <div>
          <dl className={`grid border-y border-border ${isMobile ? "mt-5 grid-cols-2 gap-x-5" : "grid-cols-3 gap-x-8"}`}>
            <FinanceMetric label="TJM cible" value={formatEuro(opportunity.target_daily_rate)} />
            <FinanceMetric label="ACV" value={formatEuro(opportunity.acv)} strong />
            <FinanceMetric label="Gain estimé" value={formatEuro(opportunity.estimated_gain)} />
            <FinanceMetric label="Gain pondéré" value={formatEuro(weightedGain)} />
            <FinanceMetric label="Conviction" value={formatPct(opportunity.conviction, 0)} />
            <FinanceMetric label="Marge cible" value={formatPct(opportunity.target_margin_pct)} />
          </dl>

          <div className="mt-7">
            {financialReference ? (
              isMobile
                ? <FinancialReferenceMobileCard reference={financialReference} />
                : <FinancialReferenceDesktopCard reference={financialReference} />
            ) : (
              <div className="border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm font-semibold text-heading">Aucune référence financière active</p>
                <p className="mt-1 text-xs text-body">Le document associé sera affiché ici lorsqu’une référence sera liée.</p>
              </div>
            )}
          </div>
        </div>

        <SurfaceCard
          padding="default"
          radius="sm"
          className={isMobile ? "mt-6" : "min-h-[12.5rem]"}
        >
          <div className="flex h-full items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-[0.08em] text-primary">
                Simulation financière
              </h3>
              <Button
                size="md"
                className="mt-7"
                onClick={() => setSimulationOpen(true)}
              >
                Lancer une simulation
              </Button>
            </div>
            <Image
              src="/icons_set/cockpit_intelligence/simulation_financière_ai.png"
              alt=""
              width={76}
              height={76}
              className="mt-1 shrink-0 object-contain"
            />
          </div>
        </SurfaceCard>
      </div>

      {isMobile ? (
        <FinancialModelingMobileFlow
          open={simulationOpen}
          onOpenChange={setSimulationOpen}
          initialPreset={simulationPreset}
        />
      ) : (
        <FinancialModelingDesktopDialog
          open={simulationOpen}
          onOpenChange={setSimulationOpen}
          initialPreset={simulationPreset}
        />
      )}
    </section>
  )
}
