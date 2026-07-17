"use client"

import { useMemo, useState, type ReactNode } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { Button } from "@/components/ui/Button"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { buildSectorPlaybookModel, type BusinessIntelligenceSectorProfile } from "../models/build-sector-playbook-model"

function StudyDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group border-b border-white/10 last:border-b-0"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"><span>{title}</span><span className="text-white/45 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true">⌄</span></summary><div className="px-4 pb-4 text-xs leading-relaxed text-white/65">{children}</div></details>
}

function TextList({ values, empty }: { values: string[]; empty: string }) {
  return values.length ? <ul className="space-y-1.5">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="italic text-white/45">{empty}</p>
}

function SectorStudyContent({ profile }: { profile: BusinessIntelligenceSectorProfile }) {
  if (profile.status !== "active") {
    return <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center"><p className="font-semibold text-brand-brass">Étude sectorielle en préparation</p><p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/55">Les contenus détaillés seront disponibles à la finalisation de l’étude.</p></div>
  }

  const market = [
    profile.description,
    profile.marketSizeEurBn !== null ? `Taille de marché : ${profile.marketSizeEurBn} Md€` : null,
    profile.marketGrowthPct !== null ? `Croissance : ${profile.marketGrowthPct}%` : null,
    profile.digitalMaturity ? `Maturité digitale : ${profile.digitalMaturity}` : null,
  ].filter((value): value is string => Boolean(value))
  const caveats = [profile.caveats?.corpus, profile.caveats?.verbatims, profile.caveats?.frequences, profile.caveats?.marche, ...profile.sources].filter((value): value is string => Boolean(value))

  return <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/20">
    <StudyDisclosure title="Synthèse de marché"><TextList values={market} empty="Aucune synthèse renseignée." /></StudyDisclosure>
    <StudyDisclosure title="Personas cibles"><TextList values={profile.playbook.personas.map((persona) => `${persona.role} — ${persona.enjeu}`)} empty="Aucun persona renseigné." /></StudyDisclosure>
    <StudyDisclosure title="Points de douleur sectoriels"><TextList values={profile.painPoints.map((point) => point.title)} empty="Aucun point de douleur renseigné." /></StudyDisclosure>
    <StudyDisclosure title="Arguments ROI de valeur"><TextList values={profile.playbook.roiArguments} empty="Aucun argument ROI renseigné." /></StudyDisclosure>
    <StudyDisclosure title="Objections & réponses préparées"><TextList values={profile.playbook.objections.map((item) => `${item.objection} — ${item.reponse}`)} empty="Aucune objection renseignée." /></StudyDisclosure>
    <StudyDisclosure title="Échéances réglementaires"><TextList values={profile.deadlines.map((item) => `${item.title}${item.date ? ` · ${new Date(item.date).toLocaleDateString("fr-FR")}` : ""}`)} empty="Aucune échéance renseignée." /></StudyDisclosure>
    <StudyDisclosure title="Acteurs clés"><TextList values={[...profile.keyPlayers.paca, ...profile.keyPlayers.national].map((item) => `${item.name}${item.note ? ` — ${item.note}` : ""}`)} empty="Aucun acteur renseigné." /></StudyDisclosure>
    <StudyDisclosure title="Points d’entrée"><TextList values={profile.playbook.entryPoints} empty="Aucun point d’entrée renseigné." /></StudyDisclosure>
    <StudyDisclosure title="Limites et sources"><TextList values={caveats} empty="Aucune réserve ou source renseignée." /></StudyDisclosure>
  </div>
}

export function SectorStudiesModal({ open, onClose, snapshot, initialSectorId = "all", isMobile = false }: { open: boolean; onClose: () => void; snapshot: BusinessIntelligenceSnapshot; initialSectorId?: string | "all"; isMobile?: boolean }) {
  const [query, setQuery] = useState("")
  const studies = useMemo(() => snapshot.sectors.map((sector) => buildSectorPlaybookModel(snapshot, sector.id)).filter((sector): sector is BusinessIntelligenceSectorProfile => Boolean(sector)), [snapshot])
  const [selectedId, setSelectedId] = useState(() => initialSectorId !== "all" ? initialSectorId : studies.find((study) => study.status === "active")?.sectorId ?? studies[0]?.sectorId ?? "")
  const filtered = studies.filter((study) => study.name.toLowerCase().includes(query.toLowerCase()))
  const active = filtered.filter((study) => study.status === "active")
  const watch = filtered.filter((study) => study.status !== "active")
  const selected = studies.find((study) => study.sectorId === selectedId) ?? studies[0] ?? null

  const leftPane = <div className="flex h-full flex-col bg-[#0d0f28] text-white"><div className="border-b border-white/10 p-4"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un secteur…" className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass" /></div><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3"><StudyGroup title="Études opérationnelles" studies={active} selectedId={selected?.sectorId ?? null} onSelect={setSelectedId} /><StudyGroup title="Secteurs en veille" studies={watch} selectedId={selected?.sectorId ?? null} onSelect={setSelectedId} /></div></div>
  const rightPane = selected ? <div className="flex h-full min-h-0 flex-col bg-[#0a0b1e] text-white"><div className="border-b border-white/10 px-5 py-5"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${selected.status === "active" ? "text-emerald-400" : "text-white/45"}`}><span className={`size-1.5 rounded-full ${selected.status === "active" ? "bg-emerald-400" : "bg-white/35"}`} />{selected.status === "active" ? "Étude active" : "En veille"}</span><span className="text-[10px] text-white/40">Practice : {selected.topPracticeLabel}</span></div><h3 className="mt-2 font-heading text-xl font-bold text-white">{selected.name}</h3><p className="mt-1 text-xs text-white/45">Dernière mise à jour : {selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString("fr-FR") : "Non renseignée"}</p></div><div className="min-h-0 flex-1 overflow-y-auto p-5"><SectorStudyContent profile={selected} /></div><footer className="flex shrink-0 justify-end border-t border-white/10 bg-slate-950/40 p-4"><Button variant="secondary" onClick={onClose}>Fermer</Button></footer></div> : <div className="flex h-full items-center justify-center text-sm text-white/45">Aucune étude disponible.</div>

  return <IntelligenceSplitModalShell open={open} onClose={onClose} title="Études sectorielles" subtitle="Analyses sectorielles pour orienter les conversations commerciales." leftPane={leftPane} rightPane={rightPane} leftPaneWidth="32%" isMobile={isMobile} />
}

function StudyGroup({ title, studies, selectedId, onSelect }: { title: string; studies: BusinessIntelligenceSectorProfile[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <section><h3 className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{title}</h3><div className="mt-2 space-y-1">{studies.length ? studies.map((study) => { const selected = study.sectorId === selectedId; return <button key={study.sectorId} type="button" onClick={() => onSelect(study.sectorId)} aria-current={selected ? "true" : undefined} className={`w-full border-l-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass ${selected ? "border-brand-brass bg-brand-brass/10 text-white" : "border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white"}`}><span className="block text-xs font-semibold leading-snug">{study.name}</span><span className={`mt-1 block text-[10px] ${study.status === "active" ? "text-emerald-400" : "text-white/40"}`}>{study.status === "active" ? "Étude active" : "En veille"}</span></button> }) : <p className="px-2 py-3 text-xs italic text-white/35">Aucune étude.</p>}</div></section>
}
