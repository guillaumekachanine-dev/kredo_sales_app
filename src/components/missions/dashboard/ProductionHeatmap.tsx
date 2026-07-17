"use client"

import { useState } from "react"
import { formatEuroCompact } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { ProductionHeatmapRow } from "./engagements-portfolio-types"

interface ProductionHeatmapProps {
  clients: ProductionHeatmapRow[]
  practices: ProductionHeatmapRow[]
}

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

export function ProductionHeatmap({ clients, practices }: ProductionHeatmapProps) {
  const [mode, setMode] = useState<"clients" | "practices">("clients")
  const rows = mode === "clients" ? clients : practices
  const max = Math.max(...rows.flatMap((row) => row.monthly.map((cell) => cell.revenue)), 1)
  const level = (value: number) => value <= 0 ? 0 : value / max < 0.25 ? 1 : value / max < 0.5 ? 2 : value / max < 0.75 ? 3 : 4

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex shrink-0 items-end justify-between gap-3"><div><h3 className="font-heading text-base font-black text-heading">Production annuelle</h3><p className="text-[10px] text-muted">CA réalisé mensuel · intensité cobalt en quatre niveaux</p></div><div className="inline-flex rounded-[var(--radius-medium)] border border-border bg-canvas p-1" role="group" aria-label="Regrouper la production">{(["clients", "practices"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("min-h-10 rounded-[var(--radius-small)] px-4 text-[10px] font-bold", mode === value ? "bg-primary text-primary-fg" : "text-body")}>{value === "clients" ? "Clients" : "Practices"}</button>)}</div></header>
      {rows.length === 0 ? <div className="flex flex-1 items-center justify-center text-sm text-muted">Aucune production réalisée cette année.</div> : <>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <div className="grid min-w-[760px] grid-cols-[140px_repeat(12,minmax(42px,1fr))] gap-1" role="grid" aria-label={`Production par ${mode === "clients" ? "client" : "practice"} et par mois`}>
            <span />{MONTHS.map((month) => <span key={month} className="pb-1 text-center text-[9px] font-bold text-muted">{month}</span>)}
            {rows.flatMap((row) => [<span key={`${row.id}-label`} className="truncate pr-2 text-[10px] font-semibold text-heading" title={row.label}>{row.label}</span>, ...row.monthly.map((cell, index) => {
              const intensity = level(cell.revenue)
              return <button key={`${row.id}-${cell.month}`} type="button" role="gridcell" aria-label={`${row.label}, ${MONTHS[index]}, ${formatEuroCompact(cell.revenue)}${cell.belowActivityTarget ? ", activité sous l’objectif" : ""}${cell.hasStartOrEnd ? ", démarrage ou fin d’engagement" : ""}${cell.hasOverdueItem ? ", échéance dépassée" : ""}`} className={cn("relative min-h-10 rounded-sm border outline-none focus-visible:ring-2 focus-visible:ring-heading", intensity === 0 && "border-border bg-canvas", intensity === 1 && "border-primary/20 bg-primary/15", intensity === 2 && "border-primary/30 bg-primary/35", intensity === 3 && "border-primary/50 bg-primary/60", intensity === 4 && "border-primary bg-primary", cell.hasOverdueItem && "!border-danger !border-2")} title={`${row.label} · ${MONTHS[index]} · ${formatEuroCompact(cell.revenue)}`}><span className={cn("text-[8px] font-bold", intensity >= 3 ? "text-white" : "text-heading")}>{cell.revenue > 0 ? formatEuroCompact(cell.revenue) : ""}</span>{cell.belowActivityTarget && <span className="absolute bottom-1 left-1 size-1.5 rounded-full bg-accent ring-1 ring-surface" />}{cell.hasStartOrEnd && <span className="absolute right-0 top-0 h-2 w-1 border-r-2 border-heading" />}</button>
            })])}
          </div>
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap gap-4 text-[9px] text-muted"><span><i className="mr-1 inline-block size-2 rounded-full bg-accent" />activité sous cible</span><span><i className="mr-1 inline-block h-2 w-1 border-r-2 border-heading" />début ou fin</span><span><i className="mr-1 inline-block size-2 border-2 border-danger" />retard actif</span></div>
        <table className="sr-only"><caption>Valeurs mensuelles de production</caption><thead><tr><th>Groupe</th>{MONTHS.map((month) => <th key={month}>{month}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th>{row.label}</th>{row.monthly.map((cell) => <td key={cell.month}>{formatEuroCompact(cell.revenue)}</td>)}</tr>)}</tbody></table>
      </>}
    </div>
  )
}
