"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type { FinanceMobileDashboardData } from "@/lib/finance/finance-mobile-model"
import { openReportGeneration } from "@/lib/reports/report-generation"
import {
  getPipelineInsights,
  type PipelineInsightsResult as PipelineInsightsResultData,
} from "@/lib/intelligence/actions/pipeline-insights"
import { PipelineInsightsResult } from "@/components/intelligence/action-results/PipelineInsightsResult"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { FinanceRiskSheet } from "./FinanceRiskSheet"

export interface FinanceCockpitPanelProps {
  data: FinanceMobileDashboardData
  onOpenModeling: () => void
}

type CockpitView = "menu" | "pipe" | "risks"

function ReportIcon() {
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7.5L19 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" /><path strokeLinecap="round" d="M14 3.5V8h5M9 12.5h6M9 16h6" /></svg>
}

function ModelingIcon() {
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="M4 19h16" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 19v-6l3.5-3 3 2.5L18 7v12" /></svg>
}

function PipeIcon() {
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h9a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3h1M4 6l3-3M4 6l3 3M20 18h-9a3 3 0 0 1-3-3v0" /></svg>
}

function GapIcon() {
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2.8 19h18.4L12 3Zm0 5v5m0 3h.01" /></svg>
}

function ComposeIcon() {
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
}

function ChevronIcon() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
}

function BackIcon() {
  return <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
}

function CockpitStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">{label}</p>
      <p className="mt-0.5 truncate font-heading text-base font-black text-white">{value}</p>
    </div>
  )
}

function CockpitActionRow({ title, icon, onClick }: { title: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[54px] w-full items-center gap-3 border-b border-white/12 px-1 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-white/15 bg-white/10 text-white" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold text-white">{title}</span>
      <span className="inline-flex size-6 shrink-0 items-center justify-center text-brand-brass" aria-hidden="true">
        <ChevronIcon />
      </span>
    </button>
  )
}

function CockpitBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"
    >
      <BackIcon />
      Retour
    </button>
  )
}

function PipelineAnalysisView({ onBack }: { onBack: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<PipelineInsightsResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    startTransition(() => {
      void getPipelineInsights()
        .then((loaded) => {
          if (!cancelled) setResult(loaded)
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Analyse du pipe indisponible.")
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <CockpitBackButton onClick={onBack} />

      {isPending && !result ? (
        <div className="rounded-[var(--radius-medium)] border border-white/15 bg-white/[0.06] p-4 text-xs text-white/70" role="status">
          Calcul en cours…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[var(--radius-medium)] border border-danger/40 bg-danger/20 p-4 text-xs text-white">
          {error}
        </div>
      ) : null}

      {result ? <PipelineInsightsResult result={result} /> : null}
    </div>
  )
}

function RisksAndGapsView({ data, onBack }: { data: FinanceMobileDashboardData; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <CockpitBackButton onClick={onBack} />
      <div className="cockpit-reading rounded-[var(--radius-large)] border p-3.5">
        <FinanceRiskSheet data={data} />
      </div>
    </div>
  )
}

export function FinanceCockpitPanel({ data, onOpenModeling }: FinanceCockpitPanelProps) {
  const [view, setView] = useState<CockpitView>("menu")
  const riskCount = data.risksAndGaps.filter((risk) => risk.severity !== "info").length

  if (view === "pipe") {
    return <PipelineAnalysisView onBack={() => setView("menu")} />
  }

  if (view === "risks") {
    return <RisksAndGapsView data={data} onBack={() => setView("menu")} />
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Résumé financier"
        className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-large)] border border-white/15 bg-white/[0.06] p-3.5"
      >
        <CockpitStat label="CA facturé YTD" value={formatEuroCompact(data.summary.actualRevenue)} />
        <CockpitStat label="Marge YTD" value={formatPct(data.summary.actualGrossMarginPct, 1)} />
        <CockpitStat label="Forecast atterrissage" value={formatEuroCompact(data.summary.projectedLanding)} />
        <CockpitStat label="Objectif annuel" value={formatEuroCompact(data.objectives.annualRevenue ?? 0)} />
      </section>

      <nav aria-label="Actions Cockpit Intelligence" className="rounded-[var(--radius-large)] border border-white/15 bg-white/[0.06] px-3">
        <CockpitActionRow
          title="Rapport financier"
          icon={<ReportIcon />}
          onClick={() => openReportGeneration({ origin: "global", reportType: "financial" })}
        />
        <CockpitActionRow title="Modélisation financière" icon={<ModelingIcon />} onClick={onOpenModeling} />
        <CockpitActionRow title="Analyse du pipe" icon={<PipeIcon />} onClick={() => setView("pipe")} />
        <CockpitActionRow title="Identification des risques / écarts" icon={<GapIcon />} onClick={() => setView("risks")} />
        <CockpitActionRow
          title="Synthèse financière CR"
          icon={<ComposeIcon />}
          onClick={() => {
            const preset = buildCommunicationEntryPreset("direction_summary", {
              origin: "finance",
              mustInclude: `Synthèse financière : CA facturé YTD ${formatEuroCompact(data.summary.actualRevenue)}, marge YTD ${formatPct(data.summary.actualGrossMarginPct, 1)}, forecast ${formatEuroCompact(data.summary.projectedLanding)} vs objectif annuel ${formatEuroCompact(data.objectives.annualRevenue ?? 0)}.`,
            })
            if (preset.ok) {
              openCommunicationComposer(preset.request)
            }
          }}
        />
      </nav>

      <p className="text-center text-[10px] text-white/55">
        {riskCount > 0
          ? `${riskCount} alerte${riskCount > 1 ? "s" : ""} active${riskCount > 1 ? "s" : ""}`
          : "Sous contrôle — aucun risque déterministe actif."}
      </p>
    </div>
  )
}
