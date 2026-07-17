"use client"

import { useMemo, useState } from "react"
import { formatDate, formatEuroCompact, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { ClientExposureItem, EngagementPortfolioPoint } from "./engagements-portfolio-types"

interface ClientExposureTreemapProps {
  clients: ClientExposureItem[]
  firstClientPct: number
  top3ClientsPct: number
}

type Rect = { x: number; y: number; width: number; height: number; item: ClientExposureItem }

function sliceTreemap(items: ClientExposureItem[], x: number, y: number, width: number, height: number, vertical = false): Rect[] {
  if (items.length === 0) return []
  if (items.length === 1) return [{ x, y, width, height, item: items[0] }]
  const total = items.reduce((sum, item) => sum + Math.max(item.revenue, 1), 0)
  let split = 1
  let running = Math.max(items[0].revenue, 1)
  while (split < items.length - 1 && running < total / 2) {
    running += Math.max(items[split].revenue, 1)
    split += 1
  }
  const ratio = running / total
  if (vertical) {
    const firstHeight = height * ratio
    return [...sliceTreemap(items.slice(0, split), x, y, width, firstHeight, false), ...sliceTreemap(items.slice(split), x, y + firstHeight, width, height - firstHeight, false)]
  }
  const firstWidth = width * ratio
  return [...sliceTreemap(items.slice(0, split), x, y, firstWidth, height, true), ...sliceTreemap(items.slice(split), x + firstWidth, y, width - firstWidth, height, true)]
}

function engagementGroup(point: EngagementPortfolioPoint): string {
  if (point.overdue) return "À clôturer"
  if (point.endingWithin30Days) return "Échéance proche"
  if ((point.marginGapPct ?? 0) < 0) return "Marge sous cible"
  return "Engagements sécurisés"
}

export function ClientExposureTreemap({ clients, firstClientPct, top3ClientsPct }: ClientExposureTreemapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileMode, setMobileMode] = useState<"clients" | "engagements">("clients")
  const selected = clients.find((client) => client.companyId === selectedId) ?? null
  const maxRevenue = Math.max(...clients.map((client) => client.revenue), 1)
  const rects = useMemo(() => sliceTreemap(clients.filter((client) => client.revenue > 0), 0, 0, 100, 100), [clients])
  const engagementGroups = useMemo(() => {
    const groups = new Map<string, EngagementPortfolioPoint[]>()
    for (const point of clients.flatMap((client) => client.engagements)) {
      const group = engagementGroup(point)
      groups.set(group, [...(groups.get(group) ?? []), point])
    }
    return [...groups.entries()]
  }, [clients])

  if (clients.length === 0 || clients.every((client) => client.revenue <= 0)) return <div className="flex h-full items-center justify-center text-sm text-muted">Aucun CA réalisé à cartographier.</div>

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-black text-heading">Exposition client</h3>
          <p className="text-[10px] text-muted">Surface = CA réalisé · teinte = marge pondérée · bande = part AT / Projet</p>
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-primary border border-primary/20">
            Premier client : {firstClientPct.toFixed(1)}%
          </span>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-accent border border-accent/20">
            Top 3 : {top3ClientsPct.toFixed(1)}%
          </span>
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 grid-cols-[minmax(0,1fr)_240px] gap-3 md:grid">
        <div className="relative min-h-[390px] overflow-hidden rounded-[var(--radius-medium)] border border-border/30 bg-slate-950/40">
          {rects.map(({ x, y, width, height, item }) => {
            const projectShare = item.revenue > 0 ? (item.projectRevenue / item.revenue) * 100 : 0
            const margin = item.actualMarginPct ?? 0
            const background = margin >= 35 ? "var(--color-success)" : margin >= 20 ? "var(--color-primary)" : margin >= 0 ? "var(--color-accent)" : "var(--color-danger)"
            const showDetail = width > 18 && height > 17
            return (
              <button key={item.companyId} type="button" onClick={() => setSelectedId(item.companyId)} aria-pressed={selectedId === item.companyId} className="absolute overflow-hidden border border-slate-950/20 p-2 text-left text-white outline-none transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none cursor-pointer" style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, background }}>
                <span className="block truncate text-[11px] font-black">{item.companyName}</span>
                {showDetail && <><span className="mt-1 block font-mono text-[10px] font-bold">{formatEuroCompact(item.revenue)} · {item.sharePct.toFixed(1)}%</span><span className="block text-[9px]">Marge {formatPct(item.actualMarginPct)}</span></>}
                <span className="absolute inset-x-0 bottom-0 flex h-1.5 bg-white/35"><span className="bg-white" style={{ width: `${100 - projectShare}%` }} /><span className="bg-[var(--color-secondary)]" style={{ width: `${projectShare}%` }} /></span>
                {item.overdue && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-1 ring-white" title="Engagement dépassé" />}
                {!item.overdue && item.endingWithin60Days && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-1 ring-white" title="Échéance sous 60 jours" />}
              </button>
            )
          })}
        </div>
        <aside className="min-h-0 overflow-y-auto rounded-[var(--radius-medium)] border border-border/30 bg-slate-950/40 p-3" aria-live="polite">
          {selected ? <>
            <div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-wider text-muted">Client sélectionné</p><h4 className="mt-1 font-heading text-sm font-black text-heading">{selected.companyName}</h4></div><button type="button" onClick={() => setSelectedId(null)} className="min-h-9 px-2 text-[9px] font-bold text-primary cursor-pointer hover:underline">Réinitialiser</button></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><p><span className="block text-muted">CA</span><strong className="font-mono text-heading">{formatEuroCompact(selected.revenue)}</strong></p><p><span className="block text-muted">Marge</span><strong className="font-mono text-heading">{formatPct(selected.actualMarginPct)}</strong></p><p><span className="block text-muted">AT</span><strong>{formatEuroCompact(selected.assistanceRevenue)}</strong></p><p><span className="block text-muted">Projets</span><strong>{formatEuroCompact(selected.projectRevenue)}</strong></p></div>
            <ul className="mt-3 space-y-2">{selected.engagements.map((point) => <li key={`${point.type}-${point.id}`} className="border-l-2 border-primary pl-2 text-[9px]"><p className="font-bold text-heading">{point.title}</p><p className="text-muted">{point.type === "mission" ? "AT" : "Projet"} · {formatEuroCompact(point.revenueYtd)} · marge {formatPct(point.actualMarginPct)} · {point.endDate ? formatDate(point.endDate) : "sans échéance"}</p></li>)}</ul>
          </> : <div className="flex h-full items-center text-center text-xs text-muted">Sélectionnez un client pour détailler sa répartition AT / Projet et ses engagements.</div>}
        </aside>
      </div>

      <div className="min-h-0 flex-1 md:hidden">
        <div className="mb-3 grid grid-cols-2 rounded-[var(--radius-medium)] border border-border/30 bg-slate-950/40 p-1" role="group" aria-label="Vue mobile de l’exposition">
          {(["clients", "engagements"] as const).map((value) => <button key={value} type="button" aria-pressed={mobileMode === value} onClick={() => setMobileMode(value)} className={cn("min-h-11 rounded-[var(--radius-small)] text-xs font-bold cursor-pointer transition-colors", mobileMode === value ? "bg-primary text-primary-fg" : "text-body hover:text-heading")}>{value === "clients" ? "Clients" : "Engagements"}</button>)}
        </div>
        {mobileMode === "clients" ? <ol className="space-y-2">{clients.map((client) => <li key={client.companyId}><button type="button" onClick={() => setSelectedId(selectedId === client.companyId ? null : client.companyId)} className="min-h-14 w-full rounded-[var(--radius-small)] border border-border/30 bg-slate-950/20 p-2 text-left cursor-pointer hover:bg-slate-950/30"><span className="flex justify-between gap-3 text-[11px] font-bold text-heading"><span className="truncate">{client.companyName}</span><span>{formatEuroCompact(client.revenue)}</span></span><span className="mt-1 block h-2 rounded-full bg-slate-950/40"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (client.revenue / maxRevenue) * 100)}%` }} /></span>{selectedId === client.companyId && <span className="mt-2 block text-[9px] text-body">{client.engagements.map((item) => item.title).join(" · ")}</span>}</button></li>)}</ol> : <div className="space-y-4">{engagementGroups.map(([label, points]) => <section key={label}><h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-heading">{label}</h4><ul className="space-y-2">{points.map((point) => <li key={`${point.type}-${point.id}`} className="rounded-[var(--radius-small)] border border-border/30 bg-slate-950/20 p-3"><div className="flex justify-between gap-3"><div><p className="text-[11px] font-bold text-heading">{point.companyName}</p><p className="text-[10px] text-body">{point.title}</p></div><span className={cn("mt-1 size-3 shrink-0", point.type === "mission" ? "rounded-full bg-primary" : "rotate-45 rounded-sm bg-[var(--color-dataviz-2)]")} /></div><div className="mt-2 grid grid-cols-3 text-[9px]"><span><b className="block text-heading">{formatEuroCompact(point.revenueYtd)}</b>CA</span><span><b className="block text-heading">{formatPct(point.actualMarginPct)}</b>Marge</span><span><b className="block text-heading">{point.daysUntilEnd === null ? "—" : `${point.daysUntilEnd} j`}</b>Échéance</span></div></li>)}</ul></section>)}</div>}
      </div>
    </div>
  )
}
