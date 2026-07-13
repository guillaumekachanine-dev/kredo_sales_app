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
    <SurfaceCard padding="default">
      <h3 className="text-sm font-semibold text-heading">Simulateur de cadence de veille</h3>
      <p className="mt-1 text-xs text-muted">
        La veille de compte (<code className="font-mono">account_watch_refresh</code>) est le poste de coût
        dominant — ce simulateur montre l&apos;impact d&apos;un changement de cadence ou de périmètre avant de
        l&apos;appliquer.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Comptes sous veille</span>
          <input
            type="number"
            min={0}
            max={500}
            value={accounts}
            onChange={(e) => setAccounts(Math.max(0, Number(e.target.value) || 0))}
            className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-sm text-body"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Cadence</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as VeilleCadence)}
            className="rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-sm text-body"
          >
            {(Object.keys(VEILLE_CADENCE_LABELS) as VeilleCadence[]).map((c) => (
              <option key={c} value={c}>
                {VEILLE_CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <p className="text-xs text-muted">Coût mensuel projeté</p>
          <p className="font-heading text-2xl font-bold text-heading">
            {projectedMonthlyCost !== null ? formatCostEstimate(projectedMonthlyCost) : "—"}
          </p>
        </div>
        {deltaVsCurrent !== null ? (
          <p className={`text-sm font-medium ${deltaVsCurrent > 0 ? "text-danger" : deltaVsCurrent < 0 ? "text-success" : "text-muted"}`}>
            {deltaVsCurrent > 0 ? "+" : ""}
            {formatCostEstimate(deltaVsCurrent)} vs. situation actuelle
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Situation actuelle : {baseline.watchedAccountsCount} compte(s) sous veille
        {baseline.currentMonthlyCostEstimate !== null
          ? ` — ~${formatCostEstimate(baseline.currentMonthlyCostEstimate)}/mois`
          : ""}
        . Coût moyen par run : {baseline.avgCostPerRun !== null ? formatCostEstimate(baseline.avgCostPerRun) : "non mesuré"}.
      </p>
    </SurfaceCard>
  )
}
