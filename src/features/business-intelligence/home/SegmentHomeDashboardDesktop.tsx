import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { AnalyticalCoverageMapDesktop } from "../coverage/AnalyticalCoverageMapDesktop"
import { buildSegmentHomeKpis, formatStudyDate, provenanceLabel } from "./home-model"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export function SegmentHomeDashboardDesktop({ workspace, onNavigate, onOpenPlaybook }: { workspace: LoadedWorkspace; onNavigate: (chapter: BiChapter) => void; onOpenPlaybook: () => void }) {
  const kpis = buildSegmentHomeKpis(workspace)
  return <div className="space-y-5">
    <section className="rounded-xl border border-edito-border bg-edito-surface p-5" aria-labelledby="segment-home-desktop-title">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">{workspace.segment.macro?.name ?? "Macro-secteur non renseigné"}</p><h2 id="segment-home-desktop-title" className="mt-1 font-heading text-2xl font-bold text-edito-navy">{workspace.segment.name}</h2><p className="mt-1 text-xs text-edito-body">{workspace.segment.status} · {workspace.portfolio.accounts.length} comptes</p></div>
        <p className="shrink-0 text-xs font-semibold text-edito-muted">{formatStudyDate(workspace.knowledge.studySnapshotDate)}</p>
      </div>
    </section>
    {workspace.state === "empty" ? <section className="border-l-2 border-edito-brass bg-edito-surface px-5 py-5"><h2 className="font-heading text-base font-bold text-edito-navy">Workspace sans contenu</h2><p className="mt-2 text-sm leading-relaxed text-edito-body">Ce segment est valide, mais aucune donnée analytique ni aucun compte ne sont disponibles pour le moment.</p></section> : null}
    <section className="grid grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] gap-5">
      <div className="rounded-xl border border-edito-border bg-edito-surface p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">Synthèse</h2>{workspace.knowledge.description ? <p className="mt-4 max-w-3xl border-l-2 border-edito-border pl-4 text-sm leading-relaxed text-edito-body">{workspace.knowledge.description}</p> : <p className="mt-4 text-sm text-edito-muted">Aucune synthèse disponible pour ce segment.</p>}{provenanceLabel(workspace.knowledge.descriptionLevel) ? <p className="mt-3 text-[10px] font-semibold text-edito-muted">Source : {provenanceLabel(workspace.knowledge.descriptionLevel)}</p> : null}</div>
      <div className="rounded-xl border border-edito-border bg-edito-surface p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">Indicateurs disponibles</h2><dl className="mt-3 divide-y divide-edito-border">{kpis.map((kpi) => <div key={kpi.label} className="flex items-baseline justify-between gap-3 py-2.5"><dt className="text-xs text-edito-muted">{kpi.label}</dt><dd className="text-right text-sm font-bold text-edito-navy">{kpi.value}{provenanceLabel(kpi.level) ? <span className="ml-2 text-[9px] font-semibold uppercase tracking-wide text-edito-muted">{provenanceLabel(kpi.level)}</span> : null}</dd></div>)}</dl></div>
    </section>
    <AnalyticalCoverageMapDesktop coverage={workspace.coverage} onNavigate={onNavigate} onOpenPlaybook={onOpenPlaybook} />
  </div>
}
