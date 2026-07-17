"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { EngagementsPortfolioViewModel, MarginBridge } from "./engagements-portfolio-types"

interface MarginBridgeChartProps { bridges: EngagementsPortfolioViewModel["portfolio"]["marginBridge"] }
type Mode = "global" | "assistanceTechnique" | "projects"

function bridgeSteps(mode: Mode, bridge: MarginBridge) {
  const steps = [{ label: "CA réalisé", value: bridge.revenue, start: 0, end: bridge.revenue, kind: "revenue" }]
  let cursor = bridge.revenue
  if (bridge.assistanceCosts > 0) { steps.push({ label: "Coûts AT", value: -bridge.assistanceCosts, start: cursor, end: cursor - bridge.assistanceCosts, kind: "cost" }); cursor -= bridge.assistanceCosts }
  if (bridge.projectCosts > 0) { steps.push({ label: "Coûts Projets", value: -bridge.projectCosts, start: cursor, end: cursor - bridge.projectCosts, kind: "cost" }); cursor -= bridge.projectCosts }
  steps.push({ label: mode === "projects" ? "Contribution observée" : "Marge observée", value: bridge.observedContribution, start: 0, end: bridge.observedContribution, kind: "result" })
  return steps
}

export function MarginBridgeChart({ bridges }: MarginBridgeChartProps) {
  const [mode, setMode] = useState<Mode>("global")
  const bridge = bridges[mode]
  const steps = bridgeSteps(mode, bridge)
  const min = Math.min(0, ...steps.flatMap((step) => [step.start, step.end]))
  const max = Math.max(1, ...steps.flatMap((step) => [step.start, step.end]))
  const y = (value: number) => 250 - ((value - min) / (max - min)) * 190
  return (
    <div className="flex h-full min-h-0 flex-col"><header className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3"><div><h3 className="font-heading text-base font-black text-heading">Pont de marge</h3><p className="text-[10px] text-muted">Du CA réalisé à la contribution observée</p></div><div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-1" role="group" aria-label="Périmètre du pont de marge">{(["global", "assistanceTechnique", "projects"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("min-h-10 rounded-[var(--radius-small)] px-3 text-[10px] font-bold", mode === value ? "bg-primary text-primary-fg" : "text-body")}>{value === "global" ? "Global" : value === "assistanceTechnique" ? "Assistance Technique" : "Projets"}</button>)}</div></header>
      <div className="hidden min-h-0 flex-1 md:block"><svg viewBox="0 0 680 290" className="h-full w-full" role="img" aria-label={`Pont ${mode}: CA ${formatEuroCompact(bridge.revenue)}, coûts AT ${formatEuroCompact(bridge.assistanceCosts)}, coûts projets ${formatEuroCompact(bridge.projectCosts)}, contribution observée ${formatEuroCompact(bridge.observedContribution)}`}><line x1="34" x2="650" y1={y(0)} y2={y(0)} stroke="var(--color-border-strong)" />{steps.map((step, index) => { const x = 48 + index * (570 / steps.length); const width = Math.min(100, 470 / steps.length); const top = Math.min(y(step.start), y(step.end)); const height = Math.max(2, Math.abs(y(step.start) - y(step.end))); const color = step.kind === "revenue" ? "var(--color-primary)" : step.kind === "cost" ? "var(--color-accent)" : step.value >= 0 ? "var(--color-success)" : "var(--color-danger)"; return <g key={step.label}><rect x={x} y={top} width={width} height={height} fill={color} opacity={step.kind === "result" ? 0.9 : 0.78} /><text x={x + width / 2} y={Math.max(12, top - 8)} textAnchor="middle" fill="var(--color-heading)" fontSize="10" fontWeight="800">{formatEuroCompact(step.value)}</text><text x={x + width / 2} y="276" textAnchor="middle" fill="var(--color-body)" fontSize="9" fontWeight="700">{step.label}</text>{index < steps.length - 1 && step.kind !== "result" && <line x1={x + width} x2={48 + (index + 1) * (570 / steps.length)} y1={y(step.end)} y2={y(step.end)} stroke="var(--color-border-strong)" strokeDasharray="3 3" />}</g>})}</svg></div>
      <ol className="flex min-h-0 flex-1 flex-col justify-center gap-3 md:hidden">{steps.map((step, index) => <li key={step.label} className="grid grid-cols-[28px_1fr_auto] items-center gap-3"><span className={cn("flex size-7 items-center justify-center rounded-full text-[10px] font-black", step.kind === "cost" ? "bg-accent/15 text-accent" : step.kind === "result" ? "bg-success/15 text-success" : "bg-primary/15 text-primary")}>{index + 1}</span><span className="text-xs font-bold text-heading">{step.label}</span><span className="font-mono text-sm font-black text-heading">{formatEuroCompact(step.value)}</span></li>)}</ol>
      {(mode === "projects" || mode === "global") && <p className="mt-3 shrink-0 border-l-2 border-[var(--color-dataviz-2)] pl-3 text-[9px] leading-relaxed text-body">Les coûts engagés peuvent précéder la facturation des jalons. La contribution observée n’est pas une marge finale contractuelle.</p>}
    </div>
  )
}
