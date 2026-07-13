"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { loadCommercialActivitySnapshot } from "./commercial-activity-actions"
import { CommercialActivityAccounts } from "./CommercialActivityAccounts"
import { CommercialActivityDistribution } from "./CommercialActivityDistribution"
import { CommercialActivityNavigation } from "./CommercialActivityNavigation"
import { CommercialActivityOutcomes } from "./CommercialActivityOutcomes"
import { CommercialActivityOverview } from "./CommercialActivityOverview"
import { CommercialActivityRhythm } from "./CommercialActivityRhythm"
import type { CommercialActivityFilterNature, CommercialActivityFilters, CommercialActivitySection, CommercialActivitySnapshot } from "./commercial-activity-types"

type PeriodPreset = "7d" | "4w" | "12w" | "quarter" | "year" | "custom"
const DAY = 86_400_000

function toDateInput(date: Date) { return date.toISOString().slice(0, 10) }
function fromDateInput(value: string) { return new Date(`${value}T00:00:00.000Z`) }
function presetRange(preset: Exclude<PeriodPreset, "custom">) {
  const end = new Date()
  const days = preset === "7d" ? 7 : preset === "4w" ? 28 : preset === "12w" ? 84 : preset === "quarter" ? 91 : 365
  return { from: new Date(end.getTime() - days * DAY), to: end }
}
function asFilters(preset: PeriodPreset, nature: CommercialActivityFilterNature, custom: { from: string; to: string }): CommercialActivityFilters {
  const range = preset === "custom" ? { from: fromDateInput(custom.from), to: new Date(fromDateInput(custom.to).getTime() + DAY) } : presetRange(preset)
  return { from: range.from.toISOString(), to: range.to.toISOString(), nature }
}

function rightPanel(section: CommercialActivitySection, snapshot: CommercialActivitySnapshot) {
  switch (section) {
    case "rhythm": return <CommercialActivityRhythm snapshot={snapshot} />
    case "distribution": return <CommercialActivityDistribution snapshot={snapshot} />
    case "outcomes": return <CommercialActivityOutcomes snapshot={snapshot} />
    case "accounts": return <CommercialActivityAccounts snapshot={snapshot} />
    default: return <CommercialActivityOverview snapshot={snapshot} />
  }
}

export function CommercialActivityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<CommercialActivitySection>("overview")
  const [preset, setPreset] = useState<PeriodPreset>("12w")
  const [nature, setNature] = useState<CommercialActivityFilterNature>("commercial")
  const initialRange = useMemo(() => presetRange("12w"), [])
  const [custom, setCustom] = useState({ from: toDateInput(initialRange.from), to: toDateInput(initialRange.to) })
  const [snapshot, setSnapshot] = useState<CommercialActivitySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const filters = useMemo(() => asFilters(preset, nature, custom), [custom, nature, preset])

  useEffect(() => {
    if (!open) return
    let live = true
    startTransition(async () => {
      try {
        setError(null)
        const next = await loadCommercialActivitySnapshot(filters)
        if (live) setSnapshot(next)
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Chargement des données impossible")
      }
    })
    return () => { live = false }
  }, [filters, open])

  const controls = <div className="border-b border-white/5 px-5 py-3"><div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">Période<select value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none"><option value="7d">7 jours</option><option value="4w">4 semaines</option><option value="12w">12 semaines</option><option value="quarter">Trimestre</option><option value="year">Année</option><option value="custom">Personnalisée</option></select></label><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">Nature<select value={nature} onChange={(event) => setNature(event.target.value as CommercialActivityFilterNature)} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none"><option value="commercial">Commercial</option><option value="prospection">Prospection</option><option value="client_active">Client actif</option><option value="recruitment">Recrutement</option><option value="management">Management</option><option value="internal">Interne</option></select></label>{preset === "custom" ? <><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">Du<input type="date" value={custom.from} onChange={(event) => setCustom((value) => ({ ...value, from: event.target.value }))} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none" /></label><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45">Au<input type="date" value={custom.to} min={custom.from} onChange={(event) => setCustom((value) => ({ ...value, to: event.target.value }))} className="h-8 rounded-lg border border-white/10 bg-white/[.04] px-2 text-[11px] font-medium normal-case tracking-normal text-white outline-none" /></label></> : null}<span className="pb-1 text-[10px] text-white/40">{pending ? "Mise à jour…" : ""}</span></div></div>
  const content = !snapshot && pending ? <div className="flex min-h-80 flex-col items-center justify-center gap-3"><i className="size-7 animate-spin rounded-full border-2 border-brand-brass border-t-transparent" /><p className="text-xs text-white/50">Chargement de l’activité…</p></div> : error ? <div className="m-5 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger">{error}</div> : snapshot ? <>{controls}<div className="min-h-0 flex-1 overflow-y-auto">{rightPanel(section, snapshot)}<p className="px-6 pb-5 text-[10px] text-white/35">Données issues de l’Agenda, des interactions et du suivi commercial.</p></div></> : <div className="p-5 text-xs text-white/45">Aucune donnée à afficher.</div>

  return <IntelligenceSplitModalShell open={open} onClose={onClose} title="Activité commerciale" subtitle="Analyse des activités, résultats et comptes mobilisés" leftPaneWidth="38%" leftPane={<CommercialActivityNavigation section={section} onChange={setSection} />} rightPane={content} />
}
