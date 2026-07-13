"use client"

import { useMemo, useState } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  VEILLE_CADENCE_LABELS,
  VEILLE_RUNS_PER_MONTH,
  type VeilleCadence,
  type VeilleSimulatorBaseline,
} from "@/lib/automations/veille-cadence"
import { formatCostEstimate } from "./automations-status"

function dominantCadence(baseline: VeilleSimulatorBaseline): VeilleCadence {
  const sorted = [...baseline.cadenceBreakdown].sort((a, b) => b.count - a.count)
  const top = sorted[0]?.cadence
  if (top === "twice_weekly" || top === "daily") return top
  return "weekly"
}

export function VeilleSimulatorCard({ baseline }: { baseline: VeilleSimulatorBaseline }) {
  const [accounts, setAccounts] = useState(baseline.watchedAccountsCount || 1)
  const [cadence, setCadence] = useState<VeilleCadence>(dominantCadence(baseline))

  const projectedMonthlyCost = useMemo(() => {
    if (baseline.avgCostPerRun === null) return null
    return accounts * VEILLE_RUNS_PER_MONTH[cadence] * baseline.avgCostPerRun
  }, [accounts, cadence, baseline.avgCostPerRun])

  const deltaVsCurrent =
    projectedMonthlyCost !== null && baseline.currentMonthlyCostEstimate !== null
      ? projectedMonthlyCost - baseline.currentMonthlyCostEstimate
      : null

  return (
    <SurfaceCard padding="default" className="border-border/80 bg-surface-raised">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <span className="inline-flex size-2 bg-brand-brass rounded-full animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Simulateur de cadence</h3>
      </div>
      
      <p className="mt-3 text-xs text-muted leading-relaxed">
        La veille de compte (<code className="font-mono text-[10px] bg-canvas px-1 py-0.5 rounded text-heading">account_watch_refresh</code>) est le poste de coût
        dominant. Ajustez la cadence et le volume pour simuler l'impact budgétaire.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Comptes suivis</span>
          <input
            type="number"
            min={0}
            max={500}
            value={accounts}
            onChange={(e) => setAccounts(Math.max(0, Number(e.target.value) || 0))}
            className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 px-3 py-1.5 text-sm font-mono text-heading focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Cadence</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as VeilleCadence)}
            className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 px-3 py-1.5 text-sm text-body focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none cursor-pointer"
          >
            {(Object.keys(VEILLE_CADENCE_LABELS) as VeilleCadence[]).map((c) => (
              <option key={c} value={c}>
                {VEILLE_CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-[var(--radius-medium)] bg-canvas/50 border border-border/40 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Coût mensuel projeté</p>
            <p className="font-mono text-3xl font-extrabold text-heading tracking-tight mt-0.5">
              {projectedMonthlyCost !== null ? formatCostEstimate(projectedMonthlyCost) : "—"}
            </p>
          </div>
          {deltaVsCurrent !== null ? (
            <div className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              deltaVsCurrent > 0 
                ? "bg-danger/[0.04] text-danger border-danger/10" 
                : deltaVsCurrent < 0 
                  ? "bg-success/[0.04] text-success border-success/10" 
                  : "bg-surface text-muted border-border"
            }`}>
              {deltaVsCurrent > 0 ? "+" : ""}
              {formatCostEstimate(deltaVsCurrent)} / mois
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-border/40 pt-3 flex flex-col gap-2 text-[10px] text-muted">
        <div className="flex justify-between items-center">
          <span>Comptes surveillés :</span>
          <strong className="text-heading font-mono">{baseline.watchedAccountsCount}</strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Budget actuel :</span>
          <strong className="text-heading font-mono">{baseline.currentMonthlyCostEstimate !== null ? formatCostEstimate(baseline.currentMonthlyCostEstimate) : "—"} / mois</strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Moyenne par run :</span>
          <strong className="text-heading font-mono">{baseline.avgCostPerRun !== null ? formatCostEstimate(baseline.avgCostPerRun) : "—"}</strong>
        </div>
      </div>
    </SurfaceCard>
  )
}
