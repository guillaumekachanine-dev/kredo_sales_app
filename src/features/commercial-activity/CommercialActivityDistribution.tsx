"use client"

import { useState } from "react"
import { COMMERCIAL_ACTIVITY_NATURE_LABELS } from "./commercial-activity-category"
import type { CommercialActivityNature, CommercialActivitySnapshot } from "./commercial-activity-types"

const COLORS: Record<CommercialActivityNature, string> = { prospection: "var(--color-dataviz-1)", client_active: "var(--color-dataviz-2)", recruitment: "var(--color-dataviz-4)", management: "var(--color-dataviz-5)", internal: "var(--color-dataviz-6)" }
function format(value: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value) }

export function CommercialActivityDistribution({ snapshot }: { snapshot: CommercialActivitySnapshot }) {
  const [selected, setSelected] = useState<CommercialActivityNature | null>(null)
  const arcs = snapshot.distribution.map((item, index) => ({
    ...item,
    dash: item.sharePct,
    offset: snapshot.distribution.slice(0, index).reduce((total, previous) => total + previous.sharePct, 0),
  }))
  return <div className="space-y-6 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200"><div><h3 className="text-sm font-semibold text-white">Répartition de l’effort</h3><p className="mt-1 text-[11px] text-white/45">Cliquez une nature pour isoler sa contribution.</p></div><div className="grid items-center gap-6 sm:grid-cols-[210px_1fr]"><div className="relative mx-auto size-48"><svg className="size-full -rotate-90" viewBox="0 0 42 42" role="img" aria-label="Répartition des natures d’activité"><circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />{arcs.map((arc) => <circle key={arc.nature} cx="21" cy="21" r="15.915" fill="none" stroke={COLORS[arc.nature]} strokeWidth={selected && selected !== arc.nature ? "4" : "6"} strokeOpacity={selected && selected !== arc.nature ? .2 : 1} strokeDasharray={`${arc.dash} ${100 - arc.dash}`} strokeDashoffset={-arc.offset} className="cursor-pointer transition-all duration-200" onClick={() => setSelected(selected === arc.nature ? null : arc.nature)}><title>{`${COMMERCIAL_ACTIVITY_NATURE_LABELS[arc.nature]}: ${format(arc.sharePct)} %`}</title></circle>)}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="font-heading text-2xl tabular-nums text-white">{snapshot.summary.completedActivities}</strong><span className="text-[10px] text-white/45">réalisées</span></div></div><div className="space-y-2">{snapshot.distribution.map((item) => { const active = !selected || selected === item.nature; return <button key={item.nature} type="button" onClick={() => setSelected(selected === item.nature ? null : item.nature)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${active ? "bg-white/[0.04]" : "opacity-35"}`}><i className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[item.nature] }} /><span className="min-w-0 flex-1 text-[11px] text-white/75">{COMMERCIAL_ACTIVITY_NATURE_LABELS[item.nature]}</span><span className="text-[11px] tabular-nums text-white">{item.count}</span><span className="w-12 text-right text-[10px] tabular-nums text-white/45">{format(item.hours)} h</span><span className="w-11 text-right text-[10px] tabular-nums text-white/45">{format(item.sharePct)} %</span></button> })}</div></div></div>
}
