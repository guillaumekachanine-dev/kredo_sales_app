import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { AnalyticalCoverageMapMobile } from "../coverage/AnalyticalCoverageMapMobile"
import {
  buildSegmentHomeKpis,
  formatStudyDate,
  parseCadre,
  parseMarketThesis,
  parseMessageSectoriel,
  parseTrajectoires,
  provenanceLabel,
} from "./home-model"
import { CorpusConfidenceBanner } from "../shared/CorpusConfidenceBanner"
import { DoncCallout } from "../shared/DoncCallout"
import { SourceChipList } from "../shared/SourceChip"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export function SegmentHomeDashboardMobile({
  workspace,
  onNavigate,
  onOpenPlaybook,
}: {
  workspace: LoadedWorkspace
  onNavigate: (chapter: BiChapter) => void
  onOpenPlaybook: () => void
}) {
  const kpis = buildSegmentHomeKpis(workspace)
  const rawPlaybook = workspace.knowledge.playbook
  const messageSectoriel = parseMessageSectoriel(rawPlaybook)
  const theses = parseMarketThesis(rawPlaybook)
  const cadre = parseCadre(rawPlaybook)
  const trajectoires = parseTrajectoires(rawPlaybook)

  const resolveSource = (srcId: number) => workspace.sourceResolution?.[srcId] ?? null

  return (
    <div className="space-y-4 py-4">
      {/* Bandeau de confiance du corpus */}
      {workspace.corpusMetadata ? (
        <div className="mx-4">
          <CorpusConfidenceBanner
            qualityVerdict={workspace.corpusMetadata.qualityVerdict}
            activationState={workspace.corpusMetadata.activationState}
            snapshotDate={workspace.corpusMetadata.snapshotDate}
            gaps={workspace.corpusMetadata.gaps}
          />
        </div>
      ) : null}

      {/* En-tête mobile */}
      <section className="mx-4 rounded-lg border-l-3 border-brand-brass bg-surface/40 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {workspace.segment.macro?.name ?? "Macro non renseignée"}
        </p>
        <h2 className="mt-1 font-heading text-xl font-bold text-heading">{workspace.segment.name}</h2>
        <p className="mt-1 text-xs text-body">
          {workspace.segment.status} · {workspace.portfolio.accounts.length} compte
          {workspace.portfolio.accounts.length > 1 ? "s" : ""}
        </p>
        <p className="mt-2 text-[10px] text-muted">
          {formatStudyDate(workspace.knowledge.studySnapshotDate)}
        </p>
      </section>

      {/* Workspace sans contenu */}
      {workspace.state === "empty" ? (
        <section className="mx-4 border border-border bg-surface/35 p-4 rounded-lg">
          <h2 className="text-sm font-bold text-heading">Workspace sans contenu</h2>
          <p className="mt-1 text-xs leading-relaxed text-body">
            Ce segment est valide, mais ne dispose encore d’aucune donnée analytique.
          </p>
        </section>
      ) : null}

      {/* Message Sectoriel & Synthèse Mobile */}
      <section className="mx-4 rounded-lg border border-border bg-surface/30 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted">Synthèse</h2>
          {provenanceLabel(workspace.knowledge.descriptionLevel) ? (
            <span className="text-[9px] font-semibold uppercase text-muted">
              {provenanceLabel(workspace.knowledge.descriptionLevel)}
            </span>
          ) : null}
        </div>

        {messageSectoriel ? (
          <div className="border-l-2 border-brand-brass bg-brand-brass/10 p-3 rounded-r">
            <p className="text-[9px] font-bold uppercase tracking-wider text-brand-brass">Message Sectoriel</p>
            <p className="mt-1 text-xs font-semibold italic text-heading leading-relaxed">
              « {messageSectoriel} »
            </p>
          </div>
        ) : null}

        {workspace.knowledge.description ? (
          <p className="text-xs leading-relaxed text-body whitespace-pre-line">
            {workspace.knowledge.description}
          </p>
        ) : (
          <p className="text-xs italic text-muted">Aucune synthèse disponible.</p>
        )}
      </section>

      {/* Indicateurs clés */}
      <section className="mx-4">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted">Indicateurs disponibles</h2>
        <dl className="mt-2 divide-y divide-border border-y border-border">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <dt className="text-xs text-muted">{kpi.label}</dt>
              <dd className="text-right text-sm font-bold text-heading">
                {kpi.value}
                {provenanceLabel(kpi.level) ? (
                  <span className="ml-1.5 text-[9px] font-semibold uppercase text-muted">
                    {provenanceLabel(kpi.level)}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Thèses de Marché Mobile */}
      {theses.length > 0 ? (
        <section className="mx-4 rounded-lg border border-border bg-surface/30 p-4 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border pb-2">
            Thèses & Enjeux Commercialement Qualifiés ({theses.length})
          </h2>
          <div className="space-y-3">
            {theses.map((thesis) => (
              <div key={thesis.id} className="rounded border border-border/60 bg-surface/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-heading px-1.5 py-0.5 text-[9px] font-bold text-white">
                    Thèse {thesis.id}
                  </span>
                  <SourceChipList srcIds={thesis.srcIds} resolve={resolveSource} />
                </div>
                <p className="text-xs font-semibold text-heading leading-relaxed">{thesis.these}</p>
                {thesis.doncCommercialement ? <DoncCallout text={thesis.doncCommercialement} /> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Cadre de l'Étude Mobile */}
      {cadre ? (
        <section className="mx-4 rounded-lg border border-border bg-surface/30 p-4 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border pb-2">
            Cadre & Périmètre de l&rsquo;Étude
          </h2>
          {cadre.perimetre ? (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted">Périmètre</p>
              <p className="mt-1 text-xs text-body leading-relaxed">{cadre.perimetre}</p>
            </div>
          ) : null}
          {cadre.horsChamp.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted">Hors champ</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {cadre.horsChamp.map((hc, idx) => (
                  <li key={idx}>• {hc}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {cadre.regleComparabilite ? (
            <div className="border-l-2 border-brand-brass bg-surface/50 p-2.5 rounded-r text-xs text-body">
              <p className="text-[9px] font-bold text-brand-brass uppercase">Comparabilité</p>
              <p className="mt-0.5">{cadre.regleComparabilite}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Trajectoires Mobile */}
      {trajectoires.length > 0 ? (
        <section className="mx-4 rounded-lg border border-border bg-surface/30 p-4 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border pb-2">
            Trajectoires & Budgets 18–36 Mois ({trajectoires.length})
          </h2>
          <div className="divide-y divide-border">
            {trajectoires.map((traj, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {traj.familleBudget ? (
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[9px] font-bold text-heading">
                      {traj.familleBudget}
                    </span>
                  ) : null}
                  {traj.offreKredo ? (
                    <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                      Offre : {traj.offreKredo}
                    </span>
                  ) : null}
                  <SourceChipList srcIds={traj.srcIds} resolve={resolveSource} />
                </div>
                <p className="text-xs text-body leading-relaxed">{traj.trajectoire}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <AnalyticalCoverageMapMobile
        coverage={workspace.coverage}
        onNavigate={onNavigate}
        onOpenPlaybook={onOpenPlaybook}
      />
    </div>
  )
}
