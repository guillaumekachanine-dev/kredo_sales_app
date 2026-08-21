import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { AnalyticalCoverageMapMobile } from "../coverage/AnalyticalCoverageMapMobile"
import { buildSegmentHomeKpis, formatStudyDate, provenanceLabel } from "./home-model"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export function SegmentHomeDashboardMobile({ workspace, onNavigate, onOpenPlaybook }: { workspace: LoadedWorkspace; onNavigate: (chapter: BiChapter) => void; onOpenPlaybook: () => void }) {
  return <div className="space-y-4 py-4">
    <section className="mx-4 border-l-2 border-brand-brass bg-surface/40 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{workspace.segment.macro?.name ?? "Macro non renseignée"}</p><h2 className="mt-1 font-heading text-xl font-bold text-heading">{workspace.segment.name}</h2><p className="mt-1 text-xs text-body">{workspace.segment.status} · {workspace.portfolio.accounts.length} comptes</p><p className="mt-2 text-[10px] text-muted">{formatStudyDate(workspace.knowledge.studySnapshotDate)}</p></section>
    {workspace.state === "empty" ? <section className="mx-4 border border-border bg-surface/35 p-4"><h2 className="text-sm font-bold text-heading">Workspace sans contenu</h2><p className="mt-1 text-xs leading-relaxed text-body">Ce segment est valide, mais ne dispose encore d’aucune donnée analytique.</p></section> : null}
    <section className="mx-4 border-y border-border py-4"><h2 className="text-[10px] font-bold uppercase tracking-wider text-muted">Synthèse</h2>{workspace.knowledge.description ? <p className="mt-2 text-xs leading-relaxed text-body">{workspace.knowledge.description}</p> : <p className="mt-2 text-xs text-muted">Aucune synthèse disponible.</p>}{provenanceLabel(workspace.knowledge.descriptionLevel) ? <p className="mt-2 text-[10px] text-muted">Source : {provenanceLabel(workspace.knowledge.descriptionLevel)}</p> : null}</section>
    <section className="mx-4"><h2 className="text-[10px] font-bold uppercase tracking-wider text-muted">Indicateurs disponibles</h2><dl className="mt-2 divide-y divide-border border-y border-border">{buildSegmentHomeKpis(workspace).map((kpi) => <div key={kpi.label} className="flex min-h-11 items-center justify-between gap-3 py-2"><dt className="text-xs text-muted">{kpi.label}</dt><dd className="text-right text-sm font-bold text-heading">{kpi.value}{provenanceLabel(kpi.level) ? <span className="ml-1.5 text-[9px] font-semibold uppercase text-muted">{provenanceLabel(kpi.level)}</span> : null}</dd></div>)}</dl></section>
    <AnalyticalCoverageMapMobile coverage={workspace.coverage} onNavigate={onNavigate} onOpenPlaybook={onOpenPlaybook} />
  </div>
}
